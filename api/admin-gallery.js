import { createClient } from "@supabase/supabase-js";
import { createHmac, timingSafeEqual, randomUUID } from "node:crypto";

const COOKIE_NAME = "fino_admin_session";
const BUCKET_NAME = "fino-demons-gallery";
const CATEGORIES = new Set(["squadra", "partite", "eventi"]);
const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const MAX_PHOTOS_PER_UPLOAD = 12;
const MAX_DECODED_SIZE = 1_500_000;

function getSupabase() {
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!url || !key) {
        throw new Error("Variabili Supabase mancanti su Vercel");
    }

    return createClient(url, key, {
        auth: {
            persistSession: false,
            autoRefreshToken: false
        }
    });
}

function readCookie(req, name) {
    const raw = req.headers.cookie || "";

    for (const part of raw.split(";")) {
        const [key, ...rest] = part.trim().split("=");
        if (key === name) return decodeURIComponent(rest.join("="));
    }

    return "";
}

function safeEqual(a, b) {
    const aBuffer = Buffer.from(String(a));
    const bBuffer = Buffer.from(String(b));

    if (aBuffer.length !== bBuffer.length) return false;
    return timingSafeEqual(aBuffer, bBuffer);
}

function isAuthenticated(req) {
    const secret = process.env.ADMIN_PASSWORD;
    if (!secret) return false;

    const token = readCookie(req, COOKIE_NAME);
    const [expiresAt, signature] = token.split(".");

    if (!expiresAt || !signature) return false;

    const expires = Number(expiresAt);
    if (!Number.isFinite(expires) || expires < Date.now()) return false;

    const expected = createHmac("sha256", secret)
        .update(expiresAt)
        .digest("hex");

    return safeEqual(signature, expected);
}

function extensionForType(type) {
    if (type === "image/png") return "png";
    if (type === "image/webp") return "webp";
    return "jpg";
}

function sanitizeName(name) {
    return String(name || "foto")
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "")
        .slice(0, 48) || "foto";
}

function decodePhoto(photo) {
    const type = String(photo?.type || "");
    const dataUrl = String(photo?.dataUrl || "");

    if (!ALLOWED_TYPES.has(type)) {
        throw new Error("Formato non supportato. Usa JPG, PNG o WebP.");
    }

    const [, base64 = ""] = dataUrl.split(",");
    const buffer = Buffer.from(base64, "base64");

    if (!buffer.length || buffer.length > MAX_DECODED_SIZE) {
        throw new Error("Una foto è troppo pesante. Riprova con un'immagine più leggera.");
    }

    return { buffer, type };
}

async function ensureBucket(supabase) {
    const { data } = await supabase.storage.getBucket(BUCKET_NAME);

    if (data) {
        await supabase.storage.updateBucket(BUCKET_NAME, {
            public: true,
            fileSizeLimit: MAX_DECODED_SIZE,
            allowedMimeTypes: Array.from(ALLOWED_TYPES)
        });
        return;
    }

    const { error } = await supabase.storage.createBucket(BUCKET_NAME, {
        public: true,
        fileSizeLimit: MAX_DECODED_SIZE,
        allowedMimeTypes: Array.from(ALLOWED_TYPES)
    });

    if (error && !String(error.message || "").toLowerCase().includes("already exists")) {
        throw new Error(error.message);
    }
}

async function listPhotos(supabase, category) {
    const { data, error } = await supabase.storage
        .from(BUCKET_NAME)
        .list(category, {
            limit: 100,
            sortBy: { column: "created_at", order: "desc" }
        });

    if (error) {
        const message = String(error.message || "");
        if (message.toLowerCase().includes("bucket")) return [];
        throw new Error(error.message);
    }

    return (data || [])
        .filter(item => item.name && item.id !== null)
        .map(item => {
            const path = `${category}/${item.name}`;
            const { data: publicData } = supabase.storage.from(BUCKET_NAME).getPublicUrl(path);

            return {
                id: path,
                category,
                name: item.name,
                url: publicData.publicUrl,
                createdAt: item.created_at || item.updated_at || null
            };
        });
}

export default async function handler(req, res) {
    res.setHeader("Cache-Control", "no-store");

    if (!isAuthenticated(req)) {
        return res.status(401).json({ error: "Sessione admin non valida" });
    }

    try {
        const supabase = getSupabase();
        await ensureBucket(supabase);

        if (req.method === "GET") {
            const sections = {};

            for (const category of CATEGORIES) {
                sections[category] = await listPhotos(supabase, category);
            }

            return res.status(200).json({ sections });
        }

        if (req.method === "POST") {
            const category = String(req.body?.category || "").trim();
            const photos = Array.isArray(req.body?.photos) ? req.body.photos : [];

            if (!CATEGORIES.has(category)) {
                return res.status(400).json({ error: "Sezione gallery non valida" });
            }

            if (!photos.length || photos.length > MAX_PHOTOS_PER_UPLOAD) {
                return res.status(400).json({ error: "Carica da 1 a 12 foto alla volta" });
            }

            const uploaded = [];

            for (const photo of photos) {
                const { buffer, type } = decodePhoto(photo);
                const filename = `${Date.now()}-${randomUUID()}-${sanitizeName(photo.name)}.${extensionForType(type)}`;
                const path = `${category}/${filename}`;

                const { error } = await supabase.storage
                    .from(BUCKET_NAME)
                    .upload(path, buffer, {
                        contentType: type,
                        cacheControl: "31536000",
                        upsert: false
                    });

                if (error) throw new Error(error.message);

                const { data } = supabase.storage.from(BUCKET_NAME).getPublicUrl(path);

                uploaded.push({
                    id: path,
                    category,
                    name: filename,
                    url: data.publicUrl
                });
            }

            return res.status(200).json({
                success: true,
                message: `${uploaded.length} foto caricate`,
                photos: uploaded
            });
        }

        if (req.method === "DELETE") {
            const path = String(req.query?.path || "");
            const [category] = path.split("/");

            if (!path || !CATEGORIES.has(category)) {
                return res.status(400).json({ error: "Foto non valida" });
            }

            const { error } = await supabase.storage
                .from(BUCKET_NAME)
                .remove([path]);

            if (error) throw new Error(error.message);

            return res.status(200).json({ success: true });
        }

        res.setHeader("Allow", "GET, POST, DELETE");
        return res.status(405).json({ error: "Metodo non consentito" });
    } catch (error) {
        console.error("admin-gallery:", error);
        return res.status(500).json({
            error: "Errore gallery",
            details: error.message
        });
    }
}

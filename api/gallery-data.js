import { createClient } from "@supabase/supabase-js";

const BUCKET_NAME = "fino-demons-gallery";
const CATEGORIES = new Set(["squadra", "partite", "eventi"]);

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

function toPhoto(supabase, category, item) {
    const path = `${category}/${item.name}`;
    const { data } = supabase.storage.from(BUCKET_NAME).getPublicUrl(path);

    return {
        id: path,
        category,
        name: item.name,
        url: data.publicUrl,
        createdAt: item.created_at || item.updated_at || null
    };
}

export default async function handler(req, res) {
    if (req.method !== "GET") {
        res.setHeader("Allow", "GET");
        return res.status(405).json({ error: "Metodo non consentito" });
    }

    res.setHeader("Cache-Control", "no-store");

    try {
        const category = String(req.query?.category || "").trim();

        if (!CATEGORIES.has(category)) {
            return res.status(400).json({ error: "Sezione gallery non valida" });
        }

        const supabase = getSupabase();

        const { data, error } = await supabase.storage
            .from(BUCKET_NAME)
            .list(category, {
                limit: 100,
                sortBy: { column: "created_at", order: "desc" }
            });

        if (error) {
            const message = String(error.message || "");

            if (message.toLowerCase().includes("bucket")) {
                return res.status(200).json({ photos: [] });
            }

            throw new Error(error.message);
        }

        const photos = (data || [])
            .filter(item => item.name && item.id !== null)
            .map(item => toPhoto(supabase, category, item));

        return res.status(200).json({ photos });
    } catch (error) {
        console.error("gallery-data:", error);

        return res.status(500).json({
            error: "Impossibile caricare la gallery",
            details: error.message
        });
    }
}

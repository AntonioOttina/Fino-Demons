import { createHmac, timingSafeEqual } from "node:crypto";

const COOKIE_NAME = "fino_admin_session";
const SESSION_SECONDS = 12 * 60 * 60;

function safeEqual(a, b) {
    const aBuffer = Buffer.from(String(a));
    const bBuffer = Buffer.from(String(b));

    if (aBuffer.length !== bBuffer.length) return false;
    return timingSafeEqual(aBuffer, bBuffer);
}

function sign(value, secret) {
    return createHmac("sha256", secret).update(value).digest("hex");
}

export default async function handler(req, res) {
    if (req.method !== "POST") {
        res.setHeader("Allow", "POST");
        return res.status(405).json({ error: "Metodo non consentito" });
    }

    const secret = process.env.ADMIN_PASSWORD;

    if (!secret) {
        return res.status(500).json({ error: "ADMIN_PASSWORD non configurata su Vercel" });
    }

    const password = String(req.body?.password || "");

    if (!password || !safeEqual(password, secret)) {
        return res.status(401).json({ error: "Accesso non autorizzato" });
    }

    const expiresAt = String(Date.now() + SESSION_SECONDS * 1000);
    const signature = sign(expiresAt, secret);
    const token = `${expiresAt}.${signature}`;

    res.setHeader(
        "Set-Cookie",
        `${COOKIE_NAME}=${token}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=${SESSION_SECONDS}`
    );

    return res.status(200).json({ success: true });
}

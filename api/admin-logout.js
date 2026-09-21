export default async function handler(req, res) {
    if (req.method !== "POST") {
        res.setHeader("Allow", "POST");
        return res.status(405).json({ error: "Metodo non consentito" });
    }

    res.setHeader(
        "Set-Cookie",
        "fino_admin_session=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0"
    );

    return res.status(200).json({ success: true });
}

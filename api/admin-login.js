export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Metodo non consentito" });
  }

  try {
    const { password } = req.body || {};

    if (!password) {
      return res.status(400).json({ error: "Password mancante" });
    }

    const isValid = password === process.env.ADMIN_PASSWORD;

    if (!isValid) {
      return res.status(401).json({ success: false, error: "Accesso non autorizzato" });
    }

    return res.status(200).json({ success: true });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}

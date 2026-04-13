import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

function normalizeId(opponent, matchDate, homeAway) {
  return `${matchDate}_${homeAway}_${String(opponent || "")
    .toLowerCase()
    .replace(/\s+/g, "_")
    .replace(/[^a-z0-9_àèéìòù]/gi, "")}`;
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Metodo non consentito" });
  }

  try {
    const adminPassword = req.headers["x-admin-password"];

    if (adminPassword !== process.env.ADMIN_PASSWORD) {
      return res.status(401).json({ error: "Accesso non autorizzato" });
    }

    const {
      opponent,
      match_date,
      match_time,
      home_away,
      status,
      fino_score,
      opp_score,
      featured
    } = req.body || {};

    if (!opponent || !match_date || !home_away || !status) {
      return res.status(400).json({
        error: "Campi obbligatori mancanti"
      });
    }

    const id = normalizeId(opponent, match_date, home_away);

    const payload = {
      id,
      opponent,
      match_date,
      match_time: match_time || null,
      home_away,
      status,
      fino_score: status === "played" ? Number(fino_score) : null,
      opp_score: status === "played" ? Number(opp_score) : null,
      featured: Boolean(featured)
    };

    const { data, error } = await supabase
      .from("matches")
      .upsert(payload, { onConflict: "id" })
      .select();

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    return res.status(200).json({
      success: true,
      match: data?.[0] || payload
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}

import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

function mapOpponentName(name) {
  const clean = String(name || "").trim();

  const map = {
    "CR Fino Mornasco": "Fino Demons",
    "Pallacanestro Menaggio": "Pallacanestro Menaggio",
    "Pallacanestro Figino sq.B": "Pallacanestro Figino sq.B",
    "Pallacanestro Cabiate sq.B": "Pallacanestro Cabiate sq.B",
    "Leopandrillo Cantu": "Leopandrillo Cantu",
    "Olimpia Cadorago": "Olimpia Cadorago",
    "Basket Antoniana sq.B": "Basket Antoniana sq.B",
    "Pol. Cucciago 80": "Pol. Cucciago 80",
    "Alebbio Como A": "Alebbio Como A",
    "Alebbio Como B": "Alebbio Como B",
    "BT92 Cantù": "BT92 Cantù",
    "SCS Socco": "SCS Socco"
  };

  return map[clean] || clean;
}

function formatMatch(match) {
  const isHome = match.home_away === "home";
  const opponent = mapOpponentName(match.opponent);

  let teams = isHome
    ? `Fino Demons - ${opponent}`
    : `${opponent} - Fino Demons`;

  let score = "";
  let result = "";
  let where = isHome
    ? "In Casa (Palestra Comunale - Via L. Da Vinci)"
    : "Trasferta";

  if (match.status === "played") {
    const fino = Number(match.fino_score);
    const opp = Number(match.opp_score);

    score = `${fino} - ${opp}`;

    if (fino > opp) result = "win";
    else if (fino < opp) result = "loss";
    else result = "draw";
  }

  return {
    id: match.id,
    date: match.match_date,
    time: match.match_time || "",
    teams,
    status: match.status,
    score,
    result,
    where,
    featured: match.featured
  };
}

export default async function handler(req, res) {
  try {
    const { data, error } = await supabase
      .from("matches")
      .select("*")
      .order("match_date", { ascending: false });

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    const results = (data || []).map(formatMatch);

    return res.status(200).json(results);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}

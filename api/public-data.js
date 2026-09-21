import { createClient } from "@supabase/supabase-js";

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

function computeStandings(teams, matches) {
    const table = new Map();

    teams.forEach(team => {
        table.set(team.name, {
            team: team.name,
            played: 0,
            wins: 0,
            losses: 0,
            pointsFor: 0,
            pointsAgainst: 0,
            difference: 0,
            points: 0
        });
    });

    matches
        .filter(match => match.status === "played")
        .forEach(match => {
            const home = table.get(match.home_team);
            const away = table.get(match.away_team);

            if (!home || !away) return;

            const homeScore = Number(match.home_score);
            const awayScore = Number(match.away_score);

            if (!Number.isFinite(homeScore) || !Number.isFinite(awayScore)) return;

            home.played += 1;
            away.played += 1;

            home.pointsFor += homeScore;
            home.pointsAgainst += awayScore;

            away.pointsFor += awayScore;
            away.pointsAgainst += homeScore;

            if (homeScore > awayScore) {
                home.wins += 1;
                away.losses += 1;
                home.points += 2;
            } else if (awayScore > homeScore) {
                away.wins += 1;
                home.losses += 1;
                away.points += 2;
            }
        });

    const rows = Array.from(table.values()).map(row => ({
        ...row,
        difference: row.pointsFor - row.pointsAgainst
    }));

    rows.sort((a, b) => {
        if (b.points !== a.points) return b.points - a.points;
        if (b.difference !== a.difference) return b.difference - a.difference;
        if (b.pointsFor !== a.pointsFor) return b.pointsFor - a.pointsFor;
        return a.team.localeCompare(b.team, "it");
    });

    return rows.map((row, index) => ({
        position: index + 1,
        ...row
    }));
}

export default async function handler(req, res) {
    if (req.method !== "GET") {
        res.setHeader("Allow", "GET");
        return res.status(405).json({ error: "Metodo non consentito" });
    }

    res.setHeader("Cache-Control", "no-store");

    try {
        const supabase = getSupabase();

        const [teamsResponse, matchesResponse] = await Promise.all([
            supabase
                .from("teams")
                .select("name,is_fino,sort_order")
                .order("sort_order", { ascending: true }),

            supabase
                .from("matches")
                .select("*")
                .order("match_date", { ascending: false })
                .order("created_at", { ascending: false })
        ]);

        if (teamsResponse.error) {
            throw new Error(teamsResponse.error.message);
        }

        if (matchesResponse.error) {
            throw new Error(matchesResponse.error.message);
        }

        const teams = teamsResponse.data || [];
        const matches = matchesResponse.data || [];

        const results = matches.filter(match => match.status === "played");

        const nextMatch =
            matches.find(match => match.status === "upcoming" && match.featured) ||
            matches.find(match => match.status === "upcoming") ||
            null;

        const standings = computeStandings(teams, results);

        return res.status(200).json({
            teams,
            results,
            nextMatch,
            standings
        });
    } catch (error) {
        console.error("public-data:", error);

        return res.status(500).json({
            error: "Impossibile caricare i dati",
            details: error.message
        });
    }
}

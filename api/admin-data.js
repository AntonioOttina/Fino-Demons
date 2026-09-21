import { createClient } from "@supabase/supabase-js";
import { createHmac, timingSafeEqual } from "node:crypto";

const COOKIE_NAME = "fino_admin_session";
const FINO_NAME = "Fino Demons";

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

function isValidDate(value) {
    return /^\d{4}-\d{2}-\d{2}$/.test(String(value || ""));
}

function isValidTime(value) {
    return /^([01]\d|2[0-3]):[0-5]\d$/.test(String(value || ""));
}

function asScore(value) {
    const n = Number(value);
    return Number.isInteger(n) && n >= 0 ? n : null;
}

async function getTeams(supabase) {
    const { data, error } = await supabase
        .from("teams")
        .select("name,is_fino,sort_order")
        .order("sort_order", { ascending: true });

    if (error) throw new Error(error.message);
    return data || [];
}

async function getMatches(supabase) {
    const { data, error } = await supabase
        .from("matches")
        .select("*")
        .order("match_date", { ascending: false })
        .order("created_at", { ascending: false });

    if (error) throw new Error(error.message);
    return data || [];
}

export default async function handler(req, res) {
    res.setHeader("Cache-Control", "no-store");

    if (!isAuthenticated(req)) {
        return res.status(401).json({ error: "Sessione admin non valida" });
    }

    let supabase;

    try {
        supabase = getSupabase();

        if (req.method === "GET") {
            const [teams, matches] = await Promise.all([
                getTeams(supabase),
                getMatches(supabase)
            ]);

            return res.status(200).json({ teams, matches });
        }

        if (req.method === "POST") {
            const kind = String(req.body?.kind || "");
            const teams = await getTeams(supabase);
            const teamNames = new Set(teams.map(team => team.name));

            if (kind === "result") {
                const homeTeam = String(req.body?.home_team || "").trim();
                const awayTeam = String(req.body?.away_team || "").trim();
                const matchDate = String(req.body?.match_date || "");
                const homeScore = asScore(req.body?.home_score);
                const awayScore = asScore(req.body?.away_score);

                if (!teamNames.has(homeTeam) || !teamNames.has(awayTeam)) {
                    return res.status(400).json({ error: "Squadra non valida" });
                }

                if (homeTeam === awayTeam) {
                    return res.status(400).json({ error: "Le due squadre devono essere diverse" });
                }

                if (!isValidDate(matchDate)) {
                    return res.status(400).json({ error: "Data partita non valida" });
                }

                if (homeScore === null || awayScore === null) {
                    return res.status(400).json({ error: "Punteggio non valido" });
                }

                if (homeScore === awayScore) {
                    return res.status(400).json({ error: "Una partita di basket non può terminare in parità" });
                }

                // Se questa partita era stata impostata come prossima partita,
                // la rimuoviamo automaticamente dal box "Prossima partita".
                await supabase
                    .from("matches")
                    .delete()
                    .eq("status", "upcoming")
                    .eq("home_team", homeTeam)
                    .eq("away_team", awayTeam)
                    .eq("match_date", matchDate);

                const payload = {
                    home_team: homeTeam,
                    away_team: awayTeam,
                    match_date: matchDate,
                    match_time: null,
                    status: "played",
                    home_score: homeScore,
                    away_score: awayScore,
                    featured: false,
                    updated_at: new Date().toISOString()
                };

                const { data, error } = await supabase
                    .from("matches")
                    .upsert(payload, {
                        onConflict: "home_team,away_team,match_date,status"
                    })
                    .select()
                    .single();

                if (error) throw new Error(error.message);

                return res.status(200).json({
                    success: true,
                    message: "Risultato salvato",
                    match: data
                });
            }

            if (kind === "next") {
                const opponent = String(req.body?.opponent || "").trim();
                const matchDate = String(req.body?.match_date || "");
                const matchTime = String(req.body?.match_time || "");
                const homeAway = String(req.body?.home_away || "");

                if (!teamNames.has(opponent) || opponent === FINO_NAME) {
                    return res.status(400).json({ error: "Avversario non valido" });
                }

                if (!isValidDate(matchDate)) {
                    return res.status(400).json({ error: "Data prossima partita non valida" });
                }

                if (!isValidTime(matchTime)) {
                    return res.status(400).json({ error: "Orario non valido" });
                }

                if (!["home", "away"].includes(homeAway)) {
                    return res.status(400).json({ error: "Casa/trasferta non valido" });
                }

                const homeTeam = homeAway === "home" ? FINO_NAME : opponent;
                const awayTeam = homeAway === "home" ? opponent : FINO_NAME;

                // Deve esistere una sola "prossima partita" alla volta.
                const { error: deleteError } = await supabase
                    .from("matches")
                    .delete()
                    .eq("status", "upcoming");

                if (deleteError) throw new Error(deleteError.message);

                const { data, error } = await supabase
                    .from("matches")
                    .insert({
                        home_team: homeTeam,
                        away_team: awayTeam,
                        match_date: matchDate,
                        match_time: matchTime,
                        status: "upcoming",
                        home_score: null,
                        away_score: null,
                        featured: true
                    })
                    .select()
                    .single();

                if (error) throw new Error(error.message);

                return res.status(200).json({
                    success: true,
                    message: "Prossima partita aggiornata",
                    match: data
                });
            }

            return res.status(400).json({ error: "Operazione non valida" });
        }

        if (req.method === "DELETE") {
            const id = String(req.query?.id || "");

            if (!id) {
                return res.status(400).json({ error: "ID partita mancante" });
            }

            const { error } = await supabase
                .from("matches")
                .delete()
                .eq("id", id);

            if (error) throw new Error(error.message);

            return res.status(200).json({ success: true });
        }

        res.setHeader("Allow", "GET, POST, DELETE");
        return res.status(405).json({ error: "Metodo non consentito" });
    } catch (error) {
        console.error("admin-data:", error);
        return res.status(500).json({
            error: "Errore server",
            details: error.message
        });
    }
}

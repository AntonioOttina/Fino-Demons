export default async function handler(req, res) {
    try {
        const classificaUrl = "https://www.playbasket.it/lombardia/league.php?lt=2&lf=M&lr=LO&lp=MI&lc=DR4&season=2026&lg=8&mod=st";
        const calendarioUrl = "https://www.playbasket.it/lombardia/league.php?lt=2&lf=M&lr=LO&lp=MI&lc=DR4&season=2026&lg=8&mod=cl";

        const [classificaRes, calendarioRes] = await Promise.all([
            fetch(classificaUrl),
            fetch(calendarioUrl)
        ]);

        const classificaHtml = await classificaRes.text();
        const calendarioHtml = await calendarioRes.text();

        function clean(text) {
            return String(text || "")
                .replace(/<[^>]*>/g, "")
                .replace(/&nbsp;/gi, " ")
                .replace(/&amp;/gi, "&")
                .replace(/&#39;/g, "'")
                .replace(/&quot;/g, '"')
                .replace(/&#176;/g, "°")
                .replace(/\s+/g, " ")
                .trim();
        }

        function normalizeTeamName(name) {
            const cleaned = clean(name);
            const lower = cleaned.toLowerCase();

            if (
                lower.includes("cr fino mornasco") ||
                lower.includes("fino demons") ||
                lower === "fino mornasco"
            ) {
                return "Fino Demons";
            }

            if (lower === "pallacanestro cabiate sq.b") return "Pallacanestro Cabiate";
            if (lower === "pallacanestro figino sq.b") return "Pallacanestro Figino";
            if (lower === "pol. cucciago 80") return "Pol. Cucciago 80";

            return cleaned;
        }

        function getWhereFromTeams(teams) {
            const [home = ""] = teams.split(" - ").map(t => t.trim());
            return home.toLowerCase().includes("fino")
                ? "In Casa"
                : "Trasferta";
        }

        function buildDate(match) {
            const [day, month] = match.date.split("/").map(Number);
            const year = month >= 10 ? 2025 : 2026;

            if (match.time) {
                const [hours, minutes] = match.time.split(":").map(Number);
                return new Date(year, month - 1, day, hours || 0, minutes || 0, 0, 0);
            }

            return new Date(year, month - 1, day, 23, 59, 0, 0);
        }

        const standings = [];
        const matches = [];

        // =========================
        // CLASSIFICA
        // =========================
        let standingsRows = classificaHtml.match(/<tr class=['"]row_standings['"][\s\S]*?<\/tr>/gi) || [];
        standingsRows = standingsRows.slice(0, 12);

        standingsRows.forEach(row => {
            const positionMatch = row.match(/class=['"]colfrozen['"]>(\d+)/i);
            const teamMatch = row.match(/<a[^>]*>([^<]+)<\/a>/i);
            const pointsMatch = row.match(/class=['"]highlighted_data['"]>(\d+)/i);

            const position = clean(positionMatch?.[1]);
            const team = clean(teamMatch?.[1]);
            const points = clean(pointsMatch?.[1]);

            if (position && team && points) {
                standings.push({
                    position,
                    team,
                    points
                });
            }
        });

        // =========================
        // CALENDARIO COMPLETO
        // =========================
        const matchRows = calendarioHtml.match(/<tr[^>]*>[\s\S]*?<\/tr>/gi) || [];
        const seen = new Set();

        matchRows.forEach(row => {
            if (!row.toLowerCase().includes("fino")) return;
            if (!row.includes("<td")) return;

            const tdMatches = [...row.matchAll(/<td[^>]*>([\s\S]*?)<\/td>/gi)].map(m => m[1]);
            if (tdMatches.length < 5) return;

            const date = clean(tdMatches[0]);
            const homeTeam = normalizeTeamName(tdMatches[1]);
            const awayTeam = normalizeTeamName(tdMatches[2]);
            const teams = `${homeTeam} - ${awayTeam}`;
            const where = getWhereFromTeams(teams);

            // partita futura
            const noResultMatch = row.match(/<td colspan=['"]2['"] class=['"]noResult['"]>([^<]+)<\/td>/i);
            if (noResultMatch) {
                const time = clean(noResultMatch[1]);

                const item = {
                    date,
                    teams,
                    score: "",
                    time,
                    status: "upcoming",
                    result: "",
                    where
                };

                const key = `${date}|${teams}|${time}|upcoming`;
                if (!seen.has(key)) {
                    seen.add(key);
                    matches.push(item);
                }
                return;
            }

            // partita giocata
            const scoreCells = [...row.matchAll(/<td[^>]*>\s*(?:<a[^>]*>)?\s*(\d{1,3})\s*(?:<\/a>)?\s*<\/td>/gi)]
                .map(m => m[1]);

            if (scoreCells.length >= 2) {
                const score1 = parseInt(scoreCells[scoreCells.length - 2], 10);
                const score2 = parseInt(scoreCells[scoreCells.length - 1], 10);

                let result = "";
                if (homeTeam.toLowerCase().includes("fino")) {
                    result = score1 > score2 ? "win" : "loss";
                } else if (awayTeam.toLowerCase().includes("fino")) {
                    result = score2 > score1 ? "win" : "loss";
                }

                const item = {
                    date,
                    teams,
                    score: `${score1} - ${score2}`,
                    time: "",
                    status: "played",
                    result,
                    where
                };

                const key = `${date}|${teams}|${score1}-${score2}|played`;
                if (!seen.has(key)) {
                    seen.add(key);
                    matches.push(item);
                }
            }
        });

        matches.sort((a, b) => buildDate(a) - buildDate(b));

        const now = new Date();
        const played = matches.filter(match => match.status === "played");
        const upcoming = matches.filter(match => buildDate(match) >= now || match.status === "upcoming");

        res.status(200).json({
            debug: {
                standingsCount: standings.length,
                resultsCount: played.length,
                upcomingCount: upcoming.length,
                totalMatchesCount: matches.length
            },
            standings,
            results: played,
            upcoming,
            matches
        });
    } catch (err) {
        res.status(500).json({
            error: err.toString()
        });
    }
}
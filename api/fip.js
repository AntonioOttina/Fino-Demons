export default async function handler(req, res) {
    try {
        const classificaUrl = "https://m.playbasket.it/lombardia/league.php?lt=2&lf=M&lr=LO&lp=MI&lc=DR4&season=2026&lg=8&mod=st";
        const calendarioUrl = "https://m.playbasket.it/lombardia/league.php?lt=2&lf=M&lr=LO&lp=MI&lc=DR4&season=2026&lg=8&mod=cl";

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
                .replace(/\s+/g, " ")
                .trim();
        }

        function normalizeFinoName(name) {
            const lower = name.toLowerCase();
            if (
                lower.includes("cr fino mornasco") ||
                lower.includes("fino mornasco") ||
                lower.includes("fino demons")
            ) {
                return "Fino Demons";
            }
            return name;
        }

        function splitTeams(rawTeams) {
            const cleaned = clean(rawTeams);

            const aliases = ["CR Fino Mornasco", "Fino Mornasco", "Fino Demons"];
            for (const alias of aliases) {
                const idx = cleaned.toLowerCase().indexOf(alias.toLowerCase());
                if (idx === -1) continue;

                const before = cleaned.slice(0, idx).trim();
                const after = cleaned.slice(idx + alias.length).trim();
                const fino = "Fino Demons";

                if (!before && after) return `${fino} - ${after}`;
                if (before && !after) return `${before} - ${fino}`;
                if (before && after) return `${before} - ${fino} ${after}`.replace(/\s+/g, " ").trim();
            }

            return cleaned;
        }

        function getWhereFromTeams(teams) {
            const [team1 = ""] = teams.split(" - ").map(t => t.trim());
            return team1.toLowerCase().includes("fino")
                ? "In Casa (Palestra Comunale - Via L. Da Vinci)"
                : "Trasferta";
        }

        const standings = [];
        const results = [];

        // ===== CLASSIFICA =====
        let rows = classificaHtml.match(/<tr class=['"]row_standings['"][\s\S]*?<\/tr>/gi) || [];
        rows = rows.slice(0, 12);

        rows.forEach(row => {
            const positionMatch = row.match(/colfrozen['"]>(\d+)/i);
            const teamMatch = row.match(/<a[^>]*>([^<]+)<\/a>/i);
            const pointsMatch = row.match(/highlighted_data['"]>(\d+)/i);

            const position = clean(positionMatch?.[1]);
            const team = clean(teamMatch?.[1]);
            const points = clean(pointsMatch?.[1]);

            if (position && team && points) {
                standings.push({ position, team, points });
            }
        });

        // ===== CALENDARIO / RISULTATI =====
        // Strategia:
        // 1. prendo tutte le righe che contengono data
        // 2. tengo solo quelle con "Fino"
        // 3. distinguo partite giocate e future

        const allRows = calendarioHtml.match(/<tr[\s\S]*?<\/tr>/gi) || [];
        const seen = new Set();

        for (const row of allRows) {
            const text = clean(row);

            if (!text.includes("/")) continue;
            if (!text.toLowerCase().includes("fino")) continue;

            const dateMatch = text.match(/\b(\d{2}\/\d{2})\b/);
            if (!dateMatch) continue;

            const date = dateMatch[1];

            // prova partita giocata: data + squadre + 2 numeri finali
            let playedMatch = text.match(/^(\d{2}\/\d{2})\s+(.*?)\s+(\d{1,3})\s+(\d{1,3})$/);

            // se non trova, prova a pulire eventuale testo extra finale
            if (!playedMatch) {
                const m = text.match(/(\d{2}\/\d{2})\s+(.*?)\s+(\d{1,3})\s+(\d{1,3})/);
                if (m) playedMatch = m;
            }

            if (playedMatch) {
                const teamsRaw = playedMatch[2];
                const s1 = parseInt(playedMatch[3], 10);
                const s2 = parseInt(playedMatch[4], 10);

                const teams = splitTeams(teamsRaw);
                const [team1 = "", team2 = ""] = teams.split(" - ").map(t => normalizeFinoName(t.trim()));

                let result = "";
                if (team1.toLowerCase().includes("fino")) {
                    result = s1 > s2 ? "win" : "loss";
                } else if (team2.toLowerCase().includes("fino")) {
                    result = s2 > s1 ? "win" : "loss";
                }

                const item = {
                    date,
                    teams: `${team1} - ${team2}`,
                    score: `${s1} - ${s2}`,
                    time: "",
                    status: "played",
                    result,
                    where: getWhereFromTeams(`${team1} - ${team2}`)
                };

                const key = `${item.date}|${item.teams}|${item.score}|played`;
                if (!seen.has(key)) {
                    seen.add(key);
                    results.push(item);
                }
                continue;
            }

            // partita futura: data + squadre + orario
            let upcomingMatch = text.match(/^(\d{2}\/\d{2})\s+(.*?)\s+(\d{1,2}:\d{2})$/);

            if (!upcomingMatch) {
                const m = text.match(/(\d{2}\/\d{2})\s+(.*?)\s+(\d{1,2}:\d{2})/);
                if (m) upcomingMatch = m;
            }

            if (upcomingMatch) {
                const teamsRaw = upcomingMatch[2];
                const time = upcomingMatch[3];

                const teams = splitTeams(teamsRaw);
                const [team1 = "", team2 = ""] = teams.split(" - ").map(t => normalizeFinoName(t.trim()));

                const item = {
                    date,
                    teams: `${team1} - ${team2}`,
                    score: "",
                    time,
                    status: "upcoming",
                    result: "",
                    where: getWhereFromTeams(`${team1} - ${team2}`)
                };

                const key = `${item.date}|${item.teams}|${item.time}|upcoming`;
                if (!seen.has(key)) {
                    seen.add(key);
                    results.push(item);
                }
            }
        }

        res.status(200).json({
            debug: {
                standingsCount: standings.length,
                resultsCount: results.length
            },
            standings,
            results
        });
    } catch (err) {
        res.status(500).json({
            error: err.toString()
        });
    }
}
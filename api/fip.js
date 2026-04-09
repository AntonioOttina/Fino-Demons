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

        function splitTeams(rawTeams) {
            const aliases = ["CR Fino Mornasco", "Fino Mornasco", "Fino Demons"];
            const cleaned = clean(rawTeams);

            for (const alias of aliases) {
                const lower = cleaned.toLowerCase();
                const aliasLower = alias.toLowerCase();
                const idx = lower.indexOf(aliasLower);

                if (idx === -1) continue;

                const before = cleaned.slice(0, idx).trim();
                const after = cleaned.slice(idx + alias.length).trim();

                if (!before && after) {
                    return `${alias} - ${after}`;
                }

                if (before && !after) {
                    return `${before} - ${alias}`;
                }

                if (before && after) {
                    return `${before} - ${alias} ${after}`.replace(/\s+/g, " ").trim();
                }
            }

            return cleaned;
        }

        function parseSeasonDate(ddmm) {
            const [day, month] = ddmm.split("/").map(Number);
            if (!day || !month) return null;

            // stagione 2025/2026:
            // ott-dic = 2025, gen-giu = 2026
            const year = month >= 10 ? 2025 : 2026;
            return new Date(year, month - 1, day);
        }

        const standings = [];
        const results = [];

        // =========================
        // CLASSIFICA
        // =========================
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
                standings.push({
                    position,
                    team,
                    points
                });
            }
        });

        // =========================
        // CALENDARIO / RISULTATI
        // =========================
        const rowsCal = calendarioHtml.match(/<tr[\s\S]*?<\/tr>/gi) || [];
        const seen = new Set();

        rowsCal.forEach(row => {
            const text = clean(row);

            if (!text.toLowerCase().includes("fino")) return;

            const dateMatch = text.match(/\b(\d{2}\/\d{2})\b/);
            if (!dateMatch) return;

            const date = dateMatch[1];
            const afterDate = text.slice(text.indexOf(date) + date.length).trim();

            // Caso partita giocata: ... squadra squadra 67 57
            const playedMatch = afterDate.match(/^(.*)\s+(\d{1,3})\s+(\d{1,3})$/);

            // Caso partita da giocare: ... squadra squadra 18:00
            const upcomingMatch = afterDate.match(/^(.*)\s+(\d{1,2}:\d{2})$/);

            let item = null;

            if (playedMatch) {
                const teamsRaw = playedMatch[1].trim();
                const s1 = parseInt(playedMatch[2], 10);
                const s2 = parseInt(playedMatch[3], 10);
                const teams = splitTeams(teamsRaw);

                const [team1, team2] = teams.split(" - ").map(t => t.trim());

                let result = "";
                if (team1?.toLowerCase().includes("fino")) {
                    result = s1 > s2 ? "win" : "loss";
                } else if (team2?.toLowerCase().includes("fino")) {
                    result = s2 > s1 ? "win" : "loss";
                }

                item = {
                    date,
                    dateObj: parseSeasonDate(date)?.toISOString() || null,
                    teams,
                    score: `${s1} - ${s2}`,
                    time: "",
                    status: "played",
                    result
                };
            } else if (upcomingMatch) {
                const teamsRaw = upcomingMatch[1].trim();
                const time = upcomingMatch[2].trim();
                const teams = splitTeams(teamsRaw);

                item = {
                    date,
                    dateObj: parseSeasonDate(date)?.toISOString() || null,
                    teams,
                    score: "",
                    time,
                    status: "upcoming",
                    result: ""
                };
            }

            if (!item) return;

            const key = `${item.date}|${item.teams}|${item.score}|${item.time}|${item.status}`;
            if (!seen.has(key)) {
                seen.add(key);
                results.push(item);
            }
        });

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
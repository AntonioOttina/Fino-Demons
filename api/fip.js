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
            if (lower.includes("cr fino mornasco") || lower.includes("fino demons") || lower === "fino mornasco") {
                return "Fino Demons";
            }
            return name;
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
                    return `${normalizeFinoName(alias)} - ${after}`;
                }

                if (before && !after) {
                    return `${before} - ${normalizeFinoName(alias)}`;
                }

                if (before && after) {
                    return `${before} - ${normalizeFinoName(alias)} ${after}`.replace(/\s+/g, " ").trim();
                }
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
        const seen = new Set();

        // Partite giocate: data + squadre + 2 punteggi
        const playedRegex = /data-team="[^"]+"[^>]*>\s*(\d{2}\/\d{2})\s+([^<]+?)\s+(\d{1,3})\s+(\d{1,3})(?=\s*<|\s*$)/gi;

        let match;
        while ((match = playedRegex.exec(calendarioHtml)) !== null) {
            const date = clean(match[1]);
            const teamsRaw = clean(match[2]);
            const s1 = parseInt(match[3], 10);
            const s2 = parseInt(match[4], 10);

            if (!teamsRaw.toLowerCase().includes("fino")) continue;

            const teams = splitTeams(teamsRaw);
            const [team1 = "", team2 = ""] = teams.split(" - ").map(t => t.trim());

            let result = "";
            if (team1.toLowerCase().includes("fino")) {
                result = s1 > s2 ? "win" : "loss";
            } else if (team2.toLowerCase().includes("fino")) {
                result = s2 > s1 ? "win" : "loss";
            }

            const item = {
                date,
                teams,
                score: `${s1} - ${s2}`,
                time: "",
                status: "played",
                result,
                phase: "",
                where: getWhereFromTeams(teams)
            };

            const key = `${item.date}|${item.teams}|${item.score}|played`;
            if (!seen.has(key)) {
                seen.add(key);
                results.push(item);
            }
        }

        // Partite future: data + squadre + orario
        const upcomingRegex = /data-team="[^"]+"[^>]*>\s*(\d{2}\/\d{2})\s+([^<]+?)\s+(\d{1,2}:\d{2})(?=\s*<|\s*$)/gi;

        while ((match = upcomingRegex.exec(calendarioHtml)) !== null) {
            const date = clean(match[1]);
            const teamsRaw = clean(match[2]);
            const time = clean(match[3]);

            if (!teamsRaw.toLowerCase().includes("fino")) continue;

            const teams = splitTeams(teamsRaw);

            const item = {
                date,
                teams,
                score: "",
                time,
                status: "upcoming",
                result: "",
                phase: "",
                where: getWhereFromTeams(teams)
            };

            const key = `${item.date}|${item.teams}|${item.time}|upcoming`;
            if (!seen.has(key)) {
                seen.add(key);
                results.push(item);
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
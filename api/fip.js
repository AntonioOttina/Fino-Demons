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

        const standings = [];
        const results = [];

        // =========================
        // CLASSIFICA (STABILE)
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
        // RISULTATI (FIX ROBUSTO)
        // =========================

        const rowsCal = calendarioHtml.match(/<tr[\s\S]*?<\/tr>/gi) || [];

        rowsCal.forEach(row => {
            const text = clean(row);

            // prendi solo partite con Fino
            if (!text.toLowerCase().includes("fino")) return;

            // cerca punteggio
            const scoreMatch = text.match(/(\d{1,3})\s*-\s*(\d{1,3})/);

            // cerca data
            const dateMatch = text.match(/\d{2}\/\d{2}/);

            let teams = text;

            if (scoreMatch) {
                teams = text.split(scoreMatch[0])[0].trim();
            }

            if (teams.length < 5) return;

            results.push({
                date: clean(dateMatch?.[0] || ""),
                teams,
                score: scoreMatch ? scoreMatch[0] : "VS"
            });
        });

        // più recenti sopra
        results.reverse();

        res.status(200).json({
            debug: {
                standingsCount: standings.length,
                resultsCount: results.length
            },
            standings,
            results: results.slice(0, 20)
        });

    } catch (err) {
        res.status(500).json({
            error: err.toString()
        });
    }
}
export default async function handler(req, res) {
    try {
        const classificaUrl = "https://m.playbasket.it/lombardia/league.php?lt=2&lf=M&lr=LO&lp=MI&lc=DR4&season=2026&lg=8&mod=st";
        const calendarioUrl = "https://m.playbasket.it/lombardia/league.php?lt=2&lf=M&lr=LO&lp=MI&lc=DR4&season=2026&lg=8&mod=cl";

        const responseClassifica = await fetch(classificaUrl);
        const responseCalendario = await fetch(calendarioUrl);

        const classificaHtml = await responseClassifica.text();
        const calendarioHtml = await responseCalendario.text();

        function clean(text) {
            return text
                .replace(/<[^>]*>/g, "")
                .replace(/&nbsp;/g, " ")
                .replace(/\s+/g, " ")
                .trim();
        }

        const standings = [];
        const results = [];

        // ======================
        // CLASSIFICA (mobile)
        // ======================
        const rows = classificaHtml.split("<tr");

        rows.forEach(row => {
            const cols = row.split("<td");

            if (cols.length >= 5) {
                const position = clean(cols[1]);
                const team = clean(cols[2]);
                const points = clean(cols[cols.length - 1]);

                if (team && !team.includes("Squadra")) {
                    standings.push({
                        position,
                        team,
                        points
                    });
                }
            }
        });

        // ======================
        // RISULTATI (mobile)
        // ======================
        const matches = calendarioHtml.split("<tr");

        matches.forEach(row => {
            const text = clean(row);

            if (
                text.includes("Fino") &&
                text.match(/\d+\s+\d+/)
            ) {
                const parts = text.split(" ");

                const scoreIndex = parts.findIndex(p => p.match(/^\d+$/));

                if (scoreIndex > 0) {
                    const homeScore = parts[scoreIndex];
                    const awayScore = parts[scoreIndex + 1];

                    const teams = parts.slice(0, scoreIndex).join(" ");

                    results.push({
                        date: "",
                        teams,
                        score: `${homeScore} - ${awayScore}`
                    });
                }
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
        res.status(500).json({ error: err.toString() });
    }
}
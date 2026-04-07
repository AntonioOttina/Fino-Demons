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
            return text
                .replace(/<[^>]*>/g, "")
                .replace(/&nbsp;/g, " ")
                .replace(/&amp;/g, "&")
                .replace(/\s+/g, " ")
                .trim();
        }

        const standings = [];
        const results = [];

        // =========================
        // CLASSIFICA CORRETTA
        // =========================
let rows = classificaHtml.match(/<tr class=['"]row_standings['"][\s\S]*?<\/tr>/gi) || [];

// tieni solo le prime 12 squadre (classifica generale)
rows = rows.slice(0, 12);

        rows.forEach(row => {

            const position = clean((row.match(/colfrozen'>(\d+)/) || [])[1]);
            const team = clean((row.match(/<a[^>]*>([^<]+)<\/a>/) || [])[1]);
            const points = clean((row.match(/Punti in classifica[^>]*>(\d+)/) || [])[1]);

            if (position && team && points) {
                standings.push({
                    position,
                    team,
                    points
                });
            }
        });

        // =========================
        // RISULTATI CORRETTI
        // =========================

        const matchRegex = /data-team="[^"]+"[^>]*>\s*(\d{2}\/\d{2})\s+([^<]+?)\s+(\d{1,3})\s+(\d{1,3})/gi;

        let match;

        while ((match = matchRegex.exec(calendarioHtml)) !== null) {

            const date = match[1];
            const teamsText = clean(match[2]);
            const s1 = parseInt(match[3], 10);
            const s2 = parseInt(match[4], 10);

            if (!teamsText.includes("Fino")) continue;

            const words = teamsText.split("CR Fino Mornasco");

            let home = "";
            let away = "";

            if (words.length === 2) {
                if (words[0].trim() === "") {
                    home = "CR Fino Mornasco";
                    away = words[1].trim();
                } else {
                    home = words[0].trim();
                    away = "CR Fino Mornasco";
                }
            } else {
                continue;
            }

            let result = "";
            if (home.includes("Fino")) {
                result = s1 > s2 ? "win" : "loss";
            } else {
                result = s2 > s1 ? "win" : "loss";
            }

            results.push({
                date,
                teams: `${home} - ${away}`,
                score: `${s1} - ${s2}`,
                result
            });
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
        res.status(500).json({ error: err.toString() });
    }
}
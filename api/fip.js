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
        // CLASSIFICA GENERALE
        // =========================
        let rows = classificaHtml.match(/<tr class=['"]row_standings['"][\s\S]*?<\/tr>/gi) || [];
        rows = rows.slice(0, 12);

        rows.forEach(row => {
            const positionMatch = row.match(/title=['"]Posizione in graduatoria['"][^>]*class=['"]colfrozen['"]>(\d+)/i);
            const teamMatch = row.match(/class=["']sq colfrozen["'][^>]*>[\s\S]*?<a[^>]*>([^<]+)<\/a>/i);
            const pointsMatch = row.match(/title=['"]Punti in classifica['"][^>]*class=['"]highlighted_data['"]>(\d+)/i);

            const position = clean(positionMatch ? positionMatch[1] : "");
            const team = clean(teamMatch ? teamMatch[1] : "");
            const points = clean(pointsMatch ? pointsMatch[1] : "");

            if (position && team && points) {
                standings.push({
                    position,
                    team,
                    points
                });
            }
        });

        // =========================
        // RISULTATI
        // =========================
        const matchRegex = /data-team="[^"]+"[^>]*>\s*(\d{2}\/\d{2})\s+([^<]+?)\s+(\d{1,3})\s+(\d{1,3})/gi;

        let match;
        while ((match = matchRegex.exec(calendarioHtml)) !== null) {
            const date = clean(match[1]);
            const teamsText = clean(match[2]);
            const s1 = parseInt(match[3], 10);
            const s2 = parseInt(match[4], 10);

            if (!teamsText.includes("Fino")) continue;

            results.push({
                date,
                teams: teamsText,
                score: `${s1} - ${s2}`,
                result: ""
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
        res.status(500).json({
            error: err.toString()
        });
    }
}
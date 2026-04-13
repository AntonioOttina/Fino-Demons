export default async function handler(req, res) {
    try {
        const classificaUrl = "https://m.playbasket.it/lombardia/league.php?lt=2&lf=M&lr=LO&lp=MI&lc=DR4&season=2026&lg=8&mod=st";
        const classificaRes = await fetch(classificaUrl);
        const classificaHtml = await classificaRes.text();

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

        res.status(200).json({
            standings
        });
    } catch (err) {
        res.status(500).json({
            error: err.toString()
        });
    }
}
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
// CLASSIFICA FIX ROBUSTO
// =========================

const rows = classificaHtml.match(/<tr[\s\S]*?<\/tr>/gi) || [];

rows.forEach(row => {
    const text = clean(row);

    const match = text.match(/^(\d+)\s+(.+?)\s+(\d+)$/);

    if (match) {
        const position = match[1];
        const team = match[2];
        const points = match[3];

        if (team.length > 3 && parseInt(position) <= 20) {
            standings.push({
                position,
                team,
                points
            });
        }
    }
});

// tieni solo le prime 12
standings.splice(12);

        // =========================
        // RISULTATI
        // =========================
        // Per ora li lasciamo base: se più avanti vuoi li sistemiamo meglio.
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
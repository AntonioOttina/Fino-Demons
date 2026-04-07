export default async function handler(req, res) {
    try {
        const classificaUrl = "https://www.playbasket.it/lombardia/league.php?lt=2&lf=M&lr=LO&lp=MI&lc=DR4&season=2026&lg=8&mod=st";
        const calendarioUrl = "https://www.playbasket.it/lombardia/league.php?lt=2&lf=M&lr=LO&lp=MI&lc=DR4&season=2026&lg=8&mod=cl";

        const browserHeaders = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36",
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
            "Accept-Language": "it-IT,it;q=0.9,en;q=0.8",
            "Cache-Control": "no-cache",
            "Pragma": "no-cache"
        };

        const [classificaRes, calendarioRes] = await Promise.all([
            fetch(classificaUrl, { headers: browserHeaders }),
            fetch(calendarioUrl, { headers: browserHeaders })
        ]);

        const classificaHtml = await classificaRes.text();
        const calendarioHtml = await calendarioRes.text();

        function compact(text) {
            return text.replace(/\s+/g, " ").trim();
        }

        res.status(200).json({
            debug: {
                classificaStatus: classificaRes.status,
                calendarioStatus: calendarioRes.status,
                classificaLength: classificaHtml.length,
                calendarioLength: calendarioHtml.length
            },
            classificaSnippet: compact(classificaHtml).slice(0, 4000),
            calendarioSnippet: compact(calendarioHtml).slice(0, 4000)
        });
    } catch (error) {
        res.status(500).json({
            error: String(error)
        });
    }
}
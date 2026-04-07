export default async function handler(req, res) {
    try {
        const classificaUrl = "https://www.playbasket.it/lombardia/league.php?lt=2&lf=M&lr=LO&lp=MI&lc=DR4&season=2026&lg=8&mod=st";
        const calendarioUrl = "https://www.playbasket.it/lombardia/league.php?lt=2&lf=M&lr=LO&lp=MI&lc=DR4&season=2026&lg=8&mod=cl";

        const [classificaRes, calendarioRes] = await Promise.all([
            fetch(classificaUrl),
            fetch(calendarioUrl)
        ]);

        const classificaHtml = await classificaRes.text();
        const calendarioHtml = await calendarioRes.text();

        const standings = [];
        const results = [];

        // ===== FUNZIONE PULIZIA =====
        function clean(text) {
            return text
                .replace(/<[^>]*>/g, "")
                .replace(/&nbsp;/g, " ")
                .replace(/\s+/g, " ")
                .trim();
        }

        // ===== CLASSIFICA (FIX VERO) =====
        const teamRegex = /class="sq colfrozen">([^<]+)/g;

        let match;
        let position = 1;

        while ((match = teamRegex.exec(classificaHtml)) !== null) {
            const teamName = clean(match[1]);

            standings.push({
                position,
                team: teamName,
                points: "-" // PlayBasket non espone facilmente i punti
            });

            position++;
        }

        // ===== RISULTATI (FIX VERO) =====
        const resultRegex = /(\d{2}\/\d{2})\s+([A-Za-z\s\.]+)\s+(\d+)\s+(\d+)/g;

        let game;

        while ((game = resultRegex.exec(calendarioHtml)) !== null) {
            const date = game[1];
            const teams = clean(game[2]);
            const score = `${game[3]} - ${game[4]}`;

            results.push({
                date,
                teams,
                score
            });
        }

        res.status(200).json({
            standings: standings.slice(0, 14),
            results: results.slice(0, 30)
        });

    } catch (error) {
        res.status(500).json({ error: "Errore scraping PlayBasket" });
    }
}
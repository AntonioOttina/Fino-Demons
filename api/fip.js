export default async function handler(req, res) {
    try {
        const url = "https://www.playbasket.it/lombardia/divisione-regionale-4";
        const response = await fetch(url);
        const html = await response.text();

        // ====== ESTRAZIONE DATI ======
        const results = [];
        const standings = [];

        // 👇 parsing base (semplificato)
        // (PlayBasket usa molte classi dinamiche → facciamo parsing semplice)

        const lines = html.split("\n");

        lines.forEach(line => {
            // RISULTATI (molto base)
            if (line.includes("Fino")) {
                results.push({
                    date: "Auto",
                    teams: line.trim(),
                    score: "-",
                    result: ""
                });
            }

            // CLASSIFICA (placeholder)
            if (line.includes("Demons")) {
                standings.push({
                    team: "Fino Demons",
                    points: "-"
                });
            }
        });

        res.status(200).json({
            results: results.slice(0, 10),
            standings: standings.slice(0, 10)
        });

    } catch (error) {
        res.status(500).json({ error: "Errore scraping PlayBasket" });
    }
}

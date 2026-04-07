export default async function handler(req, res) {
    try {
        const url = "https://www.playbasket.it/lombardia/divisione-regionale-4";
        const response = await fetch(url);
        const html = await response.text();

        const results = [];
        const standings = [];

        // ===== PARSING RISULTATI =====
        const matchRegex = /(\d{2}\/\d{2}\/\d{4}).*?([A-Za-z\s]+)\s+(\d+)\s*-\s*(\d+)\s+([A-Za-z\s]+)/g;

        let match;
        while ((match = matchRegex.exec(html)) !== null) {
            results.push({
                date: match[1],
                teams: `${match[2].trim()} - ${match[5].trim()}`,
                score: `${match[3]} - ${match[4]}`,
                result: match[2].includes("Fino") || match[5].includes("Fino")
                    ? (parseInt(match[3]) > parseInt(match[4]) ? "win" : "loss")
                    : ""
            });
        }

        // ===== PARSING CLASSIFICA =====
        const tableRegex = /(\d+)\s+([A-Za-z\s]+)\s+(\d+)/g;

        let team;
        while ((team = tableRegex.exec(html)) !== null) {
            standings.push({
                position: team[1],
                team: team[2].trim(),
                points: team[3]
            });
        }

        res.status(200).json({
            results: results.slice(0, 10),
            standings: standings.slice(0, 12)
        });

    } catch (error) {
        res.status(500).json({ error: "Errore scraping PlayBasket" });
    }
}
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

        // ===== CLASSIFICA =====
        const classificaRows = classificaHtml.split("<tr");

        classificaRows.forEach(row => {
            if (row.includes("td")) {
                const cols = row.split("<td");

                if (cols.length > 5) {
                    function clean(text) {
    return text
        .replace(/<[^>]*>/g, "")   // rimuove HTML
        .replace(/&nbsp;/g, " ")   // spazi HTML
        .replace(/\s+/g, " ")      // spazi multipli
        .trim();
}

const position = clean(cols[1] || "");
const team = clean(cols[2] || "");
const points = clean(cols[cols.length - 1] || "");

                    if (team && !team.includes("Squadra")) {
                        standings.push({
                            position,
                            team,
                            points
                        });
                    }
                }
            }
        });

        // ===== RISULTATI =====
        const matches = calendarioHtml.split("<tr");

        matches.forEach(row => {
            if (row.includes("-")) {
                const text = row
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();

                if (text.includes("-")) {
                    const parts = text.split("-");

                    if (parts.length >= 2) {
                        const teams = parts[0].trim();
                        const score = parts[1].trim();

                        results.push({
                            date: "",
                            teams,
                            score
                        });
                    }
                }
            }
        });

        res.status(200).json({
            standings: standings.slice(0, 14),
            results: results.slice(0, 20)
        });

    } catch (error) {
        res.status(500).json({ error: "Errore scraping PlayBasket" });
    }
}
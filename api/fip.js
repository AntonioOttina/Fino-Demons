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

        function clean(text) {
            return text
                .replace(/<[^>]*>/g, " ")
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
        // CLASSIFICA
        // =========================
        // Prendiamo tutti i team reali dal pattern:
        // class="sq colfrozen">CR Fino Mornasco
        const teamOnlyRegex = /class=["']sq colfrozen["']>\s*([^<\n\r]+)/gi;

        let teamMatch;
        let pos = 1;
        const seenTeams = new Set();

        while ((teamMatch = teamOnlyRegex.exec(classificaHtml)) !== null) {
            const teamName = clean(teamMatch[1]);

            if (
                !teamName ||
                teamName.toLowerCase() === "squadra" ||
                teamName.toLowerCase().includes("classifica") ||
                teamName.toLowerCase().includes("playbasket")
            ) {
                continue;
            }

            const key = teamName.toLowerCase();

            if (!seenTeams.has(key)) {
                seenTeams.add(key);

                standings.push({
                    position: String(pos),
                    team: teamName,
                    points: "-"
                });

                pos++;
            }
        }

        // =========================
        // RISULTATI
        // =========================
        // Dalla stringa che hai incollato il formato è tipo:
        // 19/10 BT92 Cantù CR Fino Mornasco 42 78
        // 26/10 CR Fino Mornasco Olimpia Cadorago 61 42
        //
        // Usiamo una regex che prende SOLO le partite di Fino.
        const finoResultsRegex = /(\d{2}\/\d{2})\s+([A-Za-zÀ-ÖØ-öø-ÿ0-9'’. \-]+?)\s+(CR Fino Mornasco|Fino Mornasco|Fino Demons)\s+(\d{1,3})\s+(\d{1,3})/gi;

        let resultMatch;

        while ((resultMatch = finoResultsRegex.exec(calendarioHtml)) !== null) {
            const date = clean(resultMatch[1]);
            const homeTeam = clean(resultMatch[2]);
            const awayTeam = clean(resultMatch[3]);
            const homeScore = parseInt(resultMatch[4], 10);
            const awayScore = parseInt(resultMatch[5], 10);

            results.push({
                date,
                teams: `${homeTeam} - ${awayTeam}`,
                score: `${homeScore} - ${awayScore}`,
                result: awayScore > homeScore ? "win" : "loss"
            });
        }

        // Fallback: Fino come squadra di casa
        const finoHomeRegex = /(\d{2}\/\d{2})\s+(CR Fino Mornasco|Fino Mornasco|Fino Demons)\s+([A-Za-zÀ-ÖØ-öø-ÿ0-9'’. \-]+?)\s+(\d{1,3})\s+(\d{1,3})/gi;

        while ((resultMatch = finoHomeRegex.exec(calendarioHtml)) !== null) {
            const date = clean(resultMatch[1]);
            const homeTeam = clean(resultMatch[2]);
            const awayTeam = clean(resultMatch[3]);
            const homeScore = parseInt(resultMatch[4], 10);
            const awayScore = parseInt(resultMatch[5], 10);

            const teamsString = `${homeTeam} - ${awayTeam}`;

            // evita duplicati
            const alreadyExists = results.some(
                (r) => r.date === date && r.teams === teamsString && r.score === `${homeScore} - ${awayScore}`
            );

            if (!alreadyExists) {
                results.push({
                    date,
                    teams: teamsString,
                    score: `${homeScore} - ${awayScore}`,
                    result: homeScore > awayScore ? "win" : "loss"
                });
            }
        }

        // ordina i risultati per data "MM/DD" in modo semplice
        results.sort((a, b) => {
            const [da, ma] = a.date.split("/").map(Number);
            const [db, mb] = b.date.split("/").map(Number);
            const va = ma * 100 + da;
            const vb = mb * 100 + db;
            return va - vb;
        });

        res.status(200).json({
            debug: {
                classificaStatus: classificaRes.status,
                calendarioStatus: calendarioRes.status,
                standingsCount: standings.length,
                finoResultsCount: results.length
            },
            standings,
            results
        });
    } catch (error) {
        res.status(500).json({
            error: String(error)
        });
    }
}
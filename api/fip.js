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
        // Pattern visto nel sorgente che hai incollato:
        // title='Posizione in graduatoria' class='colfrozen'>1
        // class="sq colfrozen">CR Fino Mornasco
        const standingRegex =
            /Posizione in graduatoria['"]?\s+class=['"]colfrozen['"]>(\d+)[\s\S]*?class=["']sq colfrozen["']>([^<\n\r]+)[\s\S]*?Punti subiti di media a gara['"]>([\d.,]+)/gi;

        let standingMatch;
        while ((standingMatch = standingRegex.exec(classificaHtml)) !== null) {
            standings.push({
                position: clean(standingMatch[1]),
                team: clean(standingMatch[2]),
                points: "-"
            });
        }

        // Fallback classifica se il pattern sopra non trova nulla
        if (standings.length === 0) {
            const teamOnlyRegex = /class=["']sq colfrozen["']>([^<\n\r]+)/gi;
            let teamMatch;
            let pos = 1;

            while ((teamMatch = teamOnlyRegex.exec(classificaHtml)) !== null) {
                const teamName = clean(teamMatch[1]);

                if (
                    teamName &&
                    !teamName.toLowerCase().includes("classifica") &&
                    !teamName.toLowerCase().includes("playbasket")
                ) {
                    standings.push({
                        position: String(pos),
                        team: teamName,
                        points: "-"
                    });
                    pos++;
                }
            }
        }

        // Rimuove eventuali duplicati
        const uniqueStandings = [];
        const seenTeams = new Set();

        for (const row of standings) {
            const key = row.team.toLowerCase();
            if (!seenTeams.has(key)) {
                seenTeams.add(key);
                uniqueStandings.push(row);
            }
        }

        // =========================
        // RISULTATI
        // =========================
        // Pattern visto nel testo che hai incollato:
        // 19/10 BT92 Cantù CR Fino Mornasco 42 78
        const resultRegex =
            /(\d{2}\/\d{2})\s+([A-Za-zÀ-ÖØ-öø-ÿ'’. \-]+?)\s+([A-Za-zÀ-ÖØ-öø-ÿ'’. \-]+?)\s+(\d{1,3})\s+(\d{1,3})(?=\s|$)/g;

        let resultMatch;
        while ((resultMatch = resultRegex.exec(calendarioHtml)) !== null) {
            const date = clean(resultMatch[1]);
            const homeTeam = clean(resultMatch[2]);
            const awayTeam = clean(resultMatch[3]);
            const homeScore = clean(resultMatch[4]);
            const awayScore = clean(resultMatch[5]);

            // filtra match chiaramente non validi
            if (
                homeTeam.length < 3 ||
                awayTeam.length < 3 ||
                /^\d+$/.test(homeTeam) ||
                /^\d+$/.test(awayTeam)
            ) {
                continue;
            }

            results.push({
                date,
                teams: `${homeTeam} - ${awayTeam}`,
                score: `${homeScore} - ${awayScore}`,
                result:
                    homeTeam.toLowerCase().includes("fino")
                        ? (parseInt(homeScore, 10) > parseInt(awayScore, 10) ? "win" : "loss")
                        : awayTeam.toLowerCase().includes("fino")
                        ? (parseInt(awayScore, 10) > parseInt(homeScore, 10) ? "win" : "loss")
                        : ""
            });
        }

        // Teniamo solo risultati dove compare Fino
        const finoResults = results.filter(
            (r) => r.teams.toLowerCase().includes("fino")
        );

        res.status(200).json({
            debug: {
                classificaStatus: classificaRes.status,
                calendarioStatus: calendarioRes.status,
                standingsCount: uniqueStandings.length,
                allResultsCount: results.length,
                finoResultsCount: finoResults.length
            },
            standings: uniqueStandings.slice(0, 14),
            results: finoResults
        });
    } catch (error) {
        res.status(500).json({
            error: String(error)
        });
    }
}
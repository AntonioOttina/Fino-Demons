export default async function handler(req, res) {
    try {
        const classificaUrl = "https://m.playbasket.it/lombardia/league.php?lt=2&lf=M&lr=LO&lp=MI&lc=DR4&season=2026&lg=8&mod=st";
        const calendarioUrl = "https://m.playbasket.it/lombardia/league.php?lt=2&lf=M&lr=LO&lp=MI&lc=DR4&season=2026&lg=8&mod=cl";

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
        // CLASSIFICA GENERALE
        // =========================
        // Prende solo il blocco della classifica generale
        const startMarker = "Girone H Divisione Regionale 4 Maschile Lombardia 2025-2026 Classifica";
        const endMarker = "Classifica partite in casa";

        const startIndex = classificaHtml.indexOf(startMarker);
        const endIndex = classificaHtml.indexOf(endMarker);

        let classificaSection = classificaHtml;
        if (startIndex !== -1 && endIndex !== -1 && endIndex > startIndex) {
            classificaSection = classificaHtml.slice(startIndex, endIndex);
        }

        const standingsRowRegex = /<tr class=['"]row_standings['"][\s\S]*?<\/tr>/gi;
        const standingsRows = classificaSection.match(standingsRowRegex) || [];

        for (const row of standingsRows) {
            const positionMatch = row.match(/title=['"]Posizione in graduatoria['"][^>]*class=['"]colfrozen['"]>(\d+)/i);
            const teamMatch = row.match(/class=["']sq colfrozen["'][^>]*>[\s\S]*?<a[^>]*>([^<]+)<\/a>/i);
            const pointsMatch = row.match(/title=['"]Punti in classifica['"][^>]*class=['"]highlighted_data['"]>(\d+)/i);

            if (!positionMatch || !teamMatch || !pointsMatch) {
                continue;
            }

            standings.push({
                position: clean(positionMatch[1]),
                team: clean(teamMatch[1]),
                points: clean(pointsMatch[1])
            });
        }

        // =========================
        // RISULTATI DI FINO
        // =========================
        // Pattern osservato:
        // data-team="15499,15502" class="even asterisk"> 19/10 BT92 Cantù CR Fino Mornasco 42 78

        const finoAliases = [
            "CR Fino Mornasco",
            "Fino Mornasco",
            "Fino Demons"
        ];

        const escapedAliases = finoAliases
            .map(name => name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
            .join("|");

        const rawMatchRegex = /data[- ]team=["'][^"']+["'][^>]*>\s*(\d{2}\/\d{2})\s+([^<]+?)\s+(\d{1,3})\s+(\d{1,3})/gi;

        let rawMatch;
        while ((rawMatch = rawMatchRegex.exec(calendarioHtml)) !== null) {
            const date = clean(rawMatch[1]);
            const teamsText = clean(rawMatch[2]);
            const score1 = parseInt(rawMatch[3], 10);
            const score2 = parseInt(rawMatch[4], 10);

            if (!new RegExp(escapedAliases, "i").test(teamsText)) {
                continue;
            }

            let homeTeam = "";
            let awayTeam = "";

            for (const alias of finoAliases) {
                const idx = teamsText.toLowerCase().indexOf(alias.toLowerCase());

                if (idx !== -1) {
                    const before = teamsText.slice(0, idx).trim();
                    const after = teamsText.slice(idx + alias.length).trim();

                    if (before && !after) {
                        // Fino in trasferta
                        homeTeam = before;
                        awayTeam = alias;
                    } else if (!before && after) {
                        // Fino in casa
                        homeTeam = alias;
                        awayTeam = after;
                    } else if (before && after) {
                        // fallback improbabile
                        homeTeam = before;
                        awayTeam = `${alias} ${after}`.trim();
                    }

                    break;
                }
            }

            if (!homeTeam || !awayTeam) {
                continue;
            }

            let result = "";
            if (/fino/i.test(homeTeam)) {
                result = score1 > score2 ? "win" : "loss";
            } else if (/fino/i.test(awayTeam)) {
                result = score2 > score1 ? "win" : "loss";
            }

            results.push({
                date,
                teams: `${homeTeam} - ${awayTeam}`,
                score: `${score1} - ${score2}`,
                result
            });
        }

        // rimuove eventuali duplicati
        const uniqueResults = [];
        const seenResults = new Set();

        for (const r of results) {
            const key = `${r.date}|${r.teams}|${r.score}`;
            if (!seenResults.has(key)) {
                seenResults.add(key);
                uniqueResults.push(r);
            }
        }

        uniqueResults.sort((a, b) => {
            const [da, ma] = a.date.split("/").map(Number);
            const [db, mb] = b.date.split("/").map(Number);
            return (ma * 100 + da) - (mb * 100 + db);
        });

        res.status(200).json({
            debug: {
                classificaStatus: classificaRes.status,
                calendarioStatus: calendarioRes.status,
                standingsCount: standings.length,
                finoResultsCount: uniqueResults.length
            },
            standings,
            results: uniqueResults
        });
    } catch (error) {
        res.status(500).json({
            error: String(error)
        });
    }
}
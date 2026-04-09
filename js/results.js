async function loadData() {
    try {
        const res = await fetch("/api/fip");
        const data = await res.json();

        // ===== CLASSIFICA =====
        const standingsContainer = document.getElementById("standings-table");

        if (standingsContainer && data.standings) {
            standingsContainer.innerHTML = "";

            data.standings.forEach(team => {
                const row = document.createElement("div");
                row.className = "standings-row";

                row.innerHTML = `
                    <div class="pos">${team.position}</div>
                    <div class="team-name ${team.team.includes("Fino") ? "highlight" : ""}">
                        ${team.team}
                    </div>
                    <div class="points">${team.points}</div>
                `;

                standingsContainer.appendChild(row);
            });
        }

        // ===== RISULTATI =====
        const resultsContainer = document.getElementById("results-list");

        if (resultsContainer && data.results) {
            resultsContainer.innerHTML = "";

            if (data.results.length === 0) {
                resultsContainer.innerHTML = `
                    <div class="match-row">
                        <div>
                            <div class="match-date">Risultati</div>
                            <div class="match-teams">In aggiornamento</div>
                        </div>
                        <div class="match-score">-</div>
                    </div>
                `;
            } else {
                data.results.slice(0, 10).forEach(match => {
                    const row = document.createElement("div");
                    row.className = "match-row";

                    row.innerHTML = `
                        <div>
                            <div class="match-date">${match.date}</div>
                            <div class="match-teams">${match.teams}</div>
                        </div>
                        <div class="match-score">${match.score}</div>
                    `;

                    resultsContainer.appendChild(row);
                });
            }
        }
    } catch (error) {
        console.error(error);
    }
}

loadData();
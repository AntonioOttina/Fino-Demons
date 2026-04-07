const resultsList = document.getElementById("results-list");
const standingsList = document.getElementById("standings-list");

async function loadData() {
    try {
        const res = await fetch("/api/fip");
        const data = await res.json();

        if (resultsList) {
            resultsList.innerHTML = "";

            if (!data.results || data.results.length === 0) {
                resultsList.innerHTML = `
                    <div class="match-row">
                        <div>
                            <div class="match-date">Nessun risultato trovato</div>
                            <div class="match-teams">Controlla il parsing dell'API</div>
                        </div>
                        <div class="match-score">-</div>
                    </div>
                `;
            } else {
                data.results.forEach(match => {
                    const highlightedTeams = match.teams.replace(
                        /CR Fino Mornasco|Fino Demons|Fino Mornasco/gi,
                        '<span class="team-highlight">$&</span>'
                    );

                    const row = document.createElement("div");
                    row.className = `match-row ${match.result || ""}`;

                    row.innerHTML = `
                        <div>
                            <div class="match-date">${match.date}</div>
                            <div class="match-teams">${highlightedTeams}</div>
                        </div>
                        <div class="match-score">${match.score}</div>
                    `;

                    resultsList.appendChild(row);
                });
            }
        }

        if (standingsList) {
            standingsList.innerHTML = "";

            if (!data.standings || data.standings.length === 0) {
                standingsList.innerHTML = `
                    <div class="standings-row">
                        <span>-</span>
                        <span>Nessuna classifica trovata</span>
                        <span>-</span>
                    </div>
                `;
            } else {
                data.standings.forEach(team => {
                    const isFino =
                        team.team.toLowerCase().includes("fino");

                    const row = document.createElement("div");
                    row.className = "standings-row";

                    row.innerHTML = `
                        <span>${team.position}</span>
                        <span class="${isFino ? "team-highlight" : ""}">${team.team}</span>
                        <span>${team.points}</span>
                    `;

                    standingsList.appendChild(row);
                });
            }
        }
    } catch (err) {
        console.error(err);

        if (resultsList) {
            resultsList.innerHTML = `
                <div class="match-row">
                    <div>
                        <div class="match-date">Errore</div>
                        <div class="match-teams">Impossibile caricare i risultati</div>
                    </div>
                    <div class="match-score">!</div>
                </div>
            `;
        }

        if (standingsList) {
            standingsList.innerHTML = `
                <div class="standings-row">
                    <span>!</span>
                    <span>Impossibile caricare la classifica</span>
                    <span>!</span>
                </div>
            `;
        }
    }
}

loadData();
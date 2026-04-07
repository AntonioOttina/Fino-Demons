const resultsList = document.getElementById("results-list");
const standingsList = document.getElementById("standings-list");

async function loadData() {
    try {
        const res = await fetch("/api/fip");
        const data = await res.json();

        // RISULTATI
        if (resultsList) {
            resultsList.innerHTML = "";

            data.results.forEach(match => {
                const row = document.createElement("div");
                row.className = "match-row";

                row.innerHTML = `
                    <div>
                        <div class="match-date">${match.date}</div>
                        <div class="match-teams">${match.teams}</div>
                    </div>
                    <div class="match-score">${match.score}</div>
                `;

                resultsList.appendChild(row);
            });
        }

        // CLASSIFICA
        if (standingsList) {
            standingsList.innerHTML = "";

            data.standings.forEach((team, index) => {
                const row = document.createElement("div");
                row.className = "standings-row";

                row.innerHTML = `
                    <span>${index + 1}</span>
                    <span>${team.team}</span>
                    <span>${team.points}</span>
                `;

                standingsList.appendChild(row);
            });
        }

    } catch (err) {
        console.error(err);
    }
}

loadData();
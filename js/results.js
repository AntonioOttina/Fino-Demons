const resultsList = document.getElementById("results-list");
const standingsList = document.getElementById("standings-list");

async function loadData() {
    try {
        const res = await fetch("/api/fip");
        const data = await res.json();

        // ===== RISULTATI =====
        if (resultsList) {
            resultsList.innerHTML = "";

            data.results.forEach(match => {
                const highlightedTeams = match.teams.replaceAll(
                    "Fino Demons",
                    '<span class="team-highlight">Fino Demons</span>'
                );

                const row = document.createElement("div");
                row.className = `match-row ${match.result}`;

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

        // ===== CLASSIFICA =====
        if (standingsList) {
            standingsList.innerHTML = "";

            data.standings.forEach(team => {
                const isFino = team.team.includes("Fino");

                const row = document.createElement("div");
                row.className = "standings-row";

                row.innerHTML = `
                    <span>${team.position}</span>
                    <span class="${isFino ? "team-highlight" : ""}">
                        ${team.team}
                    </span>
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
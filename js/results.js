async function loadData() {
    const res = await fetch("/api/fip");
    const data = await res.json();

    // =========================
    // CLASSIFICA (OK)
    // =========================
    const standingsContainer = document.getElementById("standings-table");

    if (standingsContainer && data.standings) {
        standingsContainer.innerHTML = "";

        data.standings.forEach(team => {
            const row = document.createElement("div");
            row.className = "standings-row";

            row.innerHTML = `
                <div class="pos">${team.position}</div>
                <div class="team-name ${team.team.toLowerCase().includes("fino") ? "highlight" : ""}">
                    ${team.team}
                </div>
                <div class="points">${team.points}</div>
            `;

            standingsContainer.appendChild(row);
        });
    }

    // =========================
    // RISULTATI
    // =========================
    const resultsContainer = document.getElementById("results-list");

    if (resultsContainer && data.results) {
        resultsContainer.innerHTML = "";

        data.results.forEach(match => {

            const isFinoHome = match.teams.toLowerCase().includes("fino");

            // split squadre
            const teamsSplit = match.teams.split(" - ");
            const team1 = teamsSplit[0] || "";
            const team2 = teamsSplit[1] || "";

            // punteggio
            let scoreClass = "";
            let scoreText = match.score;

            if (match.score !== "VS") {
                const [s1, s2] = match.score.split("-").map(n => parseInt(n.trim()));

                if (team1.toLowerCase().includes("fino")) {
                    scoreClass = s1 > s2 ? "win" : "loss";
                } else if (team2.toLowerCase().includes("fino")) {
                    scoreClass = s2 > s1 ? "win" : "loss";
                }
            }

            const row = document.createElement("div");
            row.className = "match-row";

            row.innerHTML = `
                <div class="match-date">${match.date}</div>

                <div class="match-teams">
                    <span class="${team1.toLowerCase().includes("fino") ? "highlight" : ""}">
                        ${team1}
                    </span>
                    -
                    <span class="${team2.toLowerCase().includes("fino") ? "highlight" : ""}">
                        ${team2}
                    </span>
                </div>

                <div class="match-score ${scoreClass}">
                    ${scoreText}
                </div>
            `;

            resultsContainer.appendChild(row);
        });
    }

    // =========================
    // PROSSIMA PARTITA (BOX FIGO)
    // =========================
    const nextMatchContainer = document.getElementById("next-match");

    if (nextMatchContainer && data.results) {

        const next = data.results.find(m => m.score === "VS");

        if (next) {
            nextMatchContainer.innerHTML = `
                <div class="next-match-card">
                    <div class="next-match-title">PROSSIMA PARTITA</div>

                    <div class="next-match-teams">
                        ${next.teams}
                    </div>

                    <div class="next-match-date">
                        ${next.date}
                    </div>
                </div>
            `;
        }
    }
}

loadData();
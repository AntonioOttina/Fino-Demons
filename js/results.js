async function loadData() {
    const res = await fetch("/api/fip");
    const data = await res.json();

    // ===== CLASSIFICA (già ok) =====
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

        data.results.slice(0, 10).forEach(match => {
            const row = document.createElement("div");
            row.className = "match-row";

            row.innerHTML = `
                <div class="match-teams">
                    ${match.teams}
                </div>
                <div class="match-score">
                    ${match.score}
                </div>
            `;

            resultsContainer.appendChild(row);
        });
    }

    // ===== PROSSIMA PARTITA =====
    const nextMatchContainer = document.getElementById("next-match");

    if (nextMatchContainer && data.results && data.results.length > 0) {
        const next = data.results.find(m => !m.score.includes("0-0"));

        if (next) {
            nextMatchContainer.innerHTML = `
                <div class="next-match-card">
                    <div class="next-match-label">Prossima partita</div>
                    <div class="next-match-details">
                        <h3>${next.teams}</h3>
                        <p>${next.score}</p>
                    </div>
                </div>
            `;
        }
    }
}

loadData();
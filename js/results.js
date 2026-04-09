async function loadData() {
    const res = await fetch("/api/fip");
    const data = await res.json();

    // =========================
    // CLASSIFICA
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
    // PROSSIMA PARTITA
    // =========================
    const nextMatchContainer = document.getElementById("next-match");

    if (nextMatchContainer && data.results) {
        const upcoming = data.results
            .filter(match => match.status === "upcoming" && match.dateObj)
            .sort((a, b) => new Date(a.dateObj) - new Date(b.dateObj));

        const next = upcoming[0];

        if (next) {
            const [team1, team2] = next.teams.split(" - ").map(t => t.trim());

            nextMatchContainer.innerHTML = `
                <div class="next-match-card">
                    <div class="next-match-label">Prossima partita</div>
                    <div class="next-match-teams">
                        <span class="${team1.toLowerCase().includes("fino") ? "team-highlight" : ""}">${team1}</span>
                        <span class="next-match-vs">vs</span>
                        <span class="${team2.toLowerCase().includes("fino") ? "team-highlight" : ""}">${team2}</span>
                    </div>
                    <div class="next-match-info">
                        <span><i class="fa-regular fa-calendar"></i> ${next.date}</span>
                        <span><i class="fa-regular fa-clock"></i> ${next.time}</span>
                    </div>
                </div>
            `;
        } else {
            nextMatchContainer.innerHTML = "";
        }
    }

    // =========================
    // RISULTATI + CALENDARIO
    // =========================
    const resultsContainer = document.getElementById("results-list");

    if (resultsContainer && data.results) {
        resultsContainer.innerHTML = "";

        const ordered = [...data.results].sort((a, b) => {
            if (!a.dateObj || !b.dateObj) return 0;
            return new Date(a.dateObj) - new Date(b.dateObj);
        });

        ordered.forEach(match => {
            const [team1, team2] = match.teams.split(" - ").map(t => t.trim());

            const row = document.createElement("div");
            row.className = "match-row";

            row.innerHTML = `
                <div class="match-main">
                    <div class="match-date">${match.date}</div>
                    <div class="match-teams">
                        <span class="${team1.toLowerCase().includes("fino") ? "team-highlight" : ""}">${team1}</span>
                        <span class="match-separator"> - </span>
                        <span class="${team2.toLowerCase().includes("fino") ? "team-highlight" : ""}">${team2}</span>
                    </div>
                </div>

                <div class="match-side">
                    ${
                        match.status === "played"
                            ? `<div class="match-score ${match.result}">${match.score}</div>`
                            : `<div class="match-time">${match.time}</div>`
                    }
                </div>
            `;

            resultsContainer.appendChild(row);
        });
    }
}

loadData();
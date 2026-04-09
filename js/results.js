async function loadData() {
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

    // ===== BOX PROSSIMA PARTITA =====
    const nextMatchContainer = document.getElementById("next-match");

    if (nextMatchContainer && data.upcoming && data.upcoming.length > 0) {
        const next = data.upcoming[0];
        const [team1, team2] = next.teams.split(" - ").map(t => t.trim());

        nextMatchContainer.innerHTML = `
            <div class="next-match-card">
                <div class="next-match-label">Prossima partita</div>

                <div class="next-match-teams">
                    <span class="${team1.includes("Fino") ? "team-highlight-light" : ""}">${team1}</span>
                    <span class="next-match-vs">vs</span>
                    <span class="${team2.includes("Fino") ? "team-highlight-light" : ""}">${team2}</span>
                </div>

                <div class="next-match-info">
                    <div class="match-badge">
                        <i class="fa-regular fa-calendar"></i>
                        ${next.date}
                    </div>
                    <div class="match-badge">
                        <i class="fa-regular fa-clock"></i>
                        ${next.time || "Da definire"}
                    </div>
                    <div class="match-badge">
                        <i class="fa-solid fa-location-dot"></i>
                        ${next.where}
                    </div>
                </div>
            </div>
        `;
    }

    // ===== RISULTATI GIA' GIOCATI =====
    const resultsContainer = document.getElementById("results-list");

    if (resultsContainer) {
        resultsContainer.innerHTML = "";

        const playedMatches = data.results ? [...data.results] : [];
        playedMatches.sort((a, b) => {
            const [dayA, monthA] = a.date.split("/").map(Number);
            const [dayB, monthB] = b.date.split("/").map(Number);
            const yearA = monthA >= 10 ? 2025 : 2026;
            const yearB = monthB >= 10 ? 2025 : 2026;
            return new Date(yearB, monthB - 1, dayB) - new Date(yearA, monthA - 1, dayA);
        });

        if (playedMatches.length === 0) {
            resultsContainer.innerHTML = `<div class="match-row"><div class="match-main">Nessun risultato disponibile</div></div>`;
        } else {
            playedMatches.forEach(match => {
                const [team1, team2] = match.teams.split(" - ").map(t => t.trim());

                const row = document.createElement("div");
                row.className = "match-row";

                row.innerHTML = `
                    <div class="match-main">
                        <div class="match-date">${match.date}</div>

                        <div class="match-teams">
                            <span class="${team1.includes("Fino") ? "team-highlight" : ""}">${team1}</span>
                            <span class="match-separator"> - </span>
                            <span class="${team2.includes("Fino") ? "team-highlight" : ""}">${team2}</span>
                        </div>

                        <div class="match-meta">
                            <div class="match-badge">
                                <i class="fa-solid fa-location-dot"></i>
                                ${match.where}
                            </div>
                        </div>
                    </div>

                    <div class="match-side">
                        <div class="match-score ${match.result}">
                            ${match.score}
                        </div>
                    </div>
                `;

                resultsContainer.appendChild(row);
            });
        }
    }

    // ===== PROSSIMI INCONTRI =====
    const upcomingContainer = document.getElementById("upcoming-list");

    if (upcomingContainer) {
        upcomingContainer.innerHTML = "";

        const upcomingMatches = data.upcoming ? [...data.upcoming] : [];

        if (upcomingMatches.length === 0) {
            upcomingContainer.innerHTML = `<div class="match-row"><div class="match-main">Nessun incontro disponibile</div></div>`;
        } else {
            upcomingMatches.forEach(match => {
                const [team1, team2] = match.teams.split(" - ").map(t => t.trim());

                const row = document.createElement("div");
                row.className = "match-row";

                row.innerHTML = `
                    <div class="match-main">
                        <div class="match-date">${match.date}</div>

                        <div class="match-teams">
                            <span class="${team1.includes("Fino") ? "team-highlight" : ""}">${team1}</span>
                            <span class="match-separator"> - </span>
                            <span class="${team2.includes("Fino") ? "team-highlight" : ""}">${team2}</span>
                        </div>

                        <div class="match-meta">
                            <div class="match-badge">
                                <i class="fa-regular fa-clock"></i>
                                ${match.time || "Da definire"}
                            </div>
                            <div class="match-badge">
                                <i class="fa-solid fa-location-dot"></i>
                                ${match.where}
                            </div>
                        </div>
                    </div>

                    <div class="match-side">
                        <div class="match-time">
                            ${match.time || "--:--"}
                        </div>
                    </div>
                `;

                upcomingContainer.appendChild(row);
            });
        }
    }
}

loadData();
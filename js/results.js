function parseMatchDate(dateStr) {
    if (!dateStr) return null;

    const [day, month] = dateStr.split("/").map(Number);
    if (!day || !month) return null;

    const year = month >= 10 ? 2025 : 2026;
    return new Date(year, month - 1, day, 0, 0, 0, 0);
}

function parseMatchTime(timeStr) {
    if (!timeStr || !timeStr.includes(":")) {
        return { hours: 23, minutes: 59 };
    }

    const [hours, minutes] = timeStr.split(":").map(Number);
    return {
        hours: Number.isFinite(hours) ? hours : 23,
        minutes: Number.isFinite(minutes) ? minutes : 59
    };
}

function buildMatchDateTime(match) {
    const baseDate = parseMatchDate(match.date);
    if (!baseDate) return null;

    const { hours, minutes } = parseMatchTime(match.time);
    return new Date(
        baseDate.getFullYear(),
        baseDate.getMonth(),
        baseDate.getDate(),
        hours,
        minutes,
        0,
        0
    );
}

function renderTeams(teams) {
    const [team1 = "", team2 = ""] = teams.split(" - ").map(t => t.trim());

    return `
        <span class="${team1.toLowerCase().includes("fino") ? "team-highlight" : ""}">${team1}</span>
        <span class="match-separator"> - </span>
        <span class="${team2.toLowerCase().includes("fino") ? "team-highlight" : ""}">${team2}</span>
    `;
}

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
                <div class="team-name ${team.team.toLowerCase().includes("fino") ? "highlight" : ""}">
                    ${team.team}
                </div>
                <div class="points">${team.points}</div>
            `;

            standingsContainer.appendChild(row);
        });
    }

    const allMatches = Array.isArray(data.results) ? [...data.results] : [];
    const now = new Date();

    const playedMatches = allMatches
        .filter(match => match.status === "played")
        .sort((a, b) => {
            const da = buildMatchDateTime(a);
            const db = buildMatchDateTime(b);
            return db - da;
        });

    const upcomingMatches = allMatches
        .filter(match => {
            if (match.status !== "upcoming") return false;
            const d = buildMatchDateTime(match);
            return d && d >= now;
        })
        .sort((a, b) => {
            const da = buildMatchDateTime(a);
            const db = buildMatchDateTime(b);
            return da - db;
        });

    // ===== PROSSIMA PARTITA =====
    const nextMatchContainer = document.getElementById("next-match");

    if (nextMatchContainer) {
        const next = upcomingMatches[0];

        if (next) {
            const [team1 = "", team2 = ""] = next.teams.split(" - ").map(t => t.trim());

            nextMatchContainer.innerHTML = `
                <div class="next-match-card">
                    <span class="next-match-label">
                        <i class="fa-regular fa-calendar-check"></i> Prossima Partita
                    </span>

                    <div class="next-match-details">
                        <h3>
                            <span class="${team1.toLowerCase().includes("fino") ? "team-highlight-light" : ""}">${team1}</span>
                            <span class="next-match-vs">vs</span>
                            <span class="${team2.toLowerCase().includes("fino") ? "team-highlight-light" : ""}">${team2}</span>
                        </h3>

                        <div class="next-match-info">
                            <span><i class="fa-regular fa-clock"></i> ${next.date} - Ore ${next.time || "--:--"}</span>
                            <span><i class="fa-solid fa-location-dot"></i> ${next.where}</span>
                        </div>
                    </div>

                    <a href="contatti.html" class="btn btn-next-match">Vieni a sostenerci sugli spalti</a>
                </div>
            `;
        } else {
            nextMatchContainer.innerHTML = "";
        }
    }

    // ===== RISULTATI GIOCATI =====
    const resultsContainer = document.getElementById("results-list");

    if (resultsContainer) {
        resultsContainer.innerHTML = "";

        if (playedMatches.length === 0) {
            resultsContainer.innerHTML = `
                <div class="match-row">
                    <div class="match-main">
                        <div class="match-date">Nessun risultato disponibile</div>
                        <div class="match-teams">In aggiornamento</div>
                    </div>
                    <div class="match-side">
                        <div class="match-score">-</div>
                    </div>
                </div>
            `;
        } else {
            playedMatches.forEach(match => {
                const row = document.createElement("div");
                row.className = "match-row";

                row.innerHTML = `
                    <div class="match-main">
                        <div class="match-date">${match.date} • ${match.where}</div>
                        <div class="match-teams">${renderTeams(match.teams)}</div>
                    </div>

                    <div class="match-side">
                        <div class="match-score ${match.result || ""}">
                            ${match.score}
                        </div>
                    </div>
                `;

                resultsContainer.appendChild(row);
            });
        }
    }

    // ===== NOTA PROSSIMA TRASFERTA =====
    const nextAwayNote = document.getElementById("next-away-note");

    if (nextAwayNote) {
        const nextAway = upcomingMatches.find(match => (match.where || "").toLowerCase().includes("trasferta"));

        if (nextAway) {
            const opponent = nextAway.teams
                .replace("Fino Demons - ", "")
                .replace(" - Fino Demons", "");

            nextAwayNote.innerHTML = `<em>Prossima trasferta: ${nextAway.date} alle ${nextAway.time || "--:--"} contro ${opponent}.</em>`;
        } else {
            nextAwayNote.innerHTML = "";
        }
    }
}

loadData();
const STORAGE_KEY = "fino_demons_matches";

function getSavedMatches() {
    try {
        return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
    } catch {
        return [];
    }
}

function parseIsoDate(isoDate) {
    const d = new Date(isoDate);
    d.setHours(0, 0, 0, 0);
    return d;
}

function renderStandings(standings) {
    const standingsContainer = document.getElementById("standings-table");
    if (!standingsContainer) return;

    standingsContainer.innerHTML = "";

    standings.forEach(team => {
        const row = document.createElement("div");
        row.className = "standings-row";

        row.innerHTML = `
            <div class="pos">${team.position}</div>
            <div class="team-name ${String(team.team).includes("Fino") ? "highlight" : ""}">
                ${team.team}
            </div>
            <div class="points">${team.points}</div>
        `;

        standingsContainer.appendChild(row);
    });
}

function renderResults(matches) {
    const resultsContainer = document.getElementById("results-list");
    if (!resultsContainer) return;

    const played = matches
        .filter(match => match.status === "played")
        .sort((a, b) => parseIsoDate(b.isoDate) - parseIsoDate(a.isoDate));

    if (!played.length) {
        resultsContainer.innerHTML = `
            <div class="match-row">
                <div class="match-main">
                    <div class="match-teams">Nessun risultato disponibile.</div>
                </div>
            </div>
        `;
        return;
    }

    resultsContainer.innerHTML = played.map(match => {
        const parts = match.teams.split(" - ");
        const team1 = parts[0] || "";
        const team2 = parts[1] || "";

        const scoreClass =
            match.result === "win"
                ? "match-score win"
                : match.result === "loss"
                ? "match-score loss"
                : "match-score";

        return `
            <div class="match-row">
                <div class="match-main">
                    <div class="match-date">${match.date}</div>
                    <div class="match-teams">
                        <span class="${team1 === "Fino Demons" ? "team-highlight" : ""}">${team1}</span>
                        <span class="match-separator"> - </span>
                        <span class="${team2 === "Fino Demons" ? "team-highlight" : ""}">${team2}</span>
                    </div>
                    <div class="match-meta">
                        <span class="match-badge">
                            <i class="fa-regular fa-clock"></i>
                            ${match.time}
                        </span>
                        <span class="match-badge">
                            <i class="fa-solid fa-location-dot"></i>
                            ${match.where}
                        </span>
                    </div>
                </div>
                <div class="match-side">
                    <div class="${scoreClass}">${match.score}</div>
                </div>
            </div>
        `;
    }).join("");
}

function renderNextMatch(matches) {
    const nextMatchContainer = document.getElementById("next-match");
    if (!nextMatchContainer) return;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const upcoming = matches
        .filter(match => match.status === "upcoming" && parseIsoDate(match.isoDate) >= today)
        .sort((a, b) => parseIsoDate(a.isoDate) - parseIsoDate(b.isoDate));

    if (!upcoming.length) {
        nextMatchContainer.innerHTML = "";
        return;
    }

    const next = upcoming[0];
    const parts = next.teams.split(" - ");
    const team1 = parts[0] || "";
    const team2 = parts[1] || "";

    nextMatchContainer.innerHTML = `
        <div class="next-match-card">
            <div class="next-match-label">Prossima partita</div>

            <div class="next-match-teams">
                <span class="${team1 === "Fino Demons" ? "team-highlight-light" : ""}">${team1}</span>
                <span class="next-match-vs">vs</span>
                <span class="${team2 === "Fino Demons" ? "team-highlight-light" : ""}">${team2}</span>
            </div>

            <div class="next-match-info">
                <span class="match-badge">
                    <i class="fa-regular fa-calendar"></i>
                    ${next.date}
                </span>
                <span class="match-badge">
                    <i class="fa-regular fa-clock"></i>
                    ${next.time}
                </span>
                <span class="match-badge">
                    <i class="fa-solid fa-location-dot"></i>
                    ${next.where}
                </span>
            </div>
        </div>
    `;
}

async function loadData() {
    try {
        const res = await fetch("/api/fip");
        const data = await res.json();

        renderStandings(data.standings || []);

        const matches = getSavedMatches();
        renderResults(matches);
        renderNextMatch(matches);
    } catch (error) {
        console.error("Errore caricamento dati:", error);
    }
}

loadData();
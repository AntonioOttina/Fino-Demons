const STORAGE_KEY = "fino_demons_matches";
const FEATURED_KEY = "fino_demons_featured_match";
const FINO_NAME = "Fino Demons";
const HOME_LABEL = "In Casa · Palestra Comunale, Via Leonardo da Vinci 12 - Fino Mornasco";
const AWAY_LABEL = "Trasferta";

function getStoredMatches() {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    try {
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? parsed : [];
    } catch {
        return [];
    }
}

function getFeaturedMatchId() {
    return localStorage.getItem(FEATURED_KEY) || "";
}

function normalizeDate(dateStr) {
    const d = new Date(dateStr + "T00:00:00");
    if (Number.isNaN(d.getTime())) return null;
    return d;
}

function normalizeDateTime(dateStr, timeStr) {
    const safeTime = timeStr && timeStr.trim() ? timeStr : "00:00";
    const d = new Date(`${dateStr}T${safeTime}:00`);
    if (Number.isNaN(d.getTime())) return null;
    return d;
}

function formatItalianDate(dateStr) {
    const d = normalizeDate(dateStr);
    if (!d) return "";
    return d.toLocaleDateString("it-IT", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric"
    });
}

function buildTeamsText(match) {
    return match.homeAway === "home"
        ? `${FINO_NAME} - ${match.opponent}`
        : `${match.opponent} - ${FINO_NAME}`;
}

function buildWhereText(match) {
    return match.homeAway === "home" ? HOME_LABEL : AWAY_LABEL;
}

function buildScore(match) {
    if (match.status !== "played") return "";
    if (match.finoScore === "" || match.oppScore === "" || match.finoScore == null || match.oppScore == null) return "";
    return `${match.finoScore} - ${match.oppScore}`;
}

function getResultClass(match) {
    if (match.status !== "played") return "";
    const fino = Number(match.finoScore);
    const opp = Number(match.oppScore);
    if (Number.isNaN(fino) || Number.isNaN(opp)) return "";
    if (fino > opp) return "win";
    if (fino < opp) return "loss";
    return "";
}

function sortMatches(matches) {
    return [...matches].sort((a, b) => {
        const da = normalizeDateTime(a.date, a.time);
        const db = normalizeDateTime(b.date, b.time);
        return (da?.getTime() || 0) - (db?.getTime() || 0);
    });
}

function getNextAutomaticMatch(matches) {
    const now = new Date();
    return sortMatches(matches).find(match => {
        const matchDate = normalizeDateTime(match.date, match.time);
        return match.status !== "played" && matchDate && matchDate >= now;
    }) || null;
}

function getFeaturedOrNextMatch(matches) {
    const featuredId = getFeaturedMatchId();
    if (featuredId) {
        const featured = matches.find(m => m.id === featuredId);
        if (featured) return featured;
    }
    return getNextAutomaticMatch(matches);
}

function renderNextMatch(matches) {
    const container = document.getElementById("next-match");
    if (!container) return;

    const nextMatch = getFeaturedOrNextMatch(matches);

    if (!nextMatch) {
        container.innerHTML = `
            <div class="next-match-card">
                <div class="next-match-label">Prossima partita</div>
                <div class="next-match-teams">Nessuna partita disponibile</div>
            </div>
        `;
        return;
    }

    container.innerHTML = `
        <div class="next-match-card">
            <div class="next-match-label">Prossima partita</div>
            <div class="next-match-teams">
                ${nextMatch.homeAway === "home"
                    ? `<span class="team-highlight-light">${FINO_NAME}</span> <span class="next-match-vs">vs</span> ${nextMatch.opponent}`
                    : `${nextMatch.opponent} <span class="next-match-vs">vs</span> <span class="team-highlight-light">${FINO_NAME}</span>`
                }
            </div>

            <div class="next-match-info">
                <span class="match-badge"><i class="fa-regular fa-calendar"></i> ${formatItalianDate(nextMatch.date)}</span>
                <span class="match-badge"><i class="fa-regular fa-clock"></i> ${nextMatch.time || "--:--"}</span>
                <span class="match-badge"><i class="fa-solid fa-location-dot"></i> ${buildWhereText(nextMatch)}</span>
            </div>
        </div>
    `;
}

function renderResults(matches) {
    const container = document.getElementById("results-list");
    if (!container) return;

    const ordered = sortMatches(matches);

    if (!ordered.length) {
        container.innerHTML = `<div class="empty-state">Nessuna partita disponibile.</div>`;
        return;
    }

    container.innerHTML = "";

    ordered.forEach(match => {
        const resultClass = getResultClass(match);
        const teams = buildTeamsText(match);
        const score = buildScore(match);
        const where = buildWhereText(match);

        const row = document.createElement("div");
        row.className = "match-row";

        row.innerHTML = `
            <div class="match-main">
                <div class="match-date">${formatItalianDate(match.date)}</div>
                <div class="match-teams">
                    ${match.homeAway === "home"
                        ? `<span class="team-highlight">${FINO_NAME}</span> <span class="match-separator">-</span> ${match.opponent}`
                        : `${match.opponent} <span class="match-separator">-</span> <span class="team-highlight">${FINO_NAME}</span>`
                    }
                </div>
                <div class="match-meta">
                    <span class="match-badge"><i class="fa-regular fa-clock"></i> ${match.time || "--:--"}</span>
                    <span class="match-badge"><i class="fa-solid fa-location-dot"></i> ${where}</span>
                </div>
            </div>

            <div class="match-side">
                ${match.status === "played"
                    ? `<div class="match-score ${resultClass}">${score}</div>`
                    : `<div class="match-time">Da giocare</div>`
                }
            </div>
        `;

        container.appendChild(row);
    });
}

function renderStandings(data) {
    const standingsContainer = document.getElementById("standings-table");
    if (!standingsContainer || !data?.standings) return;

    standingsContainer.innerHTML = "";

    data.standings.forEach(team => {
        const row = document.createElement("div");
        row.className = "standings-row";

        const isFino = team.team.toLowerCase().includes("fino");

        row.innerHTML = `
            <div class="pos">${team.position}</div>
            <div class="team-name ${isFino ? "highlight" : ""}">
                ${team.team}
            </div>
            <div class="points">${team.points}</div>
        `;

        standingsContainer.appendChild(row);
    });
}

async function loadData() {
    const matches = getStoredMatches();

    renderNextMatch(matches);
    renderResults(matches);

    try {
        const res = await fetch("/api/fip");
        const data = await res.json();
        renderStandings(data);
    } catch {
        const standingsContainer = document.getElementById("standings-table");
        if (standingsContainer) {
            standingsContainer.innerHTML = `<div class="empty-state">Classifica non disponibile.</div>`;
        }
    }
}

loadData();
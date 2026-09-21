const FINO_NAME = "Fino Demons";

const HOME_ADDRESS =
    "In casa · Palestra Comunale, Via Leonardo da Vinci 12 - Fino Mornasco (CO)";

const LEGACY_STORAGE_KEYS = [
    "fino_demons_matches",
    "fino_demons_featured_match",
    "fino_admin_logged"
];

// Il vecchio sistema locale non viene più usato.
LEGACY_STORAGE_KEYS.forEach(key => localStorage.removeItem(key));

function escapeHtml(value) {
    return String(value ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}

function formatItalianDate(dateStr) {
    if (!dateStr) return "";

    const date = new Date(`${dateStr}T00:00:00`);

    if (Number.isNaN(date.getTime())) return dateStr;

    return date.toLocaleDateString("it-IT", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric"
    });
}

function formatTime(value) {
    if (!value) return "--:--";
    return String(value).slice(0, 5);
}

function teamHtml(teamName) {
    const safeName = escapeHtml(teamName);

    if (teamName === FINO_NAME) {
        return `<span class="team-highlight">${safeName}</span>`;
    }

    return safeName;
}

function renderNextMatch(match) {
    const container = document.getElementById("next-match");
    if (!container) return;

    if (!match) {
        container.innerHTML = `
            <div class="next-match-card">
                <div class="next-match-label">Prossima partita</div>
                <div class="next-match-teams">
                    Nessuna partita programmata
                </div>
            </div>
        `;
        return;
    }

    const finoHome = match.home_team === FINO_NAME;

    const location = finoHome
        ? HOME_ADDRESS
        : "Trasferta";

    container.innerHTML = `
        <div class="next-match-card">
            <div class="next-match-label">Prossima partita</div>

            <div class="next-match-teams">
                ${
                    finoHome
                        ? `<span class="team-highlight-light">${escapeHtml(FINO_NAME)}</span>
                           <span class="next-match-vs">vs</span>
                           ${escapeHtml(match.away_team)}`
                        : `${escapeHtml(match.home_team)}
                           <span class="next-match-vs">vs</span>
                           <span class="team-highlight-light">${escapeHtml(FINO_NAME)}</span>`
                }
            </div>

            <div class="next-match-info">
                <span class="match-badge">
                    <i class="fa-regular fa-calendar"></i>
                    ${formatItalianDate(match.match_date)}
                </span>

                <span class="match-badge">
                    <i class="fa-regular fa-clock"></i>
                    ${formatTime(match.match_time)}
                </span>

                <span class="match-badge">
                    <i class="fa-solid fa-location-dot"></i>
                    ${escapeHtml(location)}
                </span>
            </div>
        </div>
    `;
}

function getFinoResultClass(match) {
    const finoIsHome = match.home_team === FINO_NAME;
    const finoIsAway = match.away_team === FINO_NAME;

    if (!finoIsHome && !finoIsAway) return "";

    const finoScore = finoIsHome
        ? Number(match.home_score)
        : Number(match.away_score);

    const opponentScore = finoIsHome
        ? Number(match.away_score)
        : Number(match.home_score);

    if (finoScore > opponentScore) return "win";
    if (finoScore < opponentScore) return "loss";

    return "";
}

function getResultMeta(match) {
    if (match.home_team === FINO_NAME) {
        return "Fino in casa";
    }

    if (match.away_team === FINO_NAME) {
        return "Fino in trasferta";
    }

    return "Partita del girone";
}

function renderResults(results) {
    const container = document.getElementById("results-list");
    if (!container) return;

    if (!Array.isArray(results) || !results.length) {
        container.innerHTML = `
            <div class="empty-state">
                Nessun risultato inserito per la nuova stagione.
            </div>
        `;
        return;
    }

    container.innerHTML = results.map(match => {
        const resultClass = getFinoResultClass(match);

        return `
            <div class="match-row">
                <div class="match-main">

                    <div class="match-date">
                        ${formatItalianDate(match.match_date)}
                    </div>

                    <div class="match-teams">
                        ${teamHtml(match.home_team)}
                        <span class="match-separator">-</span>
                        ${teamHtml(match.away_team)}
                    </div>

                    <div class="match-meta">
                        <span class="match-badge">
                            <i class="fa-solid fa-basketball"></i>
                            ${escapeHtml(getResultMeta(match))}
                        </span>
                    </div>
                </div>

                <div class="match-side">
                    <div class="match-score ${resultClass}">
                        ${escapeHtml(match.home_score)} - ${escapeHtml(match.away_score)}
                    </div>
                </div>
            </div>
        `;
    }).join("");
}

function signedNumber(value) {
    const number = Number(value);

    if (number > 0) return `+${number}`;
    return String(number);
}

function renderStandings(standings) {
    const container = document.getElementById("standings-table");
    if (!container) return;

    if (!Array.isArray(standings) || !standings.length) {
        container.innerHTML = `
            <div class="empty-state">
                Classifica non disponibile.
            </div>
        `;
        return;
    }

    const header = `
        <div class="standings-row-v2 standings-head-v2">
            <div>#</div>
            <div>Squadra</div>
            <div>PG</div>
            <div>V</div>
            <div>P</div>
            <div>PF</div>
            <div>PS</div>
            <div>+/-</div>
            <div>Pt</div>
        </div>
    `;

    const rows = standings.map(team => {
        const isFino = team.team === FINO_NAME;

        return `
            <div class="standings-row-v2 ${isFino ? "standings-fino-row" : ""}">
                <div class="pos">${escapeHtml(team.position)}</div>

                <div class="team-name ${isFino ? "highlight" : ""}">
                    ${escapeHtml(team.team)}
                </div>

                <div>${escapeHtml(team.played)}</div>
                <div>${escapeHtml(team.wins)}</div>
                <div>${escapeHtml(team.losses)}</div>
                <div>${escapeHtml(team.pointsFor)}</div>
                <div>${escapeHtml(team.pointsAgainst)}</div>
                <div>${escapeHtml(signedNumber(team.difference))}</div>
                <div class="points">${escapeHtml(team.points)}</div>
            </div>
        `;
    }).join("");

    container.innerHTML = `
        <div class="standings-inner-v2">
            ${header}
            ${rows}
        </div>
    `;
}

async function loadData() {
    const nextContainer = document.getElementById("next-match");
    const resultsContainer = document.getElementById("results-list");
    const standingsContainer = document.getElementById("standings-table");

    try {
        const response = await fetch("/api/public-data", {
            cache: "no-store"
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || "Errore durante il caricamento");
        }

        renderNextMatch(data.nextMatch || null);
        renderResults(data.results || []);
        renderStandings(data.standings || []);
    } catch (error) {
        console.error(error);

        if (nextContainer) {
            nextContainer.innerHTML = `
                <div class="next-match-card">
                    <div class="next-match-label">Prossima partita</div>
                    <div class="next-match-teams">Dati non disponibili</div>
                </div>
            `;
        }

        if (resultsContainer) {
            resultsContainer.innerHTML = `
                <div class="empty-state">
                    Impossibile caricare i risultati.
                </div>
            `;
        }

        if (standingsContainer) {
            standingsContainer.innerHTML = `
                <div class="empty-state">
                    Impossibile caricare la classifica.
                </div>
            `;
        }
    }
}

loadData();

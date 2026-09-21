const FINO_NAME = "Fino Demons";
const LEGACY_STORAGE_KEYS = [
    "fino_demons_matches",
    "fino_demons_featured_match",
    "fino_admin_logged"
];

const state = {
    teams: [],
    matches: []
};

// Pulizia definitiva del vecchio sistema localStorage.
LEGACY_STORAGE_KEYS.forEach(key => localStorage.removeItem(key));

function escapeHtml(value) {
    return String(value ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}

function formatDate(dateStr) {
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

async function apiRequest(url, options = {}) {
    const response = await fetch(url, {
        credentials: "same-origin",
        ...options,
        headers: {
            ...(options.body ? { "Content-Type": "application/json" } : {}),
            ...(options.headers || {})
        }
    });

    let payload = {};

    try {
        payload = await response.json();
    } catch {
        payload = {};
    }

    if (!response.ok) {
        const error = new Error(payload.error || "Errore nella richiesta");
        error.status = response.status;
        error.details = payload.details || "";
        throw error;
    }

    return payload;
}

function showStatus(message, type = "ok") {
    const box = document.getElementById("admin-status");

    box.textContent = message;
    box.className = `admin-status ${type}`;

    window.clearTimeout(showStatus.timer);

    showStatus.timer = window.setTimeout(() => {
        box.classList.add("hidden");
    }, 4500);
}

function showLogin() {
    document.getElementById("admin-login-box").classList.remove("hidden");
    document.getElementById("admin-panel").classList.add("hidden");
}

function showPanel() {
    document.getElementById("admin-login-box").classList.add("hidden");
    document.getElementById("admin-panel").classList.remove("hidden");
}

function populateSelect(select, teams, placeholder) {
    select.innerHTML = "";

    const firstOption = document.createElement("option");
    firstOption.value = "";
    firstOption.textContent = placeholder;
    select.appendChild(firstOption);

    teams.forEach(team => {
        const option = document.createElement("option");
        option.value = team.name;
        option.textContent = team.name;
        select.appendChild(option);
    });
}

function populateTeamSelects() {
    populateSelect(
        document.getElementById("result-home-team"),
        state.teams,
        "Seleziona squadra di casa"
    );

    populateSelect(
        document.getElementById("result-away-team"),
        state.teams,
        "Seleziona squadra in trasferta"
    );

    populateSelect(
        document.getElementById("next-opponent"),
        state.teams.filter(team => team.name !== FINO_NAME),
        "Seleziona avversario"
    );
}

function renderNextMatch() {
    const container = document.getElementById("admin-next-match");

    const match =
        state.matches.find(item => item.status === "upcoming" && item.featured) ||
        state.matches.find(item => item.status === "upcoming");

    if (!match) {
        container.innerHTML = `
            <div class="empty-state">
                Nessuna prossima partita impostata.
            </div>
        `;
        return;
    }

    const finoHome = match.home_team === FINO_NAME;
    const location = finoHome
        ? "In casa · Via Leonardo da Vinci, 12 - Fino Mornasco (CO)"
        : "Trasferta";

    container.innerHTML = `
        <div class="admin-match-card">
            <div class="admin-match-main">
                <div class="admin-match-title">
                    ${escapeHtml(match.home_team)} - ${escapeHtml(match.away_team)}
                </div>

                <div class="admin-match-subtitle">
                    ${formatDate(match.match_date)} · ${formatTime(match.match_time)}
                </div>

                <div class="admin-match-subtitle">
                    ${escapeHtml(location)}
                </div>

                <div class="admin-featured-label">Prossima partita</div>
            </div>

            <div class="admin-match-actions">
                <button
                    type="button"
                    class="btn btn-secondary btn-small"
                    data-delete-id="${escapeHtml(match.id)}"
                >
                    Elimina
                </button>
            </div>
        </div>
    `;
}

function renderResults() {
    const container = document.getElementById("admin-results-list");

    const results = state.matches
        .filter(match => match.status === "played")
        .sort((a, b) => {
            const dateCompare = String(b.match_date).localeCompare(String(a.match_date));
            if (dateCompare !== 0) return dateCompare;
            return String(b.created_at || "").localeCompare(String(a.created_at || ""));
        });

    if (!results.length) {
        container.innerHTML = `
            <div class="empty-state">
                Nessun risultato inserito. La nuova stagione parte da zero.
            </div>
        `;
        return;
    }

    container.innerHTML = results.map(match => `
        <div class="admin-match-card">
            <div class="admin-match-main">
                <div class="admin-match-title">
                    ${escapeHtml(match.home_team)}
                    ${escapeHtml(match.home_score)}
                    -
                    ${escapeHtml(match.away_score)}
                    ${escapeHtml(match.away_team)}
                </div>

                <div class="admin-match-subtitle">
                    ${formatDate(match.match_date)}
                </div>
            </div>

            <div class="admin-match-actions">
                <button
                    type="button"
                    class="btn btn-secondary btn-small"
                    data-delete-id="${escapeHtml(match.id)}"
                >
                    Elimina
                </button>
            </div>
        </div>
    `).join("");
}

function renderAdminData() {
    populateTeamSelects();
    renderNextMatch();
    renderResults();
}

async function loadAdminData() {
    try {
        const data = await apiRequest("/api/admin-data");

        state.teams = Array.isArray(data.teams) ? data.teams : [];
        state.matches = Array.isArray(data.matches) ? data.matches : [];

        showPanel();
        renderAdminData();

        return true;
    } catch (error) {
        if (error.status === 401) {
            showLogin();
            return false;
        }

        showLogin();
        document.getElementById("admin-login-error").textContent =
            `Errore di collegamento: ${error.message}`;

        return false;
    }
}

document.getElementById("admin-login-form").addEventListener("submit", async event => {
    event.preventDefault();

    const passwordInput = document.getElementById("admin-password");
    const errorBox = document.getElementById("admin-login-error");

    errorBox.textContent = "";

    try {
        await apiRequest("/api/admin-login", {
            method: "POST",
            body: JSON.stringify({
                password: passwordInput.value
            })
        });

        passwordInput.value = "";
        await loadAdminData();
    } catch (error) {
        errorBox.textContent =
            error.status === 401
                ? "Accesso non autorizzato. Password errata."
                : error.message;
    }
});

document.getElementById("admin-logout-btn").addEventListener("click", async () => {
    try {
        await apiRequest("/api/admin-logout", {
            method: "POST"
        });
    } finally {
        showLogin();
    }
});

document.getElementById("result-form").addEventListener("submit", async event => {
    event.preventDefault();

    const homeTeam = document.getElementById("result-home-team").value;
    const awayTeam = document.getElementById("result-away-team").value;
    const matchDate = document.getElementById("result-date").value;
    const homeScore = document.getElementById("result-home-score").value;
    const awayScore = document.getElementById("result-away-score").value;

    if (homeTeam === awayTeam) {
        showStatus("Le due squadre devono essere diverse.", "error");
        return;
    }

    if (Number(homeScore) === Number(awayScore)) {
        showStatus("Il risultato finale non può essere in parità.", "error");
        return;
    }

    try {
        await apiRequest("/api/admin-data", {
            method: "POST",
            body: JSON.stringify({
                kind: "result",
                home_team: homeTeam,
                away_team: awayTeam,
                match_date: matchDate,
                home_score: Number(homeScore),
                away_score: Number(awayScore)
            })
        });

        event.currentTarget.reset();
        showStatus("Risultato salvato. Classifica aggiornata automaticamente.");
        await loadAdminData();
    } catch (error) {
        showStatus(error.message, "error");
    }
});

document.getElementById("next-match-form").addEventListener("submit", async event => {
    event.preventDefault();

    try {
        await apiRequest("/api/admin-data", {
            method: "POST",
            body: JSON.stringify({
                kind: "next",
                opponent: document.getElementById("next-opponent").value,
                match_date: document.getElementById("next-date").value,
                match_time: document.getElementById("next-time").value,
                home_away: document.getElementById("next-home-away").value
            })
        });

        event.currentTarget.reset();
        document.getElementById("next-home-away").value = "home";

        showStatus("Prossima partita aggiornata.");
        await loadAdminData();
    } catch (error) {
        showStatus(error.message, "error");
    }
});

document.getElementById("admin-panel").addEventListener("click", async event => {
    const button = event.target.closest("[data-delete-id]");
    if (!button) return;

    const id = button.dataset.deleteId;

    if (!window.confirm("Vuoi davvero eliminare questa partita?")) {
        return;
    }

    try {
        await apiRequest(`/api/admin-data?id=${encodeURIComponent(id)}`, {
            method: "DELETE"
        });

        showStatus("Partita eliminata.");
        await loadAdminData();
    } catch (error) {
        showStatus(error.message, "error");
    }
});

loadAdminData();

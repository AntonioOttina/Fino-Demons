const ADMIN_PASSWORD = "demons2026";
const ADMIN_SESSION_KEY = "fino_admin_logged";
const STORAGE_KEY = "fino_demons_matches";
const FEATURED_KEY = "fino_demons_featured_match";

function getMatches() {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    try {
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? parsed : [];
    } catch {
        return [];
    }
}

function saveMatches(matches) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(matches));
}

function getFeaturedMatchId() {
    return localStorage.getItem(FEATURED_KEY) || "";
}

function setFeaturedMatchId(id) {
    localStorage.setItem(FEATURED_KEY, id);
}

function clearFeaturedMatchId() {
    localStorage.removeItem(FEATURED_KEY);
}

function isLogged() {
    return localStorage.getItem(ADMIN_SESSION_KEY) === "true";
}

function setLogged(value) {
    localStorage.setItem(ADMIN_SESSION_KEY, value ? "true" : "false");
}

function formatDate(dateStr) {
    if (!dateStr) return "";
    const d = new Date(dateStr + "T00:00:00");
    if (Number.isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString("it-IT", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric"
    });
}

function getTeamsText(match) {
    return match.homeAway === "home"
        ? `Fino Demons - ${match.opponent}`
        : `${match.opponent} - Fino Demons`;
}

function getScoreText(match) {
    if (match.status !== "played") return "Da giocare";
    if (match.finoScore === "" || match.oppScore === "" || match.finoScore == null || match.oppScore == null) return "Risultato non inserito";
    return `${match.finoScore} - ${match.oppScore}`;
}

function renderAuth() {
    const loginBox = document.getElementById("admin-login-box");
    const panel = document.getElementById("admin-panel");

    if (isLogged()) {
        loginBox.classList.add("hidden");
        panel.classList.remove("hidden");
        renderMatchesList();
    } else {
        loginBox.classList.remove("hidden");
        panel.classList.add("hidden");
    }
}

function resetForm() {
    document.getElementById("match-id").value = "";
    document.getElementById("match-opponent").value = "";
    document.getElementById("match-date").value = "";
    document.getElementById("match-time").value = "";
    document.getElementById("match-homeaway").value = "";
    document.getElementById("match-status").value = "upcoming";
    document.getElementById("match-score-fino").value = "";
    document.getElementById("match-score-opp").value = "";
}

function fillForm(match) {
    document.getElementById("match-id").value = match.id;
    document.getElementById("match-opponent").value = match.opponent;
    document.getElementById("match-date").value = match.date;
    document.getElementById("match-time").value = match.time || "";
    document.getElementById("match-homeaway").value = match.homeAway;
    document.getElementById("match-status").value = match.status;
    document.getElementById("match-score-fino").value = match.finoScore ?? "";
    document.getElementById("match-score-opp").value = match.oppScore ?? "";
    window.scrollTo({ top: 0, behavior: "smooth" });
}

function renderMatchesList() {
    const container = document.getElementById("admin-matches-list");
    if (!container) return;

    const matches = [...getMatches()].sort((a, b) => {
        const da = new Date(`${a.date}T${a.time || "00:00"}:00`).getTime();
        const db = new Date(`${b.date}T${b.time || "00:00"}:00`).getTime();
        return da - db;
    });

    const featuredId = getFeaturedMatchId();

    if (!matches.length) {
        container.innerHTML = `<div class="empty-state">Nessuna partita inserita.</div>`;
        return;
    }

    container.innerHTML = "";

    matches.forEach(match => {
        const card = document.createElement("div");
        card.className = "admin-match-card";

        card.innerHTML = `
            <div class="admin-match-main">
                <div class="admin-match-title">${getTeamsText(match)}</div>
                <div class="admin-match-subtitle">
                    ${formatDate(match.date)} · ${match.time || "--:--"} · ${match.homeAway === "home" ? "In casa" : "Trasferta"}
                </div>
                <div class="admin-match-subtitle">
                    Stato: ${match.status === "played" ? "Giocata" : "Da giocare"} · ${getScoreText(match)}
                </div>
                ${featuredId === match.id ? `<div class="admin-featured-label">In evidenza</div>` : ""}
            </div>

            <div class="admin-match-actions">
                <button class="btn btn-secondary btn-small edit-btn">Modifica</button>
                <button class="btn btn-secondary btn-small feature-btn">
                    ${featuredId === match.id ? "Rimuovi evidenza" : "Metti in evidenza"}
                </button>
                <button class="btn btn-secondary btn-small delete-btn">Elimina</button>
            </div>
        `;

        card.querySelector(".edit-btn").addEventListener("click", () => fillForm(match));

        card.querySelector(".feature-btn").addEventListener("click", () => {
            if (featuredId === match.id) {
                clearFeaturedMatchId();
            } else {
                setFeaturedMatchId(match.id);
            }
            renderMatchesList();
        });

        card.querySelector(".delete-btn").addEventListener("click", () => {
            let matches = getMatches().filter(m => m.id !== match.id);
            saveMatches(matches);

            if (getFeaturedMatchId() === match.id) {
                clearFeaturedMatchId();
            }

            renderMatchesList();
            resetForm();
        });

        container.appendChild(card);
    });
}

function setupLogin() {
    const loginBtn = document.getElementById("admin-login-btn");
    const passwordInput = document.getElementById("admin-password");
    const errorBox = document.getElementById("admin-login-error");

    loginBtn.addEventListener("click", () => {
        if (passwordInput.value === ADMIN_PASSWORD) {
            setLogged(true);
            errorBox.textContent = "";
            passwordInput.value = "";
            renderAuth();
        } else {
            errorBox.textContent = "Accesso non autorizzato. Riprova.";
        }
    });

    passwordInput.addEventListener("keydown", (e) => {
        if (e.key === "Enter") {
            e.preventDefault();
            loginBtn.click();
        }
    });
}

function setupLogout() {
    const logoutBtn = document.getElementById("admin-logout-btn");
    logoutBtn.addEventListener("click", () => {
        setLogged(false);
        renderAuth();
    });
}

function setupForm() {
    const form = document.getElementById("match-form");
    const resetBtn = document.getElementById("match-reset-btn");

    form.addEventListener("submit", (e) => {
        e.preventDefault();

        const id = document.getElementById("match-id").value || crypto.randomUUID();
        const opponent = document.getElementById("match-opponent").value;
        const date = document.getElementById("match-date").value;
        const time = document.getElementById("match-time").value;
        const homeAway = document.getElementById("match-homeaway").value;
        const status = document.getElementById("match-status").value;
        const finoScore = document.getElementById("match-score-fino").value;
        const oppScore = document.getElementById("match-score-opp").value;

        let matches = getMatches();

        const matchData = {
            id,
            opponent,
            date,
            time,
            homeAway,
            status,
            finoScore: finoScore === "" ? "" : Number(finoScore),
            oppScore: oppScore === "" ? "" : Number(oppScore)
        };

        const index = matches.findIndex(m => m.id === id);
        if (index >= 0) {
            matches[index] = matchData;
        } else {
            matches.push(matchData);
        }

        saveMatches(matches);
        renderMatchesList();
        resetForm();
    });

    resetBtn.addEventListener("click", () => resetForm());
}

setupLogin();
setupLogout();
setupForm();
renderAuth();
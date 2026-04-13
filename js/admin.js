const STORAGE_KEY = "fino_demons_matches";
const LOGIN_KEY = "fino_demons_admin_logged";
const ADMIN_PASSWORD = "demons2026";

const loginBox = document.getElementById("admin-login-box");
const loginBtn = document.getElementById("admin-login-btn");
const loginError = document.getElementById("admin-login-error");
const passwordInput = document.getElementById("admin-password");
const adminPanel = document.getElementById("admin-panel");
const logoutBtn = document.getElementById("admin-logout-btn");

const form = document.getElementById("admin-match-form");
const resetBtn = document.getElementById("admin-reset-btn");
const savedMatchesList = document.getElementById("saved-matches-list");

function getSavedMatches() {
    try {
        return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
    } catch {
        return [];
    }
}

function saveMatches(matches) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(matches));
}

function pad(num) {
    return String(num).padStart(2, "0");
}

function formatDateToDDMM(isoDate) {
    const [year, month, day] = isoDate.split("-");
    return `${day}/${month}`;
}

function buildTeams(location, opponent) {
    return location === "home"
        ? `Fino Demons - ${opponent}`
        : `${opponent} - Fino Demons`;
}

function getWhere(location) {
    return location === "home"
        ? "In Casa (Palestra Comunale - Via L. Da Vinci)"
        : "Trasferta";
}

function computeResult(status, finoScore, opponentScore) {
    if (status !== "played") return "";
    if (Number(finoScore) > Number(opponentScore)) return "win";
    if (Number(finoScore) < Number(opponentScore)) return "loss";
    return "draw";
}

function sortMatches(matches) {
    return [...matches].sort((a, b) => new Date(a.isoDate) - new Date(b.isoDate));
}

function clearForm() {
    form.reset();
    document.getElementById("match-id").value = "";
    document.getElementById("fino-score").value = 0;
    document.getElementById("opponent-score").value = 0;
}

function renderSavedMatches() {
    const matches = sortMatches(getSavedMatches());

    if (!matches.length) {
        savedMatchesList.innerHTML = `<div class="empty-admin-state">Nessuna partita salvata.</div>`;
        return;
    }

    savedMatchesList.innerHTML = matches.map(match => `
        <div class="saved-result-item">
            <div class="saved-result-main">
                <div class="saved-result-title">${match.teams}</div>
                <div class="saved-result-meta">
                    ${match.date} • ${match.time} • ${match.where} • ${match.status === "played" ? "Giocata" : "Da giocare"}
                </div>
            </div>
            <div class="saved-result-score">${match.status === "played" ? match.score : "—"}</div>
            <div class="saved-result-actions">
                <button class="saved-result-edit" data-id="${match.id}">Modifica</button>
                <button class="saved-result-delete" data-id="${match.id}">Elimina</button>
            </div>
        </div>
    `).join("");

    document.querySelectorAll(".saved-result-edit").forEach(button => {
        button.addEventListener("click", () => editMatch(button.dataset.id));
    });

    document.querySelectorAll(".saved-result-delete").forEach(button => {
        button.addEventListener("click", () => deleteMatch(button.dataset.id));
    });
}

function editMatch(id) {
    const matches = getSavedMatches();
    const match = matches.find(item => item.id === id);
    if (!match) return;

    document.getElementById("match-id").value = match.id;
    document.getElementById("match-date").value = match.isoDate;
    document.getElementById("match-time").value = match.time;
    document.getElementById("match-opponent").value = match.opponent;
    document.getElementById("match-location").value = match.location;
    document.getElementById("match-status").value = match.status;
    document.getElementById("fino-score").value = match.finoScore;
    document.getElementById("opponent-score").value = match.opponentScore;

    window.scrollTo({ top: 0, behavior: "smooth" });
}

function deleteMatch(id) {
    const updated = getSavedMatches().filter(item => item.id !== id);
    saveMatches(updated);
    renderSavedMatches();
}

function unlockAdmin() {
    loginBox.classList.add("hidden");
    adminPanel.classList.remove("hidden");
}

function lockAdmin() {
    localStorage.removeItem(LOGIN_KEY);
    adminPanel.classList.add("hidden");
    loginBox.classList.remove("hidden");
    passwordInput.value = "";
}

loginBtn?.addEventListener("click", () => {
    const value = passwordInput.value;

    if (value === ADMIN_PASSWORD) {
        localStorage.setItem(LOGIN_KEY, "true");
        loginError.classList.add("hidden");
        unlockAdmin();
    } else {
        loginError.classList.remove("hidden");
        passwordInput.value = "";
        passwordInput.focus();
    }
});

passwordInput?.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
        e.preventDefault();
        loginBtn.click();
    }
});

logoutBtn?.addEventListener("click", lockAdmin);

form?.addEventListener("submit", (e) => {
    e.preventDefault();

    const id = document.getElementById("match-id").value;
    const isoDate = document.getElementById("match-date").value;
    const date = formatDateToDDMM(isoDate);
    const time = document.getElementById("match-time").value;
    const opponent = document.getElementById("match-opponent").value;
    const location = document.getElementById("match-location").value;
    const status = document.getElementById("match-status").value;
    const finoScore = document.getElementById("fino-score").value;
    const opponentScore = document.getElementById("opponent-score").value;

    if (!isoDate || !time || !opponent || !location || !status) {
        return;
    }

    const teams = buildTeams(location, opponent);
    const where = getWhere(location);
    const result = computeResult(status, finoScore, opponentScore);
    const score = status === "played" ? `${finoScore} - ${opponentScore}` : "";

    const match = {
        id: id || `${isoDate}_${time}_${location}_${opponent}`.replace(/\s+/g, "_"),
        isoDate,
        date,
        time,
        opponent,
        location,
        status,
        teams,
        where,
        finoScore,
        opponentScore,
        score,
        result
    };

    const matches = getSavedMatches().filter(item => item.id !== match.id);
    matches.push(match);
    saveMatches(matches);

    renderSavedMatches();
    clearForm();
});

resetBtn?.addEventListener("click", clearForm);

if (localStorage.getItem(LOGIN_KEY) === "true") {
    unlockAdmin();
}

renderSavedMatches();
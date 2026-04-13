const STORAGE_KEY = "fino_demons_manual_results";

const form = document.getElementById("admin-result-form");
const savedResultsList = document.getElementById("saved-results-list");
const clearFormBtn = document.getElementById("clear-form-btn");

function getSavedResults() {
    try {
        return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
    } catch {
        return [];
    }
}

function saveResults(results) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(results));
}

function formatDateToDDMM(dateString) {
    if (!dateString) return "";
    const [year, month, day] = dateString.split("-");
    return `${day}/${month}`;
}

function buildTeamsLabel(location, opponent) {
    if (location === "home") {
        return `Fino Demons - ${opponent}`;
    }
    return `${opponent} - Fino Demons`;
}

function renderSavedResults() {
    const results = getSavedResults();

    if (!results.length) {
        savedResultsList.innerHTML = `<div class="empty-admin-state">Nessun risultato inserito.</div>`;
        return;
    }

    const sorted = [...results].sort((a, b) => new Date(b.isoDate) - new Date(a.isoDate));

    savedResultsList.innerHTML = sorted.map(item => `
        <div class="saved-result-item">
            <div class="saved-result-main">
                <div class="saved-result-title">${item.teams}</div>
                <div class="saved-result-meta">
                    ${item.date} • ${item.location === "home" ? "In casa" : "Trasferta"}
                </div>
            </div>
            <div class="saved-result-score">${item.score}</div>
            <button class="saved-result-delete" data-id="${item.id}">Elimina</button>
        </div>
    `).join("");

    document.querySelectorAll(".saved-result-delete").forEach(button => {
        button.addEventListener("click", () => {
            const id = button.dataset.id;
            const updated = getSavedResults().filter(item => item.id !== id);
            saveResults(updated);
            renderSavedResults();
        });
    });
}

function resetForm() {
    form.reset();
}

form.addEventListener("submit", (e) => {
    e.preventDefault();

    const isoDate = document.getElementById("match-date").value;
    const location = document.getElementById("match-location").value;
    const opponent = document.getElementById("match-opponent").value;
    const finoScore = document.getElementById("fino-score").value;
    const opponentScore = document.getElementById("opponent-score").value;

    if (!isoDate || !location || !opponent || finoScore === "" || opponentScore === "") {
        alert("Compila tutti i campi.");
        return;
    }

    const date = formatDateToDDMM(isoDate);
    const teams = buildTeamsLabel(location, opponent);
    const score = `${finoScore} - ${opponentScore}`;
    const result = Number(finoScore) > Number(opponentScore) ? "win" : Number(finoScore) < Number(opponentScore) ? "loss" : "draw";

    const item = {
        id: `${isoDate}_${location}_${opponent}`.replace(/\s+/g, "_"),
        isoDate,
        date,
        location,
        opponent,
        teams,
        score,
        status: "played",
        result
    };

    const results = getSavedResults();

    const filtered = results.filter(existing => existing.id !== item.id);
    filtered.push(item);

    saveResults(filtered);
    renderSavedResults();
    resetForm();

    alert("Risultato salvato correttamente.");
});

clearFormBtn.addEventListener("click", resetForm);

renderSavedResults();

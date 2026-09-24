const FINO_NAME = "Fino Demons";
const LEGACY_STORAGE_KEYS = [
    "fino_demons_matches",
    "fino_demons_featured_match",
    "fino_admin_logged"
];

const state = {
    teams: [],
    matches: [],
    gallery: {
        squadra: [],
        partite: [],
        eventi: []
    }
};

const GALLERY_LABELS = {
    squadra: "Foto di Squadra",
    partite: "Partite",
    eventi: "Tifoseria"
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

function renderGalleryList() {
    const container = document.getElementById("admin-gallery-list");
    if (!container) return;

    const sections = Object.entries(GALLERY_LABELS).map(([category, label]) => {
        const photos = Array.isArray(state.gallery[category])
            ? state.gallery[category]
            : [];

        const body = photos.length
            ? photos.map(photo => `
                <div class="admin-gallery-photo">
                    <img src="${escapeHtml(photo.url)}" alt="${escapeHtml(label)}" loading="lazy">
                    <div>
                        <strong>${escapeHtml(photo.name)}</strong>
                        <span>${escapeHtml(label)}</span>
                    </div>
                    <button
                        type="button"
                        class="btn btn-secondary btn-small"
                        data-delete-gallery="${escapeHtml(photo.id)}"
                    >
                        Elimina
                    </button>
                </div>
            `).join("")
            : `<div class="empty-state">Nessuna foto caricata in questa sezione.</div>`;

        return `
            <section class="admin-gallery-section">
                <h3>${escapeHtml(label)}</h3>
                <div class="admin-gallery-photos">${body}</div>
            </section>
        `;
    }).join("");

    container.innerHTML = sections;
}

function renderAdminData() {
    populateTeamSelects();
    renderNextMatch();
    renderResults();
    renderGalleryList();
}

async function loadGalleryData() {
    const data = await apiRequest("/api/admin-gallery");
    state.gallery = {
        squadra: Array.isArray(data.sections?.squadra) ? data.sections.squadra : [],
        partite: Array.isArray(data.sections?.partite) ? data.sections.partite : [],
        eventi: Array.isArray(data.sections?.eventi) ? data.sections.eventi : []
    };
}

async function loadAdminData() {
    try {
        const [data] = await Promise.all([
            apiRequest("/api/admin-data"),
            loadGalleryData().catch(error => {
                state.gallery = { squadra: [], partite: [], eventi: [] };
                showStatus(`Gallery non disponibile: ${error.message}`, "error");
            })
        ]);

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

function readFileAsImage(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();

        reader.addEventListener("load", () => {
            const img = new Image();
            img.addEventListener("load", () => resolve(img), { once: true });
            img.addEventListener("error", () => reject(new Error("Immagine non leggibile")), { once: true });
            img.src = reader.result;
        }, { once: true });

        reader.addEventListener("error", () => reject(new Error("File non leggibile")), { once: true });
        reader.readAsDataURL(file);
    });
}

async function optimizePhoto(file) {
    if (!file.type.startsWith("image/")) {
        throw new Error("Puoi caricare solo immagini.");
    }

    const img = await readFileAsImage(file);
    const maxSize = 1800;
    const scale = Math.min(1, maxSize / Math.max(img.width, img.height));
    const width = Math.max(1, Math.round(img.width * scale));
    const height = Math.max(1, Math.round(img.height * scale));

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;

    const context = canvas.getContext("2d");
    context.drawImage(img, 0, 0, width, height);

    return {
        name: file.name,
        type: "image/jpeg",
        dataUrl: canvas.toDataURL("image/jpeg", 0.82)
    };
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

document.getElementById("gallery-upload-form").addEventListener("submit", async event => {
    event.preventDefault();

    const form = event.currentTarget;
    const filesInput = document.getElementById("gallery-files");
    const category = document.getElementById("gallery-category").value;
    const files = Array.from(filesInput.files || []);

    if (!files.length) {
        showStatus("Seleziona almeno una foto.", "error");
        return;
    }

    if (files.length > 12) {
        showStatus("Puoi caricare massimo 12 foto alla volta.", "error");
        return;
    }

    try {
        showStatus("Ottimizzo e carico le foto...");

        let uploadedCount = 0;

        for (const file of files) {
            const photo = await optimizePhoto(file);

            await apiRequest("/api/admin-gallery", {
                method: "POST",
                body: JSON.stringify({ category, photos: [photo] })
            });

            uploadedCount += 1;
            showStatus(`Caricate ${uploadedCount} di ${files.length} foto...`);
        }

        form.reset();
        document.getElementById("gallery-category").value = category;

        showStatus(`${uploadedCount} foto caricate nella gallery.`);
        await loadGalleryData();
        renderGalleryList();
    } catch (error) {
        showStatus(error.message, "error");
    }
});

document.getElementById("admin-panel").addEventListener("click", async event => {
    const resultButton = event.target.closest("[data-delete-id]");
    const galleryButton = event.target.closest("[data-delete-gallery]");

    if (galleryButton) {
        const path = galleryButton.dataset.deleteGallery;

        if (!window.confirm("Vuoi davvero eliminare questa foto dalla gallery?")) {
            return;
        }

        try {
            await apiRequest(`/api/admin-gallery?path=${encodeURIComponent(path)}`, {
                method: "DELETE"
            });

            showStatus("Foto eliminata.");
            await loadGalleryData();
            renderGalleryList();
        } catch (error) {
            showStatus(error.message, "error");
        }

        return;
    }

    const button = resultButton;
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

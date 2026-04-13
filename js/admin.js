const ADMIN_PASSWORD = "demons2026";

// ===== LOGIN (LOCALE OK) =====
const ADMIN_SESSION_KEY = "fino_admin_logged";

function isLogged() {
    return localStorage.getItem(ADMIN_SESSION_KEY) === "true";
}

function setLogged(value) {
    localStorage.setItem(ADMIN_SESSION_KEY, value ? "true" : "false");
}

// ===== FETCH MATCH DA SERVER =====
async function getMatches() {
    const res = await fetch("/api/matches");
    return await res.json();
}

// ===== SALVA MATCH SU SERVER =====
async function saveMatch(matchData) {
    const res = await fetch("/api/admin-save-match", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "x-admin-password": ADMIN_PASSWORD
        },
        body: JSON.stringify(matchData)
    });

    return await res.json();
}

// ===== DELETE MATCH =====
async function deleteMatch(id) {
    await fetch(`/api/delete-match?id=${id}`, {
        method: "DELETE",
        headers: {
            "x-admin-password": ADMIN_PASSWORD
        }
    });
}

// ===== UI =====
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

// ===== RENDER MATCH =====
async function renderMatchesList() {
    const container = document.getElementById("admin-matches-list");
    const matches = await getMatches();

    container.innerHTML = "";

    matches
        .sort((a, b) => new Date(b.date) - new Date(a.date))
        .forEach(match => {

            const card = document.createElement("div");
            card.className = "admin-match-card";

            card.innerHTML = `
                <div>
                    <strong>${match.homeAway === "home" ? "Fino Demons - " + match.opponent : match.opponent + " - Fino Demons"}</strong><br>
                    ${match.date} - ${match.time || "--:--"}<br>
                    ${match.status === "played" ? `${match.finoScore} - ${match.oppScore}` : "Da giocare"}
                </div>

                <div>
                    <button class="btn btn-secondary delete-btn">Elimina</button>
                </div>
            `;

            card.querySelector(".delete-btn").onclick = async () => {
                await deleteMatch(match.id);
                renderMatchesList();
            };

            container.appendChild(card);
        });
}

// ===== FORM =====
function setupForm() {
    const form = document.getElementById("match-form");

    form.addEventListener("submit", async (e) => {
        e.preventDefault();

        const matchData = {
            opponent: document.getElementById("match-opponent").value,
            date: document.getElementById("match-date").value,
            time: document.getElementById("match-time").value,
            homeAway: document.getElementById("match-homeaway").value,
            status: document.getElementById("match-status").value,
            finoScore: document.getElementById("match-score-fino").value || null,
            oppScore: document.getElementById("match-score-opp").value || null
        };

        await saveMatch(matchData);

        form.reset();
        renderMatchesList();
    });
}

// ===== LOGIN =====
function setupLogin() {
    const btn = document.getElementById("admin-login-btn");
    const input = document.getElementById("admin-password");
    const error = document.getElementById("admin-login-error");

    btn.onclick = () => {
        if (input.value === ADMIN_PASSWORD) {
            setLogged(true);
            renderAuth();
        } else {
            error.textContent = "Accesso non autorizzato";
        }
    };
}

// ===== INIT =====
setupLogin();
setupForm();
renderAuth();
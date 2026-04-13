const STORAGE_KEY = "fino_demons_manual_results";

function getManualResults() {
    try {
        return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
    } catch {
        return [];
    }
}

function normalizeText(text) {
    return String(text || "")
        .toLowerCase()
        .replace(/\./g, "")
        .replace(/\s+/g, " ")
        .trim();
}

function normalizeTeamName(team) {
    const t = normalizeText(team);

    if (t.includes("cr fino mornasco") || t.includes("fino demons")) return "fino";
    if (t.includes("leopandrillo cantu")) return "leopandrillo cantu";
    if (t.includes("figino")) return "pall figino";
    if (t.includes("olimpia cadorago")) return "olimpia cadorago";
    if (t.includes("scs socco")) return "scs socco";
    if (t.includes("basket antoniana")) return "basket antoniana sqb";
    if (t.includes("cabiate")) return "pall cabiate";
    if (t.includes("cucciago")) return "pol cucciago 80";
    if (t.includes("alebbio como b")) return "alebbio como b";
    if (t.includes("bt92")) return "bt92 cantu";
    if (t.includes("menaggio")) return "pallacanestro menaggio";
    if (t.includes("alebbio como a")) return "alebbio como a";

    return t;
}

function formatOpponentForDisplay(opponent) {
    return opponent;
}

function buildManualTeams(location, opponent) {
    return location === "home"
        ? `Fino Demons - ${formatOpponentForDisplay(opponent)}`
        : `${formatOpponentForDisplay(opponent)} - Fino Demons`;
}

function toISOFromDDMM(ddmm) {
    if (!ddmm || !ddmm.includes("/")) return "";
    const [day, month] = ddmm.split("/");
    return `2026-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
}

function getWhereFromTeams(teams) {
    return teams.startsWith("Fino Demons -")
        ? "In Casa (Palestra Comunale - Via L. Da Vinci)"
        : "Trasferta";
}

function mergeManualResults(apiResults) {
    const manualResults = getManualResults();
    const merged = [...(apiResults || [])];

    manualResults.forEach(manual => {
        const manualOpponentNorm = normalizeTeamName(manual.opponent);
        const manualIso = manual.isoDate || toISOFromDDMM(manual.date);

        let matched = false;

        for (let i = 0; i < merged.length; i++) {
            const item = merged[i];
            const iso = item.isoDate || toISOFromDDMM(item.date || "");
            const teams = String(item.teams || "");
            const opponentPart = teams
                .replace("Fino Demons -", "")
                .replace("- Fino Demons", "")
                .trim();

            const itemOpponentNorm = normalizeTeamName(opponentPart);
            const sameDate = iso === manualIso;
            const sameOpponent = itemOpponentNorm === manualOpponentNorm;

            if (sameDate && sameOpponent) {
                merged[i] = {
                    ...item,
                    teams: buildManualTeams(manual.location, manual.opponent),
                    score: manual.score,
                    status: "played",
                    result: manual.result,
                    where: manual.location === "home"
                        ? "In Casa (Palestra Comunale - Via L. Da Vinci)"
                        : "Trasferta",
                    isoDate: manualIso
                };
                matched = true;
                break;
            }
        }

        if (!matched) {
            merged.push({
                date: manual.date,
                isoDate: manualIso,
                teams: buildManualTeams(manual.location, manual.opponent),
                score: manual.score,
                time: "",
                status: "played",
                result: manual.result,
                where: manual.location === "home"
                    ? "In Casa (Palestra Comunale - Via L. Da Vinci)"
                    : "Trasferta"
            });
        }
    });

    merged.sort((a, b) => {
        const da = new Date(a.isoDate || toISOFromDDMM(a.date || ""));
        const db = new Date(b.isoDate || toISOFromDDMM(b.date || ""));
        return da - db;
    });

    return merged;
}

function splitTeams(teams) {
    if (!teams || !teams.includes(" - ")) {
        return ["", ""];
    }
    return teams.split(" - ").map(part => part.trim());
}

function renderResults(results) {
    const resultsContainer = document.getElementById("results-list");
    if (!resultsContainer) return;

    const playedMatches = results.filter(match => match.status === "played");

    if (!playedMatches.length) {
        resultsContainer.innerHTML = `<div class="match-row"><div class="match-main"><div class="match-teams">Nessun risultato disponibile.</div></div></div>`;
        return;
    }

    const sortedPlayed = [...playedMatches].sort((a, b) => {
        const da = new Date(b.isoDate || toISOFromDDMM(b.date || ""));
        const db = new Date(a.isoDate || toISOFromDDMM(a.date || ""));
        return da - db;
    });

    resultsContainer.innerHTML = sortedPlayed.map(match => {
        const [team1, team2] = splitTeams(match.teams);
        const scoreClass = match.result === "win"
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
                            <i class="fa-solid fa-location-dot"></i>
                            ${match.where || getWhereFromTeams(match.teams)}
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

function renderNextMatch(results) {
    const nextMatchContainer = document.getElementById("next-match");
    if (!nextMatchContainer) return;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const upcomingMatches = results.filter(match => {
        const matchDate = new Date(match.isoDate || toISOFromDDMM(match.date || ""));
        matchDate.setHours(0, 0, 0, 0);
        return match.status !== "played" && matchDate >= today;
    });

    if (!upcomingMatches.length) {
        nextMatchContainer.innerHTML = "";
        return;
    }

    upcomingMatches.sort((a, b) => {
        const da = new Date(a.isoDate || toISOFromDDMM(a.date || ""));
        const db = new Date(b.isoDate || toISOFromDDMM(b.date || ""));
        return da - db;
    });

    const next = upcomingMatches[0];
    const [team1, team2] = splitTeams(next.teams);

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
                    ${next.time || "Da definire"}
                </span>
                <span class="match-badge">
                    <i class="fa-solid fa-location-dot"></i>
                    ${next.where || getWhereFromTeams(next.teams)}
                </span>
            </div>
        </div>
    `;
}

function renderStandings(data) {
    const standingsContainer = document.getElementById("standings-table");
    if (!standingsContainer || !data.standings) return;

    standingsContainer.innerHTML = "";

    data.standings.forEach(team => {
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

async function loadData() {
    try {
        const res = await fetch("/api/fip");
        const data = await res.json();

        renderStandings(data);

        const mergedResults = mergeManualResults(data.results || []);
        renderResults(mergedResults);
        renderNextMatch(mergedResults);
    } catch (error) {
        console.error("Errore caricamento dati:", error);
    }
}

loadData();
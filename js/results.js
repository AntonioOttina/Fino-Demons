const resultsData = [
    { date: "29 Mar 2026 • 9ª Ritorno • Trasferta", teams: "MAJA Figino - Fino Demons", score: "65 - 56", result: "loss" },
    { date: "22 Mar 2026 • 8ª Ritorno • In Casa", teams: "Fino Demons - Commercial Paint Alebbio", score: "66 - 40", result: "win" },
    { date: "15 Mar 2026 • 7ª Ritorno • Trasferta", teams: "Bar Pinocchio U.S. Alebbio - Fino Demons", score: "48 - 54", result: "win" },
    { date: "08 Mar 2026 • 6ª Ritorno • In Casa", teams: "Fino Demons - Pallacanestro Cabiate", score: "58 - 47", result: "win" },
    { date: "22 Feb 2026 • 5ª Ritorno • Trasferta", teams: "Basket Antoniana Como - Fino Demons", score: "42 - 56", result: "win" },
    { date: "15 Feb 2026 • 4ª Ritorno • In Casa", teams: "Fino Demons - F.B. Leopandrillo Cantù", score: "45 - 52", result: "loss" }
];

const resultsList = document.getElementById("results-list");

if (resultsList) {
    resultsData.forEach(match => {
        const highlightedTeams = match.teams.replaceAll(
            "Fino Demons",
            '<span class="team-highlight">Fino Demons</span>'
        );

        const row = document.createElement("div");
        row.className = `match-row ${match.result}`;

        row.innerHTML = `
            <div>
                <div class="match-date">${match.date}</div>
                <div class="match-teams">${highlightedTeams}</div>
            </div>
            <div class="match-score">${match.score}</div>
        `;

        resultsList.appendChild(row);
    });
}

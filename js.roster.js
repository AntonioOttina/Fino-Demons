const rosterData = [
    { number: "🎯", name: "Damiano Mazzoccato", role: "Allenatore", coach: true },
    { number: 1, name: "Giacomo Arrighi", role: "" },
    { number: 3, name: "Davide Guerra", role: "" },
    { number: 5, name: "Alessandro Corti", role: "" },
    { number: 8, name: "Giacomo Giani", role: "Capitano" },
    { number: 9, name: "Riccardo Gaboardi", role: "" },
    { number: 10, name: "Agostino Mazzoccato", role: "" },
    { number: 11, name: "Francesco Parenti", role: "" },
    { number: 14, name: "Antonino Ottinà", role: "" },
    { number: 16, name: "Gianluca Colombo", role: "" },
    { number: 22, name: "Marco Passarello", role: "" },
    { number: 23, name: "Edoardo Verga", role: "" },
    { number: 24, name: "Gabriele Molteni", role: "" },
    { number: 35, name: "Raoul Baitieri", role: "" },
    { number: 90, name: "Tommaso Borghi", role: "" },
    { number: 99, name: "Andrea Molteni", role: "" }
];

const rosterGrid = document.getElementById("roster-grid");

if (rosterGrid) {
    rosterData.forEach(player => {
        const card = document.createElement("div");
        card.className = player.coach ? "player-card coach" : "player-card";

        card.innerHTML = `
            <div class="player-number">${player.number}</div>
            <div class="player-info">
                <h4>${player.name}</h4>
                ${player.role ? `<div class="player-role">${player.role}</div>` : ""}
            </div>
        `;

        rosterGrid.appendChild(card);
    });
}

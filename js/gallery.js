document.addEventListener("DOMContentLoaded", () => {
    const grid = document.getElementById("gallery-photo-grid");
    const emptyState = document.getElementById("gallery-empty");
    const lightbox = document.getElementById("lightbox");
    const lightboxImage = document.getElementById("lightbox-image");

    if (!grid || !lightbox || !lightboxImage) return;

    const section = grid.dataset.gallerySection || "";
    const closeButton = lightbox.querySelector(".lightbox-close");
    const prevButton = lightbox.querySelector(".lightbox-prev");
    const nextButton = lightbox.querySelector(".lightbox-next");

    let photos = [];
    let currentIndex = 0;

    function escapeHtml(value) {
        return String(value ?? "")
            .replaceAll("&", "&amp;")
            .replaceAll("<", "&lt;")
            .replaceAll(">", "&gt;")
            .replaceAll('"', "&quot;")
            .replaceAll("'", "&#039;");
    }

    function renderEmpty(message = "Le foto arriveranno qui") {
        grid.classList.add("hidden");

        if (!emptyState) return;

        emptyState.classList.remove("hidden");
        emptyState.innerHTML = `
            <i class="fa-regular fa-images"></i>
            <h2>${escapeHtml(message)}</h2>
            <p>Questa sezione è pronta. Appena vengono caricate le immagini dal pannello admin, compariranno automaticamente nella griglia.</p>
        `;
    }

    function renderPhotos() {
        if (!photos.length) {
            renderEmpty();
            return;
        }

        emptyState?.classList.add("hidden");
        grid.classList.remove("hidden");
        grid.innerHTML = photos.map((photo, index) => `
            <button class="gallery-photo-card" type="button" data-index="${index}">
                <img src="${escapeHtml(photo.url)}" alt="Foto Fino Demons" class="gallery-photo" loading="lazy">
                <span class="gallery-photo-overlay"><i class="fa-solid fa-expand"></i></span>
            </button>
        `).join("");
    }

    async function loadPhotos() {
        if (!section) {
            renderEmpty("Sezione gallery non configurata");
            return;
        }

        grid.innerHTML = `
            <div class="gallery-loading">
                Caricamento foto...
            </div>
        `;

        try {
            const response = await fetch(`/api/gallery-data?category=${encodeURIComponent(section)}`, {
                credentials: "same-origin"
            });

            const data = await response.json().catch(() => ({}));

            if (!response.ok) {
                throw new Error(data.error || "Gallery non disponibile");
            }

            photos = Array.isArray(data.photos) ? data.photos : [];
            renderPhotos();
        } catch (error) {
            renderEmpty(error.message);
        }
    }

    function openLightbox(index) {
        if (!photos.length) return;

        currentIndex = (index + photos.length) % photos.length;

        const photo = photos[currentIndex];
        lightboxImage.src = photo.url;
        lightboxImage.alt = "Foto Fino Demons";

        lightbox.classList.add("open");
        lightbox.setAttribute("aria-hidden", "false");
        document.body.style.overflow = "hidden";
    }

    function closeLightbox() {
        lightbox.classList.remove("open");
        lightbox.setAttribute("aria-hidden", "true");
        lightboxImage.removeAttribute("src");
        document.body.style.overflow = "";
    }

    grid.addEventListener("click", event => {
        const card = event.target.closest(".gallery-photo-card");
        if (!card) return;

        openLightbox(Number(card.dataset.index || 0));
    });

    closeButton?.addEventListener("click", closeLightbox);

    prevButton?.addEventListener("click", () => {
        openLightbox(currentIndex - 1);
    });

    nextButton?.addEventListener("click", () => {
        openLightbox(currentIndex + 1);
    });

    lightbox.addEventListener("click", event => {
        if (event.target === lightbox) {
            closeLightbox();
        }
    });

    document.addEventListener("keydown", event => {
        if (!lightbox.classList.contains("open")) return;

        if (event.key === "Escape") closeLightbox();
        if (event.key === "ArrowLeft") openLightbox(currentIndex - 1);
        if (event.key === "ArrowRight") openLightbox(currentIndex + 1);
    });

    loadPhotos();
});

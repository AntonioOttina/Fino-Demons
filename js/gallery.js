document.addEventListener("DOMContentLoaded", () => {
    const grid = document.getElementById("gallery-photo-grid");
    const emptyState = document.getElementById("gallery-empty");
    const lightbox = document.getElementById("lightbox");
    const lightboxImage = document.getElementById("lightbox-image");

    if (!grid || !lightbox || !lightboxImage) return;

    const closeButton = lightbox.querySelector(".lightbox-close");
    const prevButton = lightbox.querySelector(".lightbox-prev");
    const nextButton = lightbox.querySelector(".lightbox-next");

    let validImages = [];
    let currentIndex = 0;
    let pendingChecks = 0;

    const cards = Array.from(grid.querySelectorAll(".gallery-photo-card"));
    pendingChecks = cards.length;

    function finishImageCheck() {
        pendingChecks -= 1;

        if (pendingChecks > 0) return;

        validImages = Array.from(grid.querySelectorAll(".gallery-photo-card"))
            .filter(card => !card.classList.contains("image-missing"));

        if (!validImages.length) {
            grid.classList.add("hidden");
            emptyState?.classList.remove("hidden");
        } else {
            grid.classList.remove("hidden");
            emptyState?.classList.add("hidden");
        }
    }

    cards.forEach(card => {
        const img = card.querySelector("img");

        if (!img) {
            card.classList.add("image-missing");
            card.remove();
            finishImageCheck();
            return;
        }

        const markMissing = () => {
            card.classList.add("image-missing");
            card.remove();
            finishImageCheck();
        };

        const markReady = () => {
            finishImageCheck();
        };

        if (img.complete) {
            if (img.naturalWidth > 0) {
                markReady();
            } else {
                markMissing();
            }
        } else {
            img.addEventListener("load", markReady, { once: true });
            img.addEventListener("error", markMissing, { once: true });
        }
    });

    function refreshImages() {
        validImages = Array.from(grid.querySelectorAll(".gallery-photo-card"));
    }

    function openLightbox(index) {
        refreshImages();

        if (!validImages.length) return;

        currentIndex = (index + validImages.length) % validImages.length;

        const img = validImages[currentIndex].querySelector("img");

        lightboxImage.src = img.src;
        lightboxImage.alt = img.alt || "Foto Fino Demons";

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

        refreshImages();
        const index = validImages.indexOf(card);

        if (index >= 0) {
            openLightbox(index);
        }
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
});

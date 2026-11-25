
/* =====================================
   SUKOON - CARD FLIP NAVIGATION
===================================== */

document.addEventListener("DOMContentLoaded", function () {

  const featureCards = document.querySelectorAll(".feature-card");

  featureCards.forEach(function (card) {

    card.addEventListener("click", function (event) {

      // Prevent repeated clicks during animation
      if (card.classList.contains("is-flipping")) {
        event.preventDefault();
        return;
      }

      // Respect browser open-in-new-tab shortcuts
      if (
        event.ctrlKey ||
        event.metaKey ||
        event.shiftKey ||
        event.button !== 0
      ) {
        return;
      }

      const destination = card.getAttribute("href");

      if (!destination) {
        return;
      }

      // Reduced motion accessibility
      if (
        window.matchMedia(
          "(prefers-reduced-motion: reduce)"
        ).matches
      ) {
        return;
      }

      // Stop immediate navigation
      event.preventDefault();

      // Start flip animation
      card.classList.add("is-flipping");

      // Open destination after animation
      window.setTimeout(function () {
        window.location.href = destination;
      }, 560);

    });

  });

});


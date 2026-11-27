
/* =============================================
   SUKOON — UNIVERSAL FEATURE CARD FLIP
   Home Cards + Prayer Feature Cards
   Navigate after animation completes
============================================= */

(() => {
  "use strict";

  const CARD_SELECTOR =
    ".sukoon-v2-path, .pd-feature-card, .feature-card";

  const FLIP_DURATION = 560;
  const activeCards = new WeakSet();

  function isPlainPrimaryClick(event) {
    return (
      event.button === 0 &&
      !event.ctrlKey &&
      !event.metaKey &&
      !event.shiftKey &&
      !event.altKey
    );
  }

  document.addEventListener("click", (event) => {
    const card = event.target.closest(CARD_SELECTOR);

    if (!card || !card.matches("a[href]")) return;

    // Preserve normal browser behaviour for modified clicks.
    if (!isPlainPrimaryClick(event) || event.defaultPrevented) return;

    const destination = card.getAttribute("href");

    if (
      !destination ||
      destination.startsWith("#") ||
      destination.startsWith("javascript:")
    ) return;

    // Do not animate external links or downloads.
    if (card.target && card.target !== "_self") return;
    if (card.hasAttribute("download")) return;

    // Prevent repeated clicks during animation.
    if (activeCards.has(card)) {
      event.preventDefault();
      return;
    }

    const reduceMotion =
      window.matchMedia &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (reduceMotion || typeof card.animate !== "function") return;

    event.preventDefault();

    activeCards.add(card);
    card.setAttribute("aria-busy", "true");

    const animation = card.animate(
      [
        {
          transform: "perspective(900px) rotateY(0deg) scale(1)",
          opacity: 1,
          offset: 0
        },
        {
          transform: "perspective(900px) rotateY(82deg) scale(.96)",
          opacity: .82,
          offset: .48
        },
        {
          transform: "perspective(900px) rotateY(180deg) scale(.94)",
          opacity: .55,
          offset: 1
        }
      ],
      {
        duration: FLIP_DURATION,
        easing: "cubic-bezier(.55,.08,.35,1)",
        fill: "forwards"
      }
    );

    animation.onfinish = () => {
      window.location.assign(destination);
    };

    animation.oncancel = () => {
      activeCards.delete(card);
      card.removeAttribute("aria-busy");
    };
  }, true);
})();

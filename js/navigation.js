
/* =============================================
   SUKOON — FULL SCREEN CARD FLIP NAVIGATION
   Home Cards + Prayer Feature Cards

   Animation:
   1. Card lifts from its original position.
   2. Card zooms towards full screen.
   3. Card flips to reveal SUKOON back face.
   4. Destination page opens after animation.
============================================= */

(() => {
  "use strict";

  const CARD_SELECTOR =
    ".sukoon-v2-path, .pd-feature-card, .feature-card";

  // Slower, smoother transition
  const FLIP_DURATION = 1250;

  let isNavigating = false;

  function isPlainPrimaryClick(event) {
    return (
      event.button === 0 &&
      !event.ctrlKey &&
      !event.metaKey &&
      !event.shiftKey &&
      !event.altKey
    );
  }

  function removeIds(element) {
    if (element.removeAttribute) {
      element.removeAttribute("id");
    }

    element.querySelectorAll("[id]").forEach(item => {
      item.removeAttribute("id");
    });
  }

  function createBackFace() {
    const back = document.createElement("div");

    back.className = "sukoon-flip-back";

    Object.assign(back.style, {
      position: "absolute",
      inset: "0",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      gap: "18px",
      padding: "30px",
      boxSizing: "border-box",
      border: "2px solid #B89558",
      borderRadius: "26px",
      background:
        "radial-gradient(circle at center, #70283F 0%, #421729 72%)",
      color: "#F4EFE5",
      backfaceVisibility: "hidden",
      transform: "rotateY(180deg)",
      overflow: "hidden"
    });

    const symbol = document.createElement("div");
    symbol.textContent = "۞";

    Object.assign(symbol.style, {
      color: "#B89558",
      fontSize: "clamp(48px, 12vw, 82px)",
      lineHeight: "1"
    });

    const title = document.createElement("div");
    title.textContent = "SUKOON";

    Object.assign(title.style, {
      color: "#F4EFE5",
      fontSize: "clamp(24px, 7vw, 38px)",
      fontWeight: "800",
      letterSpacing: "7px"
    });

    const subtitle = document.createElement("div");
    subtitle.textContent = "روح کا اطمینان";

    Object.assign(subtitle.style, {
      color: "#B89558",
      fontSize: "16px"
    });

    back.append(symbol, title, subtitle);

    return back;
  }

  function startCardTransition(card, destination) {
    if (isNavigating) return;

    const rect = card.getBoundingClientRect();

    if (!rect.width || !rect.height) {
      window.location.assign(destination);
      return;
    }

    isNavigating = true;

    const overlay = document.createElement("div");

    Object.assign(overlay.style, {
      position: "fixed",
      left: rect.left + "px",
      top: rect.top + "px",
      width: rect.width + "px",
      height: rect.height + "px",
      zIndex: "2147483647",
      perspective: "1400px",
      pointerEvents: "none",
      margin: "0"
    });

    const flipBox = document.createElement("div");

    Object.assign(flipBox.style, {
      position: "relative",
      width: "100%",
      height: "100%",
      transformStyle: "preserve-3d",
      transformOrigin: "center center"
    });

    // Front face: exact copy of the clicked card
    const front = card.cloneNode(true);

    removeIds(front);

    Object.assign(front.style, {
      position: "absolute",
      inset: "0",
      width: "100%",
      height: "100%",
      margin: "0",
      boxSizing: "border-box",
      backfaceVisibility: "hidden",
      transform: "rotateY(0deg)",
      pointerEvents: "none"
    });

    // Back face: SUKOON branded surface
    const back = createBackFace();

    flipBox.append(front, back);
    overlay.appendChild(flipBox);

    document.body.appendChild(overlay);

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    // Hide original card while the animated copy takes over
    const originalVisibility = card.style.visibility;
    card.style.visibility = "hidden";

    const fullWidth = window.innerWidth;
    const fullHeight = window.innerHeight;

    const animation = flipBox.animate(
      [
        {
          transform: "rotateY(0deg) scale(1)",
          offset: 0
        },
        {
          transform: "rotateY(12deg) scale(1.08)",
          offset: 0.16
        },
        {
          transform: "rotateY(90deg) scale(1.12)",
          offset: 0.48
        },
        {
          transform: "rotateY(180deg) scale(1)",
          offset: 1
        }
      ],
      {
        duration: FLIP_DURATION,
        easing: "cubic-bezier(.22,.75,.25,1)",
        fill: "forwards"
      }
    );

    // Expand the card from its original position to the full screen
    const sizeAnimation = overlay.animate(
      [
        {
          left: rect.left + "px",
          top: rect.top + "px",
          width: rect.width + "px",
          height: rect.height + "px",
          borderRadius: "20px"
        },
        {
          left: "0px",
          top: "0px",
          width: fullWidth + "px",
          height: fullHeight + "px",
          borderRadius: "0px"
        }
      ],
      {
        duration: FLIP_DURATION,
        easing: "cubic-bezier(.22,.75,.25,1)",
        fill: "forwards"
      }
    );

    animation.onfinish = () => {
      window.location.assign(destination);
    };

    animation.oncancel = () => {
      overlay.remove();
      card.style.visibility = originalVisibility;
      document.body.style.overflow = originalOverflow;
      isNavigating = false;
    };

    sizeAnimation.oncancel = () => {
      // The main animation handles navigation and cleanup.
    };
  }

  document.addEventListener("click", event => {
    const card = event.target.closest(CARD_SELECTOR);

    if (!card || !card.matches("a[href]")) return;

    if (!isPlainPrimaryClick(event) || event.defaultPrevented) {
      return;
    }

    const destination = card.getAttribute("href");

    if (
      !destination ||
      destination.startsWith("#") ||
      destination.startsWith("javascript:")
    ) {
      return;
    }

    // Keep external links, downloads and new tabs unchanged
    if (card.target && card.target !== "_self") return;
    if (card.hasAttribute("download")) return;

    if (isNavigating) {
      event.preventDefault();
      return;
    }

    const reduceMotion =
      window.matchMedia &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (
      reduceMotion ||
      typeof card.animate !== "function"
    ) {
      return;
    }

    event.preventDefault();

    startCardTransition(card, destination);

  }, true);

})();

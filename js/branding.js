

/* =========================================
   SUKOON — CENTRAL BRANDING SYSTEM
   One place to manage app logos
========================================= */

(() => {
  "use strict";

  const BRANDING = {
    logo: "../assets/images/branding/sukoon-logo.png",
    icon: "../assets/images/branding/sukoon-icon.png"
  };

  // Make branding paths available across the app
  window.SUKOON_BRANDING = BRANDING;

  // Automatically update elements using data-branding
  function applyBranding() {
    document.querySelectorAll("[data-branding='logo']").forEach((element) => {
      element.src = BRANDING.logo;
    });

    document.querySelectorAll("[data-branding='icon']").forEach((element) => {
      element.src = BRANDING.icon;
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", applyBranding);
  } else {
    applyBranding();
  }
})();

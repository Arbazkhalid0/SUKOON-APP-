
/* =========================================
   SUKOON — HOME SCREEN ENGINE
   Date • Live Clock • Weekday
========================================= */

(() => {
  "use strict";

  // آج کی تاریخ
  function updateTodayDate() {
    const element = document.getElementById("today-date");
    if (!element) return;

    const today = new Date();

    try {
      element.textContent = new Intl.DateTimeFormat("ur-PK", {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric"
      }).format(today);
    } catch (error) {
      element.textContent = today.toDateString();
    }
  }

  // مقامی وقت اور ہفتے کا دن
  function updateHomeClock() {
    const clockElement = document.getElementById("home-clock");
    const weekdayElement = document.getElementById("home-weekday");

    const now = new Date();

    if (clockElement) {
      try {
        clockElement.textContent = new Intl.DateTimeFormat("ur-PK", {
          hour: "2-digit",
          minute: "2-digit",
          hour12: true
        }).format(now);
      } catch (error) {
        clockElement.textContent = now.toLocaleTimeString();
      }
    }

    if (weekdayElement) {
      try {
        weekdayElement.textContent = new Intl.DateTimeFormat("ur-PK", {
          weekday: "long"
        }).format(now);
      } catch (error) {
        weekdayElement.textContent = now.toLocaleDateString("en", {
          weekday: "long"
        });
      }
    }
  }

  // ہوم پیج شروع کریں
  function initializeSukoonApp() {
    updateTodayDate();
    updateHomeClock();

    console.log("SUKOON Home Screen Started");
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initializeSukoonApp);
  } else {
    initializeSukoonApp();
  }

  // ہر 30 سیکنڈ بعد وقت اپڈیٹ کریں
  setInterval(updateHomeClock, 30000);

  // ایپ دوبارہ کھولنے پر تاریخ اور وقت اپڈیٹ کریں
  document.addEventListener("visibilitychange", () => {
    if (!document.hidden) {
      updateTodayDate();
      updateHomeClock();
    }
  });

})();

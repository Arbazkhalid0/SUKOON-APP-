
/* ==========================================
   SUKOON — PAKISTAN HIJRI DATE
   Official month-start anchor + offline support
========================================== */

(() => {
  "use strict";

  const STORAGE_KEY = "hijri_official_anchor";
  const CACHE_KEY = "hijri_last_display";

  // Pakistan calendar reference:
  // 1 Jumada al-Thani 1448 = 12 November 2026
  const DEFAULT_ANCHOR = {
    gregorianDate: "2026-11-12",
    hijriDay: 1,
    hijriMonth: 6,
    hijriYear: 1448,
    monthDays: 29
  };

  const MONTHS = [
    "",
    "محرم",
    "صفر",
    "ربیع الاول",
    "ربیع الثانی",
    "جمادی الاول",
    "جمادی الثانی",
    "رجب",
    "شعبان",
    "رمضان",
    "شوال",
    "ذوالقعدہ",
    "ذوالحجہ"
  ];

  function toUrduDigits(value) {
    return String(value).replace(
      /\d/g,
      digit => "۰۱۲۳۴۵۶۷۸۹"[Number(digit)]
    );
  }

  function getPakistanDate() {
    const parts = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Karachi",
      year: "numeric",
      month: "2-digit",
      day: "2-digit"
    }).formatToParts(new Date());

    const date = {};

    parts.forEach(part => {
      if (part.type !== "literal") {
        date[part.type] = Number(part.value);
      }
    });

    return date;
  }

  function dayNumber(year, month, day) {
    return Math.floor(
      Date.UTC(year, month - 1, day) / 86400000
    );
  }

  function getAnchor() {
    if (window.SukoonStorage) {
      const saved = window.SukoonStorage.get(
        STORAGE_KEY,
        null
      );

      if (isValidAnchor(saved)) return saved;
    }

    return DEFAULT_ANCHOR;
  }

  function isValidAnchor(data) {
    if (!data) return false;

    if (!/^\d{4}-\d{2}-\d{2}$/.test(data.gregorianDate)) {
      return false;
    }

    return (
      Number.isInteger(data.hijriDay) &&
      Number.isInteger(data.hijriMonth) &&
      Number.isInteger(data.hijriYear) &&
      Number.isInteger(data.monthDays) &&
      data.hijriDay >= 1 &&
      data.hijriDay <= 30 &&
      data.hijriMonth >= 1 &&
      data.hijriMonth <= 12 &&
      data.hijriYear >= 1 &&
      data.monthDays >= 29 &&
      data.monthDays <= 30
    );
  }

  function getHijriDate() {
    const anchor = getAnchor();
    const today = getPakistanDate();

    const [year, month, day] =
      anchor.gregorianDate.split("-").map(Number);

    const difference =
      dayNumber(today.year, today.month, today.day) -
      dayNumber(year, month, day);

    if (difference < 0) {
      return {
        text: "اسلامی تاریخ دستیاب نہیں",
        source: "unavailable"
      };
    }

    const hijriDay = anchor.hijriDay + difference;

    // Do not guess the next month's moon-sighting date.
    if (hijriDay > anchor.monthDays) {
      return {
        text: "نئے چاند کے اعلان کا انتظار",
        source: "awaiting-announcement"
      };
    }

    const text =
      toUrduDigits(hijriDay) + " " +
      MONTHS[anchor.hijriMonth] + " " +
      toUrduDigits(anchor.hijriYear) + "ھ";

    return {
      text,
      source: "Pakistan-month-start"
    };
  }

  function updateHomeHijriDate() {
    const element = document.getElementById("today-hijri");
    if (!element) return;

    const result = getHijriDate();
    element.textContent = result.text;

    if (window.SukoonStorage) {
      window.SukoonStorage.set(CACHE_KEY, {
        text: result.text,
        source: result.source,
        updatedAt: new Date().toISOString()
      });
    }
  }

  // Use this function when a new official month is announced.
  // gregorianDate must be the Gregorian date of 1st Hijri day.
  function setOfficialAnchor(data) {
    if (!isValidAnchor(data)) return false;
    if (!window.SukoonStorage) return false;

    const saved = window.SukoonStorage.set(
      STORAGE_KEY,
      {
        gregorianDate: data.gregorianDate,
        hijriDay: data.hijriDay,
        hijriMonth: data.hijriMonth,
        hijriYear: data.hijriYear,
        monthDays: data.monthDays,
        announcementId: data.announcementId || null,
        verifiedAt: data.verifiedAt || new Date().toISOString()
      }
    );

    if (saved) updateHomeHijriDate();
    return saved;
  }

  function initialize() {
    updateHomeHijriDate();

    document.addEventListener("visibilitychange", () => {
      if (!document.hidden) {
        updateHomeHijriDate();
      }
    });
  }

  window.SukoonHijriCalendar = {
    getToday: getHijriDate,
    update: updateHomeHijriDate,
    setOfficialAnchor
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initialize);
  } else {
    initialize();
  }
})();

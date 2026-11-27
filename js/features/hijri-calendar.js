
/* ==========================================
   SUKOON — HIJRI CALENDAR ENGINE
   Pakistan Time • Offline Cache • Official
   Moon-Sighting Date Override
========================================== */

(() => {
  "use strict";

  const STORAGE_KEY = "hijri_official_anchor";
  const CACHE_KEY = "hijri_last_display";
  const TIME_ZONE = "Asia/Karachi";

  // پاکستان کی موجودہ تاریخ حاصل کریں
  function getPakistanDate() {
    const parts = new Intl.DateTimeFormat("en-CA", {
      timeZone: TIME_ZONE,
      year: "numeric",
      month: "2-digit",
      day: "2-digit"
    }).formatToParts(new Date());

    const result = {};

    parts.forEach(part => {
      if (part.type !== "literal") {
        result[part.type] = Number(part.value);
      }
    });

    return result;
  }

  // تاریخ کو UTC دنوں میں تبدیل کریں
  function toDayNumber(year, month, day) {
    return Math.floor(
      Date.UTC(year, month - 1, day) / 86400000
    );
  }

  // سرکاری اعلان سے محفوظ کردہ تاریخ حاصل کریں
  function getOfficialAnchor() {
    if (!window.SukoonStorage) return null;

    const anchor = window.SukoonStorage.get(
      STORAGE_KEY,
      null
    );

    if (!anchor) return null;

    if (
      !anchor.gregorianDate ||
      !anchor.hijriDay ||
      !anchor.hijriMonth ||
      !anchor.hijriYear
    ) {
      return null;
    }

    return anchor;
  }

  // سرکاری بنیاد کی تاریخ سے موجودہ ہجری تاریخ نکالیں
  function calculateFromOfficialAnchor(anchor, today) {
    const [year, month, day] =
      anchor.gregorianDate.split("-").map(Number);

    const difference =
      toDayNumber(today.year, today.month, today.day) -
      toDayNumber(year, month, day);

    if (difference < 0 || difference > 45) {
      return null;
    }

    const baseDate = new Date(Date.UTC(
      anchor.hijriYear,
      anchor.hijriMonth - 1,
      anchor.hijriDay + difference
    ));

    return {
      day: baseDate.getUTCDate(),
      month: baseDate.getUTCMonth() + 1,
      year: baseDate.getUTCFullYear(),
      source: "official-anchor"
    };
  }

  // عارضی حسابی تاریخ — سرکاری تصدیق نہیں
  function calculateApproximateDate() {
    const formatter = new Intl.DateTimeFormat(
      "ur-PK-u-ca-islamic-umalqura",
      {
        timeZone: TIME_ZONE,
        day: "numeric",
        month: "long",
        year: "numeric"
      }
    );

    return {
      text: formatter.format(new Date()),
      source: "calculated"
    };
  }

  // ہجری مہینوں کے نام
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

  // اردو ہندسوں میں تبدیلی
  function toUrduDigits(value) {
    return String(value).replace(/\d/g, digit =>
      "۰۱۲۳۴۵۶۷۸۹"[Number(digit)]
    );
  }

  // تاریخ کو اردو میں دکھائیں
  function formatOfficialDate(date) {
    return (
      toUrduDigits(date.day) +
      " " +
      MONTHS[date.month] +
      " " +
      toUrduDigits(date.year) +
      "ھ"
    );
  }

  // آج کی ہجری تاریخ حاصل کریں
  function getToday() {
    const today = getPakistanDate();
    const anchor = getOfficialAnchor();

    if (anchor) {
      const officialDate =
        calculateFromOfficialAnchor(anchor, today);

      if (officialDate) {
        return {
          text: formatOfficialDate(officialDate),
          source: "official-anchor"
        };
      }
    }

    return calculateApproximateDate();
  }

  // ہوم اسکرین پر تاریخ دکھائیں
  function updateHomeHijriDate() {
    const element = document.getElementById("today-hijri");

    if (!element) return;

    const result = getToday();

    element.textContent = result.text;

    if (window.SukoonStorage) {
      window.SukoonStorage.set(CACHE_KEY, {
        text: result.text,
        source: result.source,
        updatedAt: new Date().toISOString()
      });
    }
  }

  // سرکاری اعلان سے تصدیق شدہ بنیاد محفوظ کرنا
  function setOfficialAnchor(data) {
    if (
      !data ||
      !/^\d{4}-\d{2}-\d{2}$/.test(data.gregorianDate) ||
      !Number.isInteger(data.hijriDay) ||
      !Number.isInteger(data.hijriMonth) ||
      !Number.isInteger(data.hijriYear) ||
      data.hijriDay < 1 ||
      data.hijriDay > 30 ||
      data.hijriMonth < 1 ||
      data.hijriMonth > 12 ||
      data.hijriYear < 1
    ) {
      return false;
    }

    const anchor = {
      gregorianDate: data.gregorianDate,
      hijriDay: data.hijriDay,
      hijriMonth: data.hijriMonth,
      hijriYear: data.hijriYear,
      announcementId: data.announcementId || null,
      verifiedAt: data.verifiedAt || new Date().toISOString()
    };

    const saved = window.SukoonStorage &&
      window.SukoonStorage.set(STORAGE_KEY, anchor);

    if (saved) updateHomeHijriDate();

    return Boolean(saved);
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
    getToday,
    update: updateHomeHijriDate,
    setOfficialAnchor
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initialize);
  } else {
    initialize();
  }

})();

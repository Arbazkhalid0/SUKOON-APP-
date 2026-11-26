
/* =========================================
   SUKOON — PRAYER DASHBOARD ENGINE
   Current Prayer • Next Prayer • Live Timer
   Global Location Integration
========================================= */

(() => {
  "use strict";

  const $ = id => document.getElementById(id);

  const PRAYERS = [
    { key: "fajr", api: "Fajr", name: "فجر", icon: "🌅" },
    { key: "dhuhr", api: "Dhuhr", name: "ظہر", icon: "☀️" },
    { key: "asr", api: "Asr", name: "عصر", icon: "🌤️" },
    { key: "maghrib", api: "Maghrib", name: "مغرب", icon: "🌇" },
    { key: "isha", api: "Isha", name: "عشاء", icon: "🌙" }
  ];

  const METHOD = 1; // Karachi calculation method
  const SCHOOL = 1; // Hanafi Asr

  const CACHE_KEY = "sukoon_prayer_dashboard_cache";

  let todayTimings = null;
  let tomorrowTimings = null;
  let activeLocation = null;
  let timer = null;
  let loading = false;

  /* -----------------------------------------
     STORAGE
  ----------------------------------------- */

  function readStorage(key, fallback = null) {
    try {
      if (window.SukoonStorage) {
        return SukoonStorage.get(key, fallback);
      }

      const value = localStorage.getItem("sukoon_" + key);
      return value ? JSON.parse(value) : fallback;
    } catch (error) {
      console.error("SUKOON storage error:", error);
      return fallback;
    }
  }

  function saveStorage(key, value) {
    try {
      if (window.SukoonStorage) {
        SukoonStorage.set(key, value);
      } else {
        localStorage.setItem("sukoon_" + key, JSON.stringify(value));
      }
    } catch (error) {
      console.error("SUKOON storage save error:", error);
    }
  }

  /* -----------------------------------------
     GLOBAL LOCATION
  ----------------------------------------- */

  function getGlobalLocation() {
    return readStorage("location", null) ||
      readStorage("sukoon_location", null);
  }

  function getTimezone() {
    return activeLocation?.timezone || "Asia/Karachi";
  }

  function getLocalParts(date = new Date()) {
    const parts = new Intl.DateTimeFormat("en-GB", {
      timeZone: getTimezone(),
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hourCycle: "h23"
    }).formatToParts(date);

    const result = {};

    parts.forEach(part => {
      if (part.type !== "literal") {
        result[part.type] = Number(part.value);
      }
    });

    return result;
  }

  function dateString(date = new Date()) {
    const p = getLocalParts(date);

    return [
      p.year,
      String(p.month).padStart(2, "0"),
      String(p.day).padStart(2, "0")
    ].join("-");
  }

  function shiftDate(dateText, amount) {
    const [year, month, day] = dateText.split("-").map(Number);
    const date = new Date(Date.UTC(year, month - 1, day + amount));

    return [
      date.getUTCFullYear(),
      String(date.getUTCMonth() + 1).padStart(2, "0"),
      String(date.getUTCDate()).padStart(2, "0")
    ].join("-");
  }

  function apiDate(dateText) {
    const [year, month, day] = dateText.split("-");
    return `${day}-${month}-${year}`;
  }

  function getCityName() {
    if (!activeLocation) return "لوکیشن منتخب نہیں";

    return (
      activeLocation.city ||
      activeLocation.cityName ||
      activeLocation.name ||
      activeLocation.region ||
      "منتخب شہر"
    );
  }

  /* -----------------------------------------
     TIME HELPERS
  ----------------------------------------- */

  function cleanTime(value) {
    return String(value || "")
      .replace(/\s*\([^)]*\)/g, "")
      .trim()
      .slice(0, 5);
  }

  function zonedDateTime(dateText, timeText) {
    const [year, month, day] = dateText.split("-").map(Number);
    const [hour, minute] = cleanTime(timeText).split(":").map(Number);

    if (
      !year || !month || !day ||
      Number.isNaN(hour) || Number.isNaN(minute)
    ) {
      return null;
    }

    const timezone = getTimezone();

    const desiredUTC = Date.UTC(
      year, month - 1, day, hour, minute, 0
    );

    let guess = desiredUTC;

    for (let i = 0; i < 3; i++) {
      const parts = new Intl.DateTimeFormat("en-GB", {
        timeZone: timezone,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hourCycle: "h23"
      }).formatToParts(new Date(guess));

      const actual = {};

      parts.forEach(part => {
        if (part.type !== "literal") {
          actual[part.type] = Number(part.value);
        }
      });

      const actualUTC = Date.UTC(
        actual.year,
        actual.month - 1,
        actual.day,
        actual.hour,
        actual.minute,
        actual.second
      );

      guess += desiredUTC - actualUTC;
    }

    return new Date(guess);
  }

  function displayTime(time) {
    const clean = cleanTime(time);
    const [hour, minute] = clean.split(":").map(Number);

    if (Number.isNaN(hour) || Number.isNaN(minute)) {
      return "--:--";
    }

    const suffix = hour >= 12 ? "PM" : "AM";
    const twelveHour = hour % 12 || 12;

    return `${String(twelveHour).padStart(2, "0")}:${String(minute).padStart(2, "0")} ${suffix}`;
  }

  function displayDate(date = new Date()) {
    return new Intl.DateTimeFormat("ur-PK", {
      timeZone: getTimezone(),
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric"
    }).format(date);
  }

  function countdown(milliseconds) {
    const seconds = Math.max(0, Math.floor(milliseconds / 1000));

    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const remaining = seconds % 60;

    return [
      String(hours).padStart(2, "0"),
      String(minutes).padStart(2, "0"),
      String(remaining).padStart(2, "0")
    ].join(":");
  }

  function setText(id, value) {
    const element = $(id);
    if (element) element.textContent = value;
  }

  /* -----------------------------------------
     STATUS MESSAGE
  ----------------------------------------- */

  function setStatus(message, isError = false) {
    const element = $("pd-schedule-status");

    if (!element) return;

    element.textContent = message;
    element.style.color = isError ? "#b33b42" : "";
  }

  /* -----------------------------------------
     PRAYER API
  ----------------------------------------- */

  async function fetchTimings(dateText) {
    if (
      !activeLocation ||
      typeof activeLocation.latitude !== "number" ||
      typeof activeLocation.longitude !== "number"
    ) {
      throw new Error("منتخب لوکیشن کے کوآرڈینیٹس دستیاب نہیں ہیں۔");
    }

    const params = new URLSearchParams({
      latitude: activeLocation.latitude,
      longitude: activeLocation.longitude,
      method: METHOD,
      school: SCHOOL
    });

    const url =
      `https://api.aladhan.com/v1/timings/${apiDate(dateText)}?${params}`;

    const response = await fetch(url);

    if (!response.ok) {
      throw new Error("نماز کے اوقات حاصل نہیں ہو سکے۔");
    }

    const result = await response.json();

    if (result.code !== 200 || !result.data?.timings) {
      throw new Error("نماز کے اوقات کا ڈیٹا درست نہیں ہے۔");
    }

    return result.data.timings;
  }

  async function loadTimings(forceRefresh = false) {
    if (loading) return;

    activeLocation = getGlobalLocation();

    if (!activeLocation) {
      setStatus("براہِ کرم پہلے Settings میں اپنی لوکیشن منتخب کریں۔", true);
      setText("pd-location", "📍 لوکیشن منتخب نہیں");
      return;
    }

    const currentDate = dateString();
    const nextDate = shiftDate(currentDate, 1);

    const cache = readStorage(CACHE_KEY, null);

    if (
      !forceRefresh &&
      cache &&
      cache.date === currentDate &&
      cache.locationLatitude === activeLocation.latitude &&
      cache.locationLongitude === activeLocation.longitude
    ) {
      todayTimings = cache.today;
      tomorrowTimings = cache.tomorrow;

      renderDashboard();
    }

    loading = true;
    setStatus("نمازوں کے اوقات اپڈیٹ کیے جا رہے ہیں...");

    const refreshButton = $("pd-refresh");
    if (refreshButton) refreshButton.disabled = true;

    try {
      const [today, tomorrow] = await Promise.all([
        fetchTimings(currentDate),
        fetchTimings(nextDate)
      ]);

      todayTimings = today;
      tomorrowTimings = tomorrow;

      saveStorage(CACHE_KEY, {
        date: currentDate,
        today,
        tomorrow,
        locationLatitude: activeLocation.latitude,
        locationLongitude: activeLocation.longitude
      });

      renderDashboard();

      setStatus(`${getCityName()} کے نماز اوقات اپڈیٹ ہو گئے ہیں۔`);

    } catch (error) {
      console.error("Prayer dashboard:", error);

      if (todayTimings && tomorrowTimings) {
        renderDashboard();
        setStatus("محفوظ شدہ نماز اوقات دکھائے جا رہے ہیں۔");
      } else {
        setStatus(
          error.message || "نماز کے اوقات حاصل نہیں ہو سکے۔",
          true
        );
      }

    } finally {
      loading = false;
      if (refreshButton) refreshButton.disabled = false;
    }
  }

  /* -----------------------------------------
     PRAYER PERIODS
  ----------------------------------------- */

  function buildPeriods(dateText, timings) {
    if (!timings) return [];

    const nextDate = shiftDate(dateText, 1);

    return [
      {
        key: "fajr",
        name: "فجر",
        start: zonedDateTime(dateText, timings.Fajr),
        end: zonedDateTime(dateText, timings.Sunrise),
        startText: timings.Fajr,
        endText: timings.Sunrise
      },
      {
        key: "dhuhr",
        name: "ظہر",
        start: zonedDateTime(dateText, timings.Dhuhr),
        end: zonedDateTime(dateText, timings.Asr),
        startText: timings.Dhuhr,
        endText: timings.Asr
      },
      {
        key: "asr",
        name: "عصر",
        start: zonedDateTime(dateText, timings.Asr),
        end: zonedDateTime(dateText, timings.Maghrib),
        startText: timings.Asr,
        endText: timings.Maghrib
      },
      {
        key: "maghrib",
        name: "مغرب",
        start: zonedDateTime(dateText, timings.Maghrib),
        end: zonedDateTime(dateText, timings.Isha),
        startText: timings.Maghrib,
        endText: timings.Isha
      },
      {
        key: "isha",
        name: "عشاء",
        start: zonedDateTime(dateText, timings.Isha),
        end: zonedDateTime(nextDate, tomorrowTimings?.Fajr),
        startText: timings.Isha,
        endText: tomorrowTimings?.Fajr
      }
    ];
  }

  function getAllPeriods() {
    const today = dateString();
    const yesterday = shiftDate(today, -1);
    const tomorrow = shiftDate(today, 1);

    const periods = [
      ...buildPeriods(yesterday, null),
      ...buildPeriods(today, todayTimings),
      ...buildPeriods(tomorrow, tomorrowTimings)
    ];

    // Yesterday's Isha can still be active after midnight.
    const cache = readStorage(CACHE_KEY, null);

    if (cache?.yesterday) {
      periods.unshift(
        ...buildPeriods(yesterday, cache.yesterday)
      );
    }

    return periods.filter(period =>
      period.start instanceof Date &&
      !Number.isNaN(period.start.getTime()) &&
      period.end instanceof Date &&
      !Number.isNaN(period.end.getTime())
    );
  }

  function getActiveAndNext() {
    const now = new Date();
    const periods = getAllPeriods();

    const active = periods.find(period =>
      now >= period.start && now < period.end
    ) || null;

    const next = periods
      .filter(period => period.start > now)
      .sort((a, b) => a.start - b.start)[0] || null;

    return { active, next, now };
  }

  /* -----------------------------------------
     RENDER PRAYER TIMES
  ----------------------------------------- */

  function renderPrayerTimes() {
    PRAYERS.forEach(prayer => {
      const value = todayTimings?.[prayer.api];

      setText(
        `pd-time-${prayer.key}`,
        value ? displayTime(value) : "--:--"
      );
    });
  }

  /* -----------------------------------------
     RENDER CURRENT & NEXT PRAYER
  ----------------------------------------- */

  function renderPrayerStatus() {
    if (!todayTimings || !tomorrowTimings) return;

    const { active, next, now } = getActiveAndNext();

    setText(
      "pd-current-status",
      active ? "نماز کا وقت جاری ہے" : "اس وقت کوئی نماز کا وقت جاری نہیں"
    );

    setText(
      "pd-current-name",
      active ? active.name : "کوئی وقت جاری نہیں"
    );

    setText(
      "pd-current-period",
      active
        ? "موجودہ نماز کا وقت"
        : "اگلی نماز کے آغاز تک انتظار"
    );

    setText(
      "pd-current-start",
      active ? displayTime(active.startText) : "--:--"
    );

    setText(
      "pd-current-end",
      active ? displayTime(active.endText) : "--:--"
    );

    setText(
      "pd-current-countdown",
      active
        ? countdown(active.end - now)
        : next
          ? countdown(next.start - now)
          : "--:--:--"
    );

    setText(
      "pd-next-name",
      next ? next.name : "--"
    );

    setText(
      "pd-next-start",
      next ? displayTime(next.startText) : "--:--"
    );

    setText(
      "pd-next-end",
      next ? displayTime(next.endText) : "--:--"
    );

    setText(
      "pd-next-countdown",
      next ? countdown(next.start - now) : "--:--:--"
    );

    document.querySelectorAll("[data-prayer]").forEach(row => {
      const key = row.dataset.prayer;
      row.classList.toggle(
        "is-active",
        Boolean(active && active.key === key)
      );

      const state = row.querySelector(".pd-time-state");

      if (state) {
        state.textContent =
          active?.key === key ? "جاری ہے" :
          next?.key === key ? "اگلی نماز" : "";
      }
    });
  }

  /* -----------------------------------------
     DASHBOARD
  ----------------------------------------- */

  function renderDashboard() {
    if (!todayTimings || !tomorrowTimings) return;

    setText("pd-location", `📍 ${getCityName()}`);
    setText("pd-date", displayDate());

    renderPrayerTimes();
    renderPrayerStatus();
  }

  /* -----------------------------------------
     LIVE CLOCK
  ----------------------------------------- */

  function startClock() {
    if (timer) clearInterval(timer);

    timer = setInterval(() => {
      if (!todayTimings || !tomorrowTimings) return;

      const currentDate = dateString();

      if (currentDate !== loadedDate) {
        loadedDate = currentDate;
        loadTimings(true);
        return;
      }

      renderPrayerStatus();
    }, 1000);
  }

  let loadedDate = dateString();

  /* -----------------------------------------
     LOCATION CHANGE
  ----------------------------------------- */

  window.addEventListener("sukoon:locationChanged", () => {
    activeLocation = getGlobalLocation();
    todayTimings = null;
    tomorrowTimings = null;
    loadedDate = dateString();

    loadTimings(true);
  });

  /* -----------------------------------------
     REFRESH BUTTON
  ----------------------------------------- */

  const refreshButton = $("pd-refresh");

  if (refreshButton) {
    refreshButton.addEventListener("click", () => {
      loadTimings(true);
    });
  }

  /* -----------------------------------------
     INITIALIZE
  ----------------------------------------- */

  async function init() {
    activeLocation = getGlobalLocation();

    if (activeLocation) {
      setText("pd-location", `📍 ${getCityName()}`);
    } else {
      setText("pd-location", "📍 لوکیشن منتخب نہیں");
    }

    await loadTimings();
    startClock();
  }

  init();

})();

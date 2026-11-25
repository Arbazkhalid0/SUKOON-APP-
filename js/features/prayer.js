
/* =========================================
   SUKOON — PRAYER EXPERIENCE
   Live timings • Daily tracker • Weekly report
   Location • Active prayer • Local storage
========================================= */

(() => {
  "use strict";

  // 1. DEFAULT SETTINGS
  const METHOD = 1; // Karachi
  const SCHOOL = 1; // Hanafi Asr

  const PRAYERS = [
    { key: "fajr", api: "Fajr", name: "فجر", icon: "🌅" },
    { key: "midday", api: "Dhuhr", name: "ظہر", icon: "☀️" },
    { key: "asr", api: "Asr", name: "عصر", icon: "🌤️" },
    { key: "maghrib", api: "Maghrib", name: "مغرب", icon: "🌇" },
    { key: "isha", api: "Isha", name: "عشاء", icon: "🌙" }
  ];

  const $ = id => document.getElementById(id);

  let locationConfig = getSaved("location", null);
  let todayTimings = null;
  let tomorrowTimings = null;
  let clockTimer = null;
  let loadedDate = dateKey(new Date());
  let lastActivePrayer = null;

  // 2. LOCAL STORAGE
  function getSaved(key, fallback = null) {
    try {
      if (window.SukoonStorage) {
        return SukoonStorage.get(key, fallback);
      }

      const value = localStorage.getItem("sukoon_" + key);
      return value ? JSON.parse(value) : fallback;
    } catch (error) {
      console.error("Storage read error:", error);
      return fallback;
    }
  }

  function saveData(key, value) {
    try {
      if (window.SukoonStorage) {
        SukoonStorage.set(key, value);
      } else {
        localStorage.setItem("sukoon_" + key, JSON.stringify(value));
      }
    } catch (error) {
      console.error("Storage save error:", error);
    }
  }

  // 3. DATE AND TIME
  function dateKey(date) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }

  function apiDate(date) {
    return `${String(date.getDate()).padStart(2, "0")}-${String(date.getMonth() + 1).padStart(2, "0")}-${date.getFullYear()}`;
  }

  function cleanTime(value) {
    return String(value || "")
      .replace(/\s*\([^)]*\)/g, "")
      .trim()
      .slice(0, 5);
  }

  function makeDate(time, dayOffset = 0) {
    const [hours, minutes] = cleanTime(time).split(":").map(Number);

    const date = new Date();
    date.setDate(date.getDate() + dayOffset);
    date.setHours(hours, minutes, 0, 0);

    return date;
  }

  function displayTime(time) {
    const [hours, minutes] = cleanTime(time).split(":").map(Number);

    if (Number.isNaN(hours) || Number.isNaN(minutes)) {
      return "--:--";
    }

    const suffix = hours >= 12 ? "PM" : "AM";
    const hour = hours % 12 || 12;

    return `${String(hour).padStart(2, "0")}:${String(minutes).padStart(2, "0")} ${suffix}`;
  }

  function clockFormat(date) {
    return new Intl.DateTimeFormat("en-PK", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: true
    }).format(date);
  }

  function durationFormat(milliseconds) {
    const seconds = Math.max(0, Math.floor(milliseconds / 1000));
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;

    return [h, m, s]
      .map(n => String(n).padStart(2, "0"))
      .join(":");
  }

  function setText(id, value) {
    const element = $(id);
    if (element) element.textContent = value;
  }

  function showMessage(message, error = false) {
    const element = $("location-status");
    if (!element) return;

    element.textContent = message;
    element.classList.toggle("error-message", error);
  }

  // 4. PRAYER TIMINGS API
  async function fetchTimings(config, date) {
    const datePart = apiDate(date);
    let url;

    if (config.type === "gps") {
      const params = new URLSearchParams({
        latitude: config.latitude,
        longitude: config.longitude,
        method: METHOD,
        school: SCHOOL
      });

      url = `https://api.aladhan.com/v1/timings/${datePart}?${params}`;
    } else {
      const params = new URLSearchParams({
        city: config.city,
        country: "Pakistan",
        method: METHOD,
        school: SCHOOL
      });

      url = `https://api.aladhan.com/v1/timingsByCity/${datePart}?${params}`;
    }

    const response = await fetch(url);

    if (!response.ok) {
      throw new Error("Prayer timing service unavailable");
    }

    const result = await response.json();

    if (result.code !== 200 || !result.data?.timings) {
      throw new Error("Prayer timings not found");
    }

    return result.data;
  }

  async function loadPrayerTimings(config) {
    if (!config) return;

    showMessage("نمازوں کے اوقات حاصل کیے جا رہے ہیں...");

    const refresh = $("refresh-button");
    if (refresh) refresh.disabled = true;

    try {
      const now = new Date();
      const tomorrow = new Date(now);
      tomorrow.setDate(tomorrow.getDate() + 1);

      const [today, nextDay] = await Promise.all([
        fetchTimings(config, now),
        fetchTimings(config, tomorrow)
      ]);

      todayTimings = today.timings;
      tomorrowTimings = nextDay.timings;
      locationConfig = config;

      saveData("location", config);

      saveData("prayer_times_cache", {
        date: dateKey(now),
        today: today.timings,
        tomorrow: nextDay.timings,
        location: config
      });

      lastActivePrayer = null;

      renderPrayerTimes();
      updatePrayerStatus();

      setText(
        "current-city",
        config.cityName || config.city || "موجودہ لوکیشن"
      );

      showMessage(
        `${config.cityName || config.city || "آپ کی لوکیشن"} کے نماز اوقات اپڈیٹ ہو گئے ہیں۔`
      );

    } catch (error) {
      console.error(error);

      const cached = getSaved("prayer_times_cache", null);

      if (cached && cached.date === dateKey(new Date())) {
        todayTimings = cached.today;
        tomorrowTimings = cached.tomorrow;

        renderPrayerTimes();
        updatePrayerStatus();

        showMessage(
          "محفوظ شدہ اوقات دکھائے جا رہے ہیں۔ انٹرنیٹ ملنے پر دوبارہ اپڈیٹ کریں۔"
        );
      } else {
        showMessage(
          "اوقات حاصل نہیں ہو سکے۔ انٹرنیٹ یا شہر چیک کریں۔",
          true
        );
      }

    } finally {
      if (refresh) refresh.disabled = false;
    }
  }

  // 5. GPS CITY NAME
  async function getCityName(latitude, longitude) {
    try {
      const url =
        `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${latitude}&longitude=${longitude}&localityLanguage=ur`;

      const response = await fetch(url);

      if (!response.ok) {
        throw new Error("City lookup failed");
      }

      const data = await response.json();

      return (
        data.city ||
        data.locality ||
        data.principalSubdivision ||
        "موجودہ لوکیشن"
      );

    } catch (error) {
      console.error(error);
      return "موجودہ لوکیشن";
    }
  }

  // 6. PRAYER PERIODS
  function getPeriods() {
    if (!todayTimings || !tomorrowTimings) return [];

    const t = todayTimings;

    return [
      {
        key: "fajr",
        name: "فجر",
        start: makeDate(t.Fajr),
        end: makeDate(t.Sunrise),
        startText: t.Fajr,
        endText: t.Sunrise
      },
      {
        key: "midday",
        name: "ظہر",
        start: makeDate(t.Dhuhr),
        end: makeDate(t.Asr),
        startText: t.Dhuhr,
        endText: t.Asr
      },
      {
        key: "asr",
        name: "عصر",
        start: makeDate(t.Asr),
        end: makeDate(t.Maghrib),
        startText: t.Asr,
        endText: t.Maghrib
      },
      {
        key: "maghrib",
        name: "مغرب",
        start: makeDate(t.Maghrib),
        end: makeDate(t.Isha),
        startText: t.Maghrib,
        endText: t.Isha
      },
      {
        key: "isha",
        name: "عشاء",
        start: makeDate(t.Isha),
        end: makeDate(tomorrowTimings.Fajr, 1),
        startText: t.Isha,
        endText: tomorrowTimings.Fajr
      }
    ];
  }

  function getNextPrayer() {
    if (!todayTimings || !tomorrowTimings) return null;

    const now = new Date();

    for (const prayer of PRAYERS) {
      const time = makeDate(todayTimings[prayer.api]);

      if (time > now) {
        return {
          name: prayer.name,
          key: prayer.key,
          time
        };
      }
    }

    return {
      name: "فجر",
      key: "fajr",
      time: makeDate(tomorrowTimings.Fajr, 1)
    };
  }

  // 7. CURRENT PRAYER AND COUNTDOWN
  function updatePrayerStatus() {
    if (!todayTimings || !tomorrowTimings) return;

    const now = new Date();
    const periods = getPeriods();

    const active = periods.find(
      period => now >= period.start && now < period.end
    );

    const next = getNextPrayer();
     // Send next prayer information to notification system
window.dispatchEvent(
  new CustomEvent("sukoon:prayer-update", {
    detail: {
      nextPrayer: next
        ? {
            key: next.key,
            name: next.name,
            time: next.time.toISOString()
          }
        : null
    }
  })
);

    // Live clock and date
    setText("current-clock", clockFormat(now));

    setText(
      "gregorian-date",
      new Intl.DateTimeFormat("ur-PK", {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric"
      }).format(now)
    );

    if (active) {
      setText("active-prayer-label", "اس وقت نماز کا وقت جاری ہے");
      setText("active-prayer-name", active.name);

      setText(
        "active-prayer-start",
        displayTime(active.startText)
      );

      setText(
        "active-prayer-end",
        displayTime(active.endText)
      );

      setText(
        "active-prayer-remaining",
        durationFormat(active.end - now)
      );

    } else {
      setText(
        "active-prayer-label",
        "اس وقت نماز کا مخصوص وقت جاری نہیں"
      );

      setText("active-prayer-name", next ? next.name : "--");
      setText("active-prayer-start", "--");
      setText("active-prayer-end", "--");

      setText(
        "active-prayer-remaining",
        next ? durationFormat(next.time - now) : "--:--:--"
      );
    }

    // Next prayer details
    if (next) {
      setText("next-prayer-name", next.name);

      setText(
        "next-prayer-time",
        displayTime(
          `${String(next.time.getHours()).padStart(2, "0")}:${String(next.time.getMinutes()).padStart(2, "0")}`
        )
      );
    }

    // Highlight and move active prayer to top
    updatePrayerTimeCards(active, next);
  }

  // 8. PRAYER TIME LIST
  function renderPrayerTimes() {
    const list = $("prayer-times-list");
    if (!list || !todayTimings) return;

    list.innerHTML = "";

    PRAYERS.forEach(prayer => {
      const card = document.createElement("button");

      card.type = "button";
      card.className = "prayer-time-row";
      card.dataset.timePrayer = prayer.key;

      card.innerHTML = `
        <span class="time-name">
          ${prayer.icon} ${prayer.name}
          <small class="time-hint">نماز کا وقت</small>
        </span>

        <span class="time-value">
          ${displayTime(todayTimings[prayer.api])}
        </span>
      `;

      card.addEventListener("click", () => {
        const period = getPeriods().find(
          item => item.key === prayer.key
        );

        if (!period) return;

        showMessage(
          `${prayer.name}: آغاز ${displayTime(period.startText)}، اختتام ${displayTime(period.endText)}۔`
        );
      });

      list.appendChild(card);
    });

    updatePrayerStatus();
  }

  function updatePrayerTimeCards(active, next) {
    const list = $("prayer-times-list");
    if (!list) return;

    const cards = list.querySelectorAll("[data-time-prayer]");

    cards.forEach(card => {
      const isActive = !!active &&
        card.dataset.timePrayer === active.key;

      const isNext = !!next &&
        card.dataset.timePrayer === next.key;

      card.classList.toggle("active", isActive);

      const hint = card.querySelector(".time-hint");

      if (hint) {
        if (isActive) {
          hint.textContent = "وقت جاری ہے";
        } else if (isNext) {
          hint.textContent = "اگلی نماز";
        } else {
          hint.textContent = "نماز کا وقت";
        }
      }
    });

    if (active && active.key !== lastActivePrayer) {
      const activeCard = list.querySelector(
        `[data-time-prayer="${active.key}"]`
      );

      if (activeCard) {
        list.prepend(activeCard);
      }
    }

    lastActivePrayer = active ? active.key : null;
  }

  // 9. DAILY RECORD
  function isFriday() {
    return new Date().getDay() === 5;
  }

  function getTodayRecord() {
    return getSaved(
      "prayer_record_" + dateKey(new Date()),
      {}
    );
  }

  function saveTodayRecord(record) {
    saveData(
      "prayer_record_" + dateKey(new Date()),
      record
    );
  }

  function renderTracker() {
    const container = $("tracker-list");
    if (!container) return;

    const record = getTodayRecord();

    container.innerHTML = "";

    PRAYERS.forEach(prayer => {
      const label = document.createElement("label");
      label.className = "prayer-item";

      const checked = !!record[prayer.key];

      label.innerHTML = `
        <span class="prayer-item-icon">${prayer.icon}</span>
        <span class="prayer-item-name">${prayer.name}</span>
        <input
          type="checkbox"
          data-track="${prayer.key}"
          ${checked ? "checked" : ""}
          aria-label="${prayer.name} ادا کی"
        >
      `;

      container.appendChild(label);
    });

    const fridayWrap = $("friday-choice-wrap");

    if (fridayWrap) {
      if (isFriday()) {
        renderFridayChoice(record);
      } else {
        fridayWrap.hidden = true;
        fridayWrap.innerHTML = "";
      }
    }

    updateDailyProgress();
  }

  function renderFridayChoice(record) {
    const wrap = $("friday-choice-wrap");
    if (!wrap) return;

    wrap.hidden = false;

    wrap.innerHTML = `
      <h3>جمعہ کا انتخاب</h3>

      <label>
        <span>جمعہ ادا کیا</span>
        <input
          type="radio"
          name="friday-choice"
          value="jummah"
          ${record.middayChoice === "jummah" ? "checked" : ""}
        >
      </label>

      <label>
        <span>ظہر ادا کی</span>
        <input
          type="radio"
          name="friday-choice"
          value="zuhr"
          ${record.middayChoice === "zuhr" ? "checked" : ""}
        >
      </label>

      <p>جمعہ کے دن دوپہر کے ریکارڈ کے لیے صرف ایک انتخاب کریں۔</p>
    `;
  }

  // 10. DAILY PROGRESS AND COLORS
  function updateDailyProgress() {
    const record = getTodayRecord();

    const completed = PRAYERS.filter(
      prayer => record[prayer.key] === true
    ).length;

    const percent = completed / 5 * 100;

    setText("today-completed", completed);
    setText("today-completed-copy", completed);
    setText("today-total", "5");
    setText("today-progress", `${completed} / 5`);

    const card = $("today-progress-card");
    if (card) {
      card.dataset.progress = String(completed);
    }

    const bar = $("today-progress-fill");
    if (bar) {
      bar.style.width = `${percent}%`;
    }

    document.querySelectorAll("[data-track]").forEach(input => {
      input.closest(".prayer-item")?.classList.toggle(
        "done",
        input.checked
      );
    });

    updateWeeklyProgress();
  }

  function updatePrayerRecord(key, checked) {
    const record = getTodayRecord();

    record[key] = checked;

    if (key === "midday" && !checked) {
      delete record.middayChoice;
    }

    saveTodayRecord(record);

    if (key === "midday" && isFriday()) {
      renderFridayChoice(record);
    }

    updateDailyProgress();
  }

  // 11. WEEKLY REPORT — LAST 7 DAYS
  function updateWeeklyProgress() {
    let completed = 0;
    const possible = 35;

    for (let i = 0; i < 7; i++) {
      const date = new Date();
      date.setDate(date.getDate() - i);

      const record = getSaved(
        "prayer_record_" + dateKey(date),
        {}
      );

      completed += PRAYERS.filter(
        prayer => record[prayer.key] === true
      ).length;
    }

    const percent = completed / possible * 100;

    setText("weekly-completed", completed);
    setText("weekly-total", possible);
    setText("weekly-progress", `${completed} / ${possible}`);

    const bar = $("weekly-progress-fill");
    if (bar) {
      bar.style.width = `${percent}%`;
    }
  }

  // 12. LOCATION CONTROLS
  function requestGPS() {
    if (!navigator.geolocation) {
      showMessage(
        "آپ کے براؤزر میں GPS دستیاب نہیں۔ شہر منتخب کریں۔",
        true
      );
      return;
    }

    showMessage("آپ کی لوکیشن حاصل کی جا رہی ہے...");

    navigator.geolocation.getCurrentPosition(
      async position => {
        const latitude = position.coords.latitude;
        const longitude = position.coords.longitude;

        const cityName = await getCityName(
          latitude,
          longitude
        );

        const config = {
          type: "gps",
          latitude,
          longitude,
          cityName
        };

        setText("current-city", cityName);

        await loadPrayerTimings(config);
      },

      error => {
        console.error(error);

        showMessage(
          "لوکیشن کی اجازت نہیں ملی۔ براہ کرم دستی شہر منتخب کریں۔",
          true
        );
      },

      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 300000
      }
    );
  }

  function setupLocationButtons() {
    const gpsButton = $("gps-button");
    const secondaryGPS = $("gps-button-secondary");

    if (gpsButton) {
      gpsButton.addEventListener("click", requestGPS);
    }

    if (secondaryGPS) {
      secondaryGPS.addEventListener("click", requestGPS);
    }

    const cityButton = $("city-button");

    if (cityButton) {
      cityButton.addEventListener("click", () => {
        const select = $("city-select");

        if (!select || !select.value) {
          showMessage(
            "براہ کرم پہلے اپنا شہر منتخب کریں۔",
            true
          );
          return;
        }

        const config = {
          type: "city",
          city: select.value,
          cityName: select.options[select.selectedIndex].text
        };

        setText("current-city", config.cityName);

        loadPrayerTimings(config);
      });
    }

    const refreshButton = $("refresh-button");

    if (refreshButton) {
      refreshButton.addEventListener("click", () => {
        if (locationConfig) {
          loadPrayerTimings(locationConfig);
        } else {
          showMessage(
            "پہلے اپنی لوکیشن یا شہر منتخب کریں۔",
            true
          );
        }
      });
    }
  }

  // 13. TRACKER EVENTS
  function setupTrackerEvents() {
    const tracker = $("tracker-list");

    if (tracker) {
      tracker.addEventListener("change", event => {
        const input = event.target.closest("[data-track]");

        if (!input) return;

        updatePrayerRecord(
          input.dataset.track,
          input.checked
        );
      });
    }

    const fridayWrap = $("friday-choice-wrap");

    if (fridayWrap) {
      fridayWrap.addEventListener("change", event => {
        if (event.target.name !== "friday-choice") return;

        const record = getTodayRecord();

        record.middayChoice = event.target.value;
        record.midday = true;

        saveTodayRecord(record);

        renderTracker();
      });
    }
  }

  // 14. LIVE CLOCK AND DATE CHANGE
  function startLiveClock() {
    if (clockTimer) {
      clearInterval(clockTimer);
    }

    clockTimer = setInterval(() => {
      const now = new Date();

      setText("current-clock", clockFormat(now));

      if (dateKey(now) !== loadedDate) {
        loadedDate = dateKey(now);
        lastActivePrayer = null;

        renderTracker();

        if (locationConfig) {
          loadPrayerTimings(locationConfig);
        }
      }

      if (todayTimings && tomorrowTimings) {
        updatePrayerStatus();
      }

    }, 1000);
  }

  // 15. INITIALIZE
  function initializePrayerSystem() {
    setupLocationButtons();
    setupTrackerEvents();

    renderTracker();
    updateWeeklyProgress();

    setText("current-clock", clockFormat(new Date()));

    setText(
      "gregorian-date",
      new Intl.DateTimeFormat("ur-PK", {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric"
      }).format(new Date())
    );

    startLiveClock();

    const cache = getSaved("prayer_times_cache", null);

    if (cache && cache.date === dateKey(new Date())) {
      todayTimings = cache.today;
      tomorrowTimings = cache.tomorrow;

      renderPrayerTimes();
      updatePrayerStatus();
    }

    if (locationConfig) {
      setText(
        "current-city",
        locationConfig.cityName ||
        locationConfig.city ||
        "محفوظ شدہ لوکیشن"
      );

      loadPrayerTimings(locationConfig);

    } else {
      showMessage(
        "درست نماز اوقات کے لیے اپنا شہر منتخب کریں یا GPS استعمال کریں۔"
      );
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener(
      "DOMContentLoaded",
      initializePrayerSystem
    );
  } else {
    initializePrayerSystem();
  }

})();

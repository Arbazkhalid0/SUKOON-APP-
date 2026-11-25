
/* =====================================
   SUKOON — PRAYER REMINDER SYSTEM
===================================== */

(function () {
  "use strict";

  const STORAGE_KEY = "notification_settings";
  const SENT_KEY = "sukoon_sent_reminders";

  let nextPrayer = null;
  let reminderTimer = null;

  function getSaved(key, fallback = null) {
    try {
      return window.SukoonStorage
        ? SukoonStorage.get(key, fallback)
        : JSON.parse(localStorage.getItem("sukoon_" + key)) ?? fallback;
    } catch (error) {
      return fallback;
    }
  }

  function saveSaved(key, value) {
    try {
      if (window.SukoonStorage) {
        return SukoonStorage.set(key, value);
      }

      localStorage.setItem(
        "sukoon_" + key,
        JSON.stringify(value)
      );

      return true;
    } catch (error) {
      return false;
    }
  }

  function getSettings() {
    return getSaved(STORAGE_KEY, {
      sound: "silent",
      reminderMinutes: 10
    });
  }

  function getSentReminders() {
    return getSaved(SENT_KEY, []);
  }

  function markReminderSent(id) {
    const sent = getSentReminders();

    if (!sent.includes(id)) {
      sent.push(id);

      // Keep recent records only
      saveSaved(SENT_KEY, sent.slice(-100));
    }
  }

  function showStatus(message) {
    const status = document.getElementById(
      "notification-status"
    );

    if (status) status.textContent = message;
  }

  function sendPrayerNotification(prayer) {
    if (!("Notification" in window)) return;

    if (Notification.permission !== "granted") return;

    const settings = getSettings();

    if (settings.sound === "silent") {
      try {
        new Notification("SUKOON | سکون", {
          body: `${prayer.name} کی نماز کا وقت قریب ہے۔`,
          tag: `sukoon-${prayer.key}`
        });
      } catch (error) {
        console.error("Notification error:", error);
      }

      return;
    }

    // Audio will be connected in a later step.
    try {
      new Notification("SUKOON | سکون", {
        body: `${prayer.name} کی نماز کا وقت قریب ہے۔`,
        tag: `sukoon-${prayer.key}`
      });
    } catch (error) {
      console.error("Notification error:", error);
    }
  }

  function checkReminder() {
    if (!nextPrayer) return;

    const settings = getSettings();
    const minutes = Number(settings.reminderMinutes);

    if (!minutes || minutes < 1) return;

    if (!("Notification" in window)) return;

    if (Notification.permission !== "granted") return;

    const prayerTime = new Date(nextPrayer.time);
    const now = new Date();

    const reminderTime = new Date(
      prayerTime.getTime() - minutes * 60 * 1000
    );

    if (now < reminderTime || now >= prayerTime) return;

    const date = prayerTime.toLocaleDateString("en-CA");

    const reminderId =
      `${date}_${nextPrayer.key}_${minutes}`;

    if (getSentReminders().includes(reminderId)) return;

    markReminderSent(reminderId);
    sendPrayerNotification(nextPrayer);

    showStatus(
      `${nextPrayer.name} کی یاد دہانی بھیج دی گئی ✓`
    );
  }

  function initializeSettings() {
    const saveButton = document.getElementById(
      "save-notification-settings"
    );

    const permissionButton = document.getElementById(
      "enable-notifications"
    );

    const reminderSelect = document.getElementById(
      "reminder-minutes"
    );

    const soundOptions = document.querySelectorAll(
      'input[name="adhan-sound"]'
    );

    if (!saveButton || !reminderSelect) return;

    const saved = getSettings();

    soundOptions.forEach(option => {
      option.checked = option.value === saved.sound;
    });

    reminderSelect.value = String(
      saved.reminderMinutes ?? 10
    );

    saveButton.addEventListener("click", () => {
      const selected = document.querySelector(
        'input[name="adhan-sound"]:checked'
      );

      if (!selected) {
        showStatus("براہِ کرم آواز کا انتخاب کریں۔");
        return;
      }

      const settings = {
        sound: selected.value,
        reminderMinutes: Number(reminderSelect.value)
      };

      if (saveSaved(STORAGE_KEY, settings)) {
        showStatus("سیٹنگز کامیابی سے محفوظ ہو گئیں ✓");
      } else {
        showStatus("سیٹنگز محفوظ نہیں ہو سکیں۔");
      }
    });

    if (permissionButton) {
      updatePermissionButton(permissionButton);

      permissionButton.addEventListener("click", async () => {
        if (!("Notification" in window)) {
          showStatus("یہ براؤزر نوٹیفکیشن سپورٹ نہیں کرتا۔");
          return;
        }

        if (!window.isSecureContext) {
          showStatus("HTTPS کنکشن ضروری ہے۔");
          return;
        }

        try {
          const permission =
            await Notification.requestPermission();

          updatePermissionButton(permissionButton);

          if (permission === "granted") {
            showStatus("نوٹیفکیشن کی اجازت مل گئی ✓");
          } else {
            showStatus("نوٹیفکیشن کی اجازت نہیں ملی۔");
          }
        } catch (error) {
          showStatus("اجازت حاصل نہیں ہو سکی۔");
        }
      });
    }
  }

  function updatePermissionButton(button) {
    if (!("Notification" in window)) {
      button.textContent = "نوٹیفکیشن دستیاب نہیں";
      button.disabled = true;
      return;
    }

    if (Notification.permission === "granted") {
      button.textContent = "✓ نوٹیفکیشن کی اجازت موجود ہے";
    } else if (Notification.permission === "denied") {
      button.textContent =
        "براؤزر سیٹنگز میں نوٹیفکیشن فعال کریں";
    } else {
      button.textContent = "🔔 نوٹیفکیشن کی اجازت دیں";
    }
  }

  function initializeReminderSystem() {
    initializeSettings();

    window.addEventListener(
      "sukoon:prayer-update",
      event => {
        nextPrayer = event.detail?.nextPrayer || null;
        checkReminder();
      }
    );

    // Check every 15 seconds while the page is open.
    reminderTimer = setInterval(checkReminder, 15000);
  }

  if (document.readyState === "loading") {
    document.addEventListener(
      "DOMContentLoaded",
      initializeReminderSystem
    );
  } else {
    initializeReminderSystem();
  }
})();

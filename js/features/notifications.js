
/* =====================================
   SUKOON — NOTIFICATION SETTINGS
===================================== */

(function () {
  "use strict";

  const STORAGE_KEY = "notification_settings";

  function getSavedSettings() {
    if (window.SukoonStorage) {
      return SukoonStorage.get(STORAGE_KEY, null);
    }

    try {
      return JSON.parse(localStorage.getItem("sukoon_" + STORAGE_KEY));
    } catch (error) {
      return null;
    }
  }

  function saveSettings(settings) {
    if (window.SukoonStorage) {
      return SukoonStorage.set(STORAGE_KEY, settings);
    }

    try {
      localStorage.setItem(
        "sukoon_" + STORAGE_KEY,
        JSON.stringify(settings)
      );
      return true;
    } catch (error) {
      return false;
    }
  }

  function initializeNotificationSettings() {
    const saveButton = document.getElementById(
      "save-notification-settings"
    );

    const status = document.getElementById(
      "notification-status"
    );

    const reminderSelect = document.getElementById(
      "reminder-minutes"
    );

    const soundOptions = document.querySelectorAll(
      'input[name="adhan-sound"]'
    );

    if (!saveButton || !status || !reminderSelect) return;

    // Load previously saved settings
    const saved = getSavedSettings();

    if (saved) {
      soundOptions.forEach(function (option) {
        option.checked = option.value === saved.sound;
      });

      if (saved.reminderMinutes !== undefined) {
        reminderSelect.value = String(saved.reminderMinutes);
      }

      status.textContent = "آپ کی محفوظ شدہ سیٹنگز لوڈ ہو گئی ہیں";
    }

    // Save selected settings
    saveButton.addEventListener("click", function () {
      const selectedSound = document.querySelector(
        'input[name="adhan-sound"]:checked'
      );

      if (!selectedSound) {
        status.textContent = "براہِ کرم اذان کی آواز منتخب کریں";
        return;
      }

      const settings = {
        sound: selectedSound.value,
        reminderMinutes: Number(reminderSelect.value),
        updatedAt: new Date().toISOString()
      };

      const success = saveSettings(settings);

      if (success) {
        status.textContent = "آپ کی سیٹنگز کامیابی سے محفوظ ہو گئیں ✓";
      } else {
        status.textContent = "سیٹنگز محفوظ نہیں ہو سکیں، دوبارہ کوشش کریں";
      }
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener(
      "DOMContentLoaded",
      initializeNotificationSettings
    );
  } else {
    initializeNotificationSettings();
  }
})();


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
      return JSON.parse(
        localStorage.getItem("sukoon_" + STORAGE_KEY)
      );
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

    const permissionButton = document.getElementById(
      "enable-notifications"
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

    // Load saved settings
    const saved = getSavedSettings();

    if (saved) {
      soundOptions.forEach(function (option) {
        option.checked = option.value === saved.sound;
      });

      if (saved.reminderMinutes !== undefined) {
        reminderSelect.value = String(saved.reminderMinutes);
      }

      status.textContent =
        "آپ کی محفوظ شدہ سیٹنگز لوڈ ہو گئی ہیں";
    }

    // Save settings
    saveButton.addEventListener("click", function () {
      const selectedSound = document.querySelector(
        'input[name="adhan-sound"]:checked'
      );

      if (!selectedSound) {
        status.textContent =
          "براہِ کرم اذان کی آواز منتخب کریں";
        return;
      }

      const settings = {
        sound: selectedSound.value,
        reminderMinutes: Number(reminderSelect.value),
        updatedAt: new Date().toISOString()
      };

      if (saveSettings(settings)) {
        status.textContent =
          "آپ کی سیٹنگز کامیابی سے محفوظ ہو گئیں ✓";
      } else {
        status.textContent =
          "سیٹنگز محفوظ نہیں ہو سکیں";
      }
    });

    // Notification permission
    if (permissionButton) {
      function updatePermissionButton() {
        if (!("Notification" in window)) {
          permissionButton.textContent =
            "یہ براؤزر نوٹیفکیشن سپورٹ نہیں کرتا";
          permissionButton.disabled = true;
          return;
        }

        if (Notification.permission === "granted") {
          permissionButton.textContent =
            "✓ نوٹیفکیشن کی اجازت موجود ہے";
        } else if (Notification.permission === "denied") {
          permissionButton.textContent =
            "براؤزر سیٹنگز میں نوٹیفکیشن فعال کریں";
        } else {
          permissionButton.textContent =
            "🔔 نوٹیفکیشن کی اجازت دیں";
        }
      }

      updatePermissionButton();

      permissionButton.addEventListener("click", async function () {
        if (!("Notification" in window)) {
          status.textContent =
            "آپ کا براؤزر نوٹیفکیشن سپورٹ نہیں کرتا";
          return;
        }

        if (!window.isSecureContext) {
          status.textContent =
            "نوٹیفکیشن کے لیے محفوظ HTTPS کنکشن ضروری ہے";
          return;
        }

        try {
          const permission =
            await Notification.requestPermission();

          if (permission === "granted") {
            status.textContent =
              "نوٹیفکیشن کی اجازت کامیابی سے مل گئی ✓";
          } else if (permission === "denied") {
            status.textContent =
              "نوٹیفکیشن کی اجازت مسترد کر دی گئی";
          } else {
            status.textContent =
              "نوٹیفکیشن کی اجازت ابھی نہیں دی گئی";
          }

          updatePermissionButton();
        } catch (error) {
          status.textContent =
            "اجازت حاصل نہیں ہو سکی، دوبارہ کوشش کریں";
        }
      });
    }
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

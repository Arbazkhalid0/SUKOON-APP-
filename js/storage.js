
/* =================================
   SUKOON APP - LOCAL STORAGE SYSTEM
   ================================= */

const SukoonStorage = {

  // ڈیٹا محفوظ کرنا
  set(key, value) {
    try {
      const data = JSON.stringify(value);
      localStorage.setItem(`sukoon_${key}`, data);
      return true;
    } catch (error) {
      console.error("SUKOON: Data save failed", error);
      return false;
    }
  },

  // محفوظ شدہ ڈیٹا حاصل کرنا
  get(key, defaultValue = null) {
    try {
      const data = localStorage.getItem(`sukoon_${key}`);

      if (data === null) {
        return defaultValue;
      }

      return JSON.parse(data);

    } catch (error) {
      console.error("SUKOON: Data read failed", error);
      return defaultValue;
    }
  },

  // کسی خاص ڈیٹا کو حذف کرنا
  remove(key) {
    try {
      localStorage.removeItem(`sukoon_${key}`);
      return true;
    } catch (error) {
      console.error("SUKOON: Data delete failed", error);
      return false;
    }
  },

  // SUKOON کا تمام محفوظ شدہ ڈیٹا حذف کرنا
  clearAll() {
    try {
      const keys = Object.keys(localStorage);

      keys.forEach((key) => {
        if (key.startsWith("sukoon_")) {
          localStorage.removeItem(key);
        }
      });

      return true;

    } catch (error) {
      console.error("SUKOON: Data clearing failed", error);
      return false;
    }
  }

};


// دوسرے JavaScript فائلز کے لیے دستیاب کرنا
window.SukoonStorage = SukoonStorage;



/* =================================
   SUKOON APP - MAIN JAVASCRIPT
   ================================= */

// آج کی تاریخ دکھانے کا فنکشن
function updateTodayDate() {
  const dateElement = document.getElementById("today-date");

  if (!dateElement) return;

  const today = new Date();

  try {
    const formattedDate = new Intl.DateTimeFormat("ur-PK", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric"
    }).format(today);

    dateElement.textContent = formattedDate;

  } catch (error) {
    dateElement.textContent = today.toDateString();
  }
}


// ایپ شروع کرنے کا فنکشن
function initializeSukoonApp() {

  // آج کی تاریخ اپڈیٹ کریں
  updateTodayDate();

  // مستقبل کے فیچرز کے لیے بنیادی تیاری
  console.log("SUKOON App Started Successfully");
}


// صفحہ مکمل لوڈ ہونے پر ایپ شروع کریں
if (document.readyState === "loading") {

  document.addEventListener("DOMContentLoaded", initializeSukoonApp);

} else {

  initializeSukoonApp();

}


// جب صارف دوبارہ ایپ کھولے تو تاریخ اپڈیٹ ہو
document.addEventListener("visibilitychange", function () {

  if (!document.hidden) {
    updateTodayDate();
  }

});


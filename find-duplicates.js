// ВСТАВЬ ЭТОТ КОД В КОНСОЛЬ БРАУЗЕРА (F12 → Console),
// открыв chat.html и залогинившись любым аккаунтом.
//
// Скрипт ТОЛЬКО ЧИТАЕТ данные и печатает отчёт — ничего не удаляет
// и не меняет. Дальше решаешь вручную, что делать с каждым дублем.

(async function findDuplicateUsers() {
  const { getFirestore, collection, getDocs } =
    await import("https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js");

  // Использует уже инициализированный в странице объект db
  const db = window.db || (window.__firebase_db);
  if (!db) {
    console.error("Не нашёл объект db в window. Открой консоль на странице chat.html после логина.");
    return;
  }

  const snap = await getDocs(collection(db, "users"));
  const byEmail = {};

  snap.forEach(docSnap => {
    const data = docSnap.data();
    const email = (data.email || "").toLowerCase().trim();
    if (!email) return;
    if (!byEmail[email]) byEmail[email] = [];
    byEmail[email].push({ uid: docSnap.id, ...data });
  });

  const duplicates = Object.entries(byEmail).filter(([, list]) => list.length > 1);

  if (duplicates.length === 0) {
    console.log("Дублей по email не найдено.");
    return;
  }

  console.log(`Найдено email с дублями: ${duplicates.length}`);
  duplicates.forEach(([email, list]) => {
    console.log(`\n=== ${email} (${list.length} аккаунта) ===`);
    list
      .sort((a, b) => (a.createdAt?.seconds || 0) - (b.createdAt?.seconds || 0))
      .forEach((u, i) => {
        const created = u.createdAt?.seconds
          ? new Date(u.createdAt.seconds * 1000).toLocaleString()
          : "неизвестно";
        console.log(`  ${i === 0 ? "[ГЛАВНЫЙ, старейший]" : "[ДУБЛЬ]"} uid=${u.uid} name=${u.name} создан=${created}`);
      });
  });

  console.log("\nСкопируй uid-дублей и удали их вручную через Firebase Console → Firestore → users, " +
    "ПОСЛЕ ТОГО как перенесёшь их сообщения/членство в чатах на главный uid (см. merge-duplicate.js).");
})();

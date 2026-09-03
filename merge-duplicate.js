// ВСТАВЬ ЭТОТ КОД В КОНСОЛЬ БРАУЗЕРА на странице chat.html после логина.
// ПЕРЕД ИСПОЛЬЗОВАНИЕМ впиши правильные uid ниже (взять из find-duplicates.js).
//
// Что делает:
// 1. Во всех чатах, где состоит DUPLICATE_UID, заменяет его на MAIN_UID
//    в массиве members (если MAIN_UID там уже есть — просто убирает дубль).
// 2. Во всех сообщениях с senderId === DUPLICATE_UID меняет senderId на MAIN_UID,
//    чтобы история переписки не потерялась и не обезличилась.
// 3. Удаляет документ users/{DUPLICATE_UID}.
//
// ВАЖНО: сам Firebase Auth аккаунт (email+пароль или Google) для DUPLICATE_UID
// этот скрипт не трогает — он остаётся в Firebase Authentication. Его нужно
// отдельно удалить вручную в Firebase Console → Authentication → Users,
// иначе человек сможет снова войти под старым uid и он попадёт в чаты как
// "новый" пользователь (профиль users/{uid} просто создастся заново).

const MAIN_UID = "ВСТАВЬ_UID_ГЛАВНОГО_АККАУНТА";
const DUPLICATE_UID = "ВСТАВЬ_UID_ДУБЛЯ";

(async function mergeDuplicateUser() {
  if (MAIN_UID.startsWith("ВСТАВЬ") || DUPLICATE_UID.startsWith("ВСТАВЬ")) {
    console.error("Сначала впиши реальные MAIN_UID и DUPLICATE_UID в начале скрипта.");
    return;
  }

  const {
    collection, getDocs, doc, getDoc, updateDoc, deleteDoc,
    arrayUnion, arrayRemove, query, where, writeBatch
  } = await import("https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js");

  const db = window.db || window.__firebase_db;
  if (!db) {
    console.error("Не нашёл объект db в window.");
    return;
  }

  // 1. Переносим членство в чатах
  const chatsQ = query(collection(db, "chats"), where("members", "array-contains", DUPLICATE_UID));
  const chatsSnap = await getDocs(chatsQ);
  console.log(`Найдено чатов с участием дубля: ${chatsSnap.size}`);

  for (const chatDoc of chatsSnap.docs) {
    const chatRef = doc(db, "chats", chatDoc.id);
    await updateDoc(chatRef, {
      members: arrayRemove(DUPLICATE_UID)
    });
    await updateDoc(chatRef, {
      members: arrayUnion(MAIN_UID)
    });
    console.log(`  chat ${chatDoc.id}: members обновлены`);

    // 2. Переносим авторство сообщений в этом чате
    const msgsSnap = await getDocs(collection(db, "chats", chatDoc.id, "messages"));
    let updatedCount = 0;
    for (const msgDoc of msgsSnap.docs) {
      if (msgDoc.data().senderId === DUPLICATE_UID) {
        await updateDoc(doc(db, "chats", chatDoc.id, "messages", msgDoc.id), {
          senderId: MAIN_UID
        });
        updatedCount++;
      }
    }
    if (updatedCount) console.log(`  chat ${chatDoc.id}: переписано сообщений ${updatedCount}`);
  }

  // 3. Удаляем профиль дубля
  await deleteDoc(doc(db, "users", DUPLICATE_UID));
  console.log(`Готово: users/${DUPLICATE_UID} удалён, всё перенесено на ${MAIN_UID}.`);
  console.log("НЕ ЗАБУДЬ: удали сам Auth-аккаунт этого uid в Firebase Console → Authentication → Users, " +
    "иначе он сможет снова зайти и профиль пересоздастся.");
})();

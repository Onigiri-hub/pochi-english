import { db, auth } from "../firebase";
import { doc, getDoc, setDoc, collection, getDocs } from "firebase/firestore";
import Papa from "papaparse";

// ===================================
// csvからバッジ一覧を読み込む
// ===================================
export async function loadBadgeList() {
  const res = await fetch("/data/badgeList.csv")
  const text = await res.text()
  return Papa.parse(text, {
    header: true,
    skipEmptyLines: true,
  }).data
}

// ===================================
// 獲得済みバッジをFirestoreから取得
// ===================================
export async function getBadges() {
  const user = auth.currentUser;
  if (!user) return [];

  try {
    const snap = await getDoc(doc(db, "users", user.uid, "badges", "earned"));
    if (!snap.exists()) return [];
    return snap.data().list || [];
  } catch (e) {
    console.error("バッジ取得失敗:", e);
    return [];
  }
}

// ===================================
// バッジを獲得済みに追加
// ===================================
async function earnBadge(badgeId) {
  const user = auth.currentUser;
  if (!user) return;

  try {
    const ref = doc(db, "users", user.uid, "badges", "earned");
    const snap = await getDoc(ref);
    const current = snap.exists() ? (snap.data().list || []) : [];

    if (current.includes(badgeId)) return; // すでに持ってる

    await setDoc(ref, { list: [...current, badgeId] });
  } catch (e) {
    console.error("バッジ保存失敗:", e);
  }
}

// ===================================
// バッジ条件チェック（クリア画面で呼ぶ）
// 戻り値：新しく獲得したbadge_idの配列
// ===================================
export async function checkAndEarnBadges({
  streak = 0,
  totalLessons = 0,
  isUnit1Complete = false,
  isPerfect = false,
}) {
  const earned = await getBadges();
  const newBadges = [];

  const check = async (id, condition) => {
    if (condition && !earned.includes(id)) {
      await earnBadge(id);
      newBadges.push(id);
    }
  };

  await check("first_clear", totalLessons >= 1);
  await check("lesson_5", totalLessons >= 5);
  await check("lesson_10", totalLessons >= 10);
  await check("unit1_complete", isUnit1Complete);
  await check("streak_3", streak >= 3);
  await check("streak_7", streak >= 7);
  await check("perfect", isPerfect);

  return newBadges;
}

// ===================================
// 累計レッスンクリア数をFirestoreから取得
// ===================================
export async function getTotalLessons() {
  const user = auth.currentUser;
  if (!user) return 0;

  try {
    const snap = await getDocs(collection(db, "users", user.uid, "history"));
    return snap.size;
  } catch (e) {
    console.error("累計レッスン数取得失敗:", e);
    return 0;
  }
}

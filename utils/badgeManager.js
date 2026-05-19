import { db, auth } from "../firebase";
import { doc, getDoc, setDoc, collection, getDocs } from "firebase/firestore";

// ===================================
// バッジ定義一覧
// ===================================
export const BADGE_LIST = [
  {
    id: "first_clear",
    name: "はじめの一歩",
    icon: "🌟",
    description: "初めてレッスンをクリア！",
  },
  {
    id: "lesson_5",
    name: "レッスン5クリア",
    icon: "📚",
    description: "累計5レッスンクリア！",
  },
  {
    id: "lesson_10",
    name: "レッスン10クリア",
    icon: "📚",
    description: "累計10レッスンクリア！",
  },
  {
    id: "unit1_complete",
    name: "Unit1コンプリート",
    icon: "🏆",
    description: "Unit1の全レッスンを完了！",
  },
  {
    id: "streak_3",
    name: "3日連続",
    icon: "🔥",
    description: "3日連続で学習！",
  },
  {
    id: "streak_7",
    name: "7日連続",
    icon: "🔥",
    description: "7日連続で学習！",
  },
  {
    id: "perfect",
    name: "パーフェクト",
    icon: "⭐",
    description: "1レッスン全問正解！",
  },
];

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
// 引数：
//   - streak: 連続日数
//   - totalLessons: 累計レッスンクリア数
//   - isUnit1Complete: Unit1全クリアかどうか
//   - isPerfect: 全問正解かどうか（practiceのみ）
// 戻り値：新しく獲得したバッジIDの配列
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

  return newBadges; // 新しく取ったバッジIDの配列を返す
}

// ===================================
// 累計レッスンクリア数をFirestoreから取得
// （historyコレクションのドキュメント数で計算）
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

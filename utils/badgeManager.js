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

    if (current.includes(badgeId)) return;

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
  totalRounds = 0,
  completedStages = [],
  isUnitComplete = null,
  isPerfect = false,
  completedUnitCount = 0,
}) {
  const earned = await getBadges();
  const newBadges = [];

  const check = async (id, condition) => {
    if (condition && !earned.includes(id)) {
      await earnBadge(id);
      newBadges.push(id);
    }
  };

  // 英文法レッスン系
  await check("first_clear", totalLessons >= 1);
  await check("lesson_5", totalLessons >= 5);
  await check("lesson_10", totalLessons >= 10);
  await check("lesson_50", totalLessons >= 50);
  await check("lesson_100", totalLessons >= 100);
  await check("lesson_200", totalLessons >= 200);

  // Unit完了系
  if (isUnitComplete) {
    await check(`unit_${isUnitComplete}_complete`, true)
  }

  // 連続学習系
  await check("streak_3", streak >= 3);
  await check("streak_7", streak >= 7);
  await check("streak_10", streak >= 10);
  await check("streak_30", streak >= 30);
  await check("streak_50", streak >= 50);
  await check("streak_100", streak >= 100);
  await check("streak_200", streak >= 200);
  await check("streak_365", streak >= 365);

  // Stage完了系
  for (const stageId of completedStages) {
    await check(`${stageId}_clear`, true);
  }

  // 英単語Round系
  await check("round_5", totalRounds >= 5);
  await check("round_10", totalRounds >= 10);
  await check("round_20", totalRounds >= 20);
  await check("round_30", totalRounds >= 30);
  await check("round_50", totalRounds >= 50);
  await check("round_100", totalRounds >= 100);
  await check("round_200", totalRounds >= 200);
  await check("round_500", totalRounds >= 500);

  // UnitクリアCount系
  await check("unit_clear_5", completedUnitCount >= 5);
  await check("unit_clear_10", completedUnitCount >= 10);
  await check("unit_clear_20", completedUnitCount >= 20);
  await check("unit_clear_50", completedUnitCount >= 50);
  await check("unit_clear_30", completedUnitCount >= 30);
  await check("unit_clear_40", completedUnitCount >= 40);

  return newBadges;
}

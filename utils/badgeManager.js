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
  totalDays = 0,
  completedStages = [],
  isUnitComplete = null,  // ←isUnit1CompleteをこれにRename
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

  // 既存のfirst_clearとlesson系はそのまま
  await check("first_clear", totalLessons >= 1);
  await check("lesson_5", totalLessons >= 5);
  await check("lesson_10", totalLessons >= 10);

  // unit1_completeをunit_〇_completeに変更
  if (isUnitComplete) {
    await check(`unit_${isUnitComplete}_complete`, true)
  }

  await check("streak_3", streak >= 3);
  await check("streak_7", streak >= 7);

  for (const stageId of completedStages) {
    await check(`${stageId}_clear`, true);
  }

  await check("round_10", totalRounds >= 10);
  await check("round_20", totalRounds >= 20);
  await check("round_30", totalRounds >= 30);
  await check("round_50", totalRounds >= 50);

  await check("days_7", totalDays >= 7);
  await check("days_30", totalDays >= 30);
  await check("days_100", totalDays >= 100);

    return newBadges;
  }


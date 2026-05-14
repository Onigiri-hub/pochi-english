import { db, auth } from "../firebase"
import {
  doc, getDoc, setDoc, collection, addDoc, serverTimestamp
} from "firebase/firestore"

// ラウンドの「できた」進捗をFirestoreに保存
export async function saveVocabRoundProgress(roundId, doneWords, totalWords) {
  const user = auth.currentUser
  if (!user) return

  try {
    const roundRef = doc(db, "users", user.uid, "vocab_rounds", roundId)
    const snap = await getDoc(roundRef)
    const existing = snap.exists() ? (snap.data().doneWords || []) : []

    // 既存のできたとマージ（案A：一度できたらずっとできた）
    const merged = [...new Set([...existing, ...doneWords])]

    await setDoc(roundRef, {
      doneWords: merged,
      totalWords: totalWords
    })

    // localStorageも同期
    localStorage.setItem(`vocab_round_${roundId}`, JSON.stringify({
      doneWords: merged,
      totalWords: totalWords
    }))

  } catch (e) {
    console.error("vocab_round保存失敗:", e)
  }
}

// 習熟度をFirestoreに保存
export async function saveVocabMastery(section, modeKey, masteryMap) {
  const user = auth.currentUser
  if (!user) return

  try {
    // 単語ごとにvocab_progressに保存
    await Promise.all(
      Object.entries(masteryMap).map(async ([wordId, data]) => {
        const progressRef = doc(db, "users", user.uid, "vocab_progress", wordId)
        const snap = await getDoc(progressRef)
        const existing = snap.exists() ? snap.data() : {}

        await setDoc(progressRef, {
          ...existing,
          section_id: section,
          [modeKey]: data,
          lastStudied: data.lastStudied || new Date().toISOString()
        }, { merge: true })
      })
    )

    // localStorageも同期
    localStorage.setItem(
      `vocab_mastery_${section}_${modeKey}`,
      JSON.stringify(masteryMap)
    )

  } catch (e) {
    console.error("vocab_mastery保存失敗:", e)
  }
}

// ラウンドの「できた」進捗をFirestoreから取得
export async function getVocabRoundProgress(roundId) {
  const user = auth.currentUser

  // 未ログインはlocalStorageにフォールバック
  if (!user) {
    const local = localStorage.getItem(`vocab_round_${roundId}`)
    return local ? JSON.parse(local) : { doneWords: [], totalWords: 0 }
  }

  try {
    const roundRef = doc(db, "users", user.uid, "vocab_rounds", roundId)
    const snap = await getDoc(roundRef)

    if (snap.exists()) {
      const data = snap.data()
      // localStorageも同期
      localStorage.setItem(`vocab_round_${roundId}`, JSON.stringify(data))
      return data
    }
    return { doneWords: [], totalWords: 0 }

  } catch (e) {
    console.error("vocab_round取得失敗:", e)
    const local = localStorage.getItem(`vocab_round_${roundId}`)
    return local ? JSON.parse(local) : { doneWords: [], totalWords: 0 }
  }
}

// 習熟度をFirestoreから取得
export async function getVocabMastery(section, modeKey) {
  const user = auth.currentUser

  if (!user) {
    const local = localStorage.getItem(`vocab_mastery_${section}_${modeKey}`)
    return local ? JSON.parse(local) : {}
  }

  try {
    // vocab_progressから該当セクション・モードのデータを取得
    // ※単語数が多いと読み取り回数が増えるため、localStorageをキャッシュとして使う
    const local = localStorage.getItem(`vocab_mastery_${section}_${modeKey}`)
    if (local) return JSON.parse(local)

    return {}

  } catch (e) {
    console.error("vocab_mastery取得失敗:", e)
    return {}
  }
}

// Round終了時にhistoryに記録（グラフ用）
export async function addVocabHistory(roundId, sectionId) {
  const user = auth.currentUser
  if (!user) return

  try {
    await addDoc(collection(db, "users", user.uid, "vocab_history"), {
      round_id: roundId,
      section_id: sectionId,
      clearedAt: serverTimestamp(),
      dateString: new Date().toLocaleDateString("sv-SE")
    })
  } catch (e) {
    console.error("vocab_history保存失敗:", e)
  }
}
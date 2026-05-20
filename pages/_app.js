import { Noto_Sans_JP } from "next/font/google"
import "../styles/home.css";
import "../styles/profile.css";
import "../styles/unitList.css";
import "../styles/lecture.css";
import "../styles/lessonList.css";
import "../styles/practice.css";
import { useState, useEffect } from "react";
import { useRouter } from "next/router";  // ★追加
import { DictionaryContext } from "../utils/DictionaryContext";
import { loadCSV } from "../utils/csvLoader";
import { auth } from "../firebase";  // ★追加

const noto = Noto_Sans_JP({
  weight: ["400", "700"],
  subsets: ["latin"],
  display: "swap",
})

// ログインしてなくても見せるページ
const PUBLIC_PAGES = ["/", "/terms"]

export default function MyApp({ Component, pageProps }) {
  const [dictionary, setDictionary] = useState([])
  const router = useRouter()  // ★追加

  // ★追加：未ログイン検知→トップへリダイレクト
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      // 未ログインはトップへ
      if (!user && !PUBLIC_PAGES.includes(router.pathname)) {
        router.push("/")
        return
      }

      // ログイン済みの場合、1日1回チェック処理
      if (user) {
        const today = new Date().toLocaleDateString("sv-SE")
        const lastCheck = localStorage.getItem("dailyCheck")
        if (lastCheck === today) return // 今日すでにチェック済み

        try {
          const { collection, getDocs, query, orderBy, doc, getDoc, setDoc } = await import("firebase/firestore")
          const { db } = await import("../firebase")

          // history取得（英文法＋英単語）
          const hSnap = await getDocs(query(collection(db, "users", user.uid, "history"), orderBy("clearedAt")))
          const vSnap = await getDocs(query(collection(db, "users", user.uid, "vocab_history"), orderBy("clearedAt")))
          const allHistory = [
            ...hSnap.docs.map(d => d.data()),
            ...vSnap.docs.map(d => d.data()),
          ]

          // streak再計算
          const allDays = new Set(allHistory.map(h => h.dateString))
          let streak = 0
          const todayDate = new Date()
          for (let i = 0; i < 365; i++) {
            const d = new Date(todayDate)
            d.setDate(d.getDate() - i)
            const s = d.toLocaleDateString("sv-SE")
            if (allDays.has(s)) {
              streak++
            } else {
              break
            }
          }

          // streakをFirestoreに保存
          //await setDoc(
          //  doc(db, "users", user.uid, "streak", "current"),
          //  { count: streak, lastDate: today }
          //)

          // バッジ再チェック
          const { checkAndEarnBadges } = await import("../utils/badgeManager")

          // progress取得（Unit1完了チェック用）
          const pSnap = await getDocs(collection(db, "users", user.uid, "progress"))
          const progressMap = {}
          pSnap.docs.forEach(d => { progressMap[d.id] = d.data().value })

          // Unit1の全レッスン数を確認（all_unit_listから）
          const { loadCSV } = await import("../utils/csvLoader")
          const unitList = await loadCSV("/data/all_unit_list.csv")
          const unit1Lessons = unitList.filter(r => r.unit_NO === "1")
          const isUnit1Complete = (progressMap["u1"] || 0) >= unit1Lessons.length

          await checkAndEarnBadges({
            streak,
            totalLessons: hSnap.size,
            isUnit1Complete,
            isPerfect: false,
          })

          // 今日チェック済みを記録
          localStorage.setItem("dailyCheck", today)

        } catch (e) {
          console.error("dailyCheck失敗:", e)
        }
      }
    })
  return () => unsubscribe()
}, [router.pathname])


  useEffect(() => {
    // 辞書の読み込み
    async function load() {
      const data = await loadCSV("/data/word_dic.csv")
      setDictionary(data)
    }
    load()

    // カチ音
    const sound = new Audio("/sound/kachi.mp3")
    
    function handleClick(e) {
      if (e.target.closest("[data-no-sound]")) return
      sound.currentTime = 0
      sound.play().catch(() => {})
    }
    
    document.addEventListener("click", handleClick)
    return () => document.removeEventListener("click", handleClick)
  }, [])


  return (
    <DictionaryContext.Provider value={dictionary}>
      <main className={noto.className}>
        <Component {...pageProps} />
      </main>
    </DictionaryContext.Provider>
  )
}

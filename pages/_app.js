import { Noto_Sans_JP } from "next/font/google"
import "../styles/home.css";
import "../styles/profile.css";
import "../styles/unitList.css";
import "../styles/lecture.css";
import "../styles/lessonList.css";
import "../styles/practice.css";
import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import { DictionaryContext } from "../utils/DictionaryContext";
import { ProfileContext } from "../utils/ProfileContext";
import { loadCSV } from "../utils/csvLoader";
import { auth } from "../firebase";

const noto = Noto_Sans_JP({
  weight: ["400", "700"],
  subsets: ["latin"],
  display: "swap",
})

const PUBLIC_PAGES = ["/", "/terms"]

export default function MyApp({ Component, pageProps }) {
  const [dictionary, setDictionary] = useState([])
  const [profile, setProfile] = useState(null)
  const router = useRouter()

  // 未ログイン検知＋プロフィール取得＋dailyCheck
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      if (!user && !PUBLIC_PAGES.includes(router.pathname)) {
        router.push("/")
        return
      }

      if (user) {
        const { doc, getDoc, setDoc, collection, getDocs, query, orderBy } = await import("firebase/firestore")
        const { db } = await import("../firebase")

        // プロフィール取得（1回だけ）
        const userRef = doc(db, "users", user.uid)
        const snap = await getDoc(userRef)
        if (snap.exists()) {
          setProfile(snap.data())
        } else {
          const defaultProfile = {
            nickname: user.displayName || "ゲスト",
            avatar: "01.png",
            acc_head: null,
            acc_eye: null,
            acc_mouth: null,
          }
          await setDoc(userRef, defaultProfile)
          setProfile(defaultProfile)
        }

        // dailyCheck（1日1回だけ）
        const today = new Date().toLocaleDateString("sv-SE")
        const lastCheck = localStorage.getItem("dailyCheck")
        if (lastCheck === today) return

        try {
          const hSnap = await getDocs(query(collection(db, "users", user.uid, "history"), orderBy("clearedAt")))
          const vSnap = await getDocs(query(collection(db, "users", user.uid, "vocab_history"), orderBy("clearedAt")))
          const allHistory = [
            ...hSnap.docs.map(d => d.data()),
            ...vSnap.docs.map(d => d.data()),
          ]

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

          const { checkAndEarnBadges } = await import("../utils/badgeManager")
          const pSnap = await getDocs(collection(db, "users", user.uid, "progress"))
          const progressMap = {}
          pSnap.docs.forEach(d => { progressMap[d.id] = d.data().value })

          const unitList = await loadCSV("/data/all_unit_list.csv")
          const unit1Lessons = unitList.filter(r => r.unit_NO === "1")
          const isUnit1Complete = (progressMap["u1"] || 0) >= unit1Lessons.length

          await checkAndEarnBadges({
            streak,
            totalLessons: hSnap.size,
            isUnit1Complete,
            isPerfect: false,
          })

          localStorage.setItem("dailyCheck", today)

        } catch (e) {
          console.error("dailyCheck失敗:", e)
        }
      }
    })
    return () => unsubscribe()
  }, [router.pathname])

  // 辞書読み込み＋カチ音
  useEffect(() => {
    async function load() {
      const data = await loadCSV("/data/word_dic.csv")
      setDictionary(data)
    }
    load()

    // ★kirakira事前読み込み追加
    const kirakira = new Audio("/sound/kirakira.mp3")
    kirakira.volume = 0.3
    kirakira.load()
    window._kirakira = kirakira  // どこからでも使えるように

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
      <ProfileContext.Provider value={{ profile, setProfile }}>
        <main className={noto.className}>
          <Component {...pageProps} />
        </main>
      </ProfileContext.Provider>
    </DictionaryContext.Provider>
  )
}

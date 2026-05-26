import Head from "next/head"
import Script from "next/script"
import { Noto_Sans_JP } from "next/font/google"
import "../styles/home.css";
import "../styles/profile.css";
import "../styles/unitList.css";
import "../styles/lecture.css";
import "../styles/lessonList.css";
import "../styles/practice.css";
import { useState, useEffect, useRef } from "react";
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
  const [mofu, setMofu] = useState(0)
  const [streak, setStreak] = useState(0)
  const [totalLessons, setTotalLessons] = useState(0)
  const [totalRounds, setTotalRounds] = useState(0)
  const [completedUnits, setCompletedUnits] = useState(new Set())
  const [authChecked, setAuthChecked] = useState(false)
  const [currentUser, setCurrentUser] = useState(null)
  const dataLoadedRef = useRef(false)
  const router = useRouter()

  // ★ 認証＆データ取得（起動時1回だけ）
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      setCurrentUser(user)
      setAuthChecked(true)

      if (!user) {
        dataLoadedRef.current = false
        return
      }

      if (dataLoadedRef.current) return
      dataLoadedRef.current = true

      const { doc, getDoc, setDoc, collection, getDocs, query, orderBy } = await import("firebase/firestore")
      const { db } = await import("../firebase")

      // プロフィール・mofu・streakを一括取得
      const userRef = doc(db, "users", user.uid)
      const [profileSnap, streakSnap, completedUnitsSnap] = await Promise.all([
        getDoc(userRef),
        getDoc(doc(db, "users", user.uid, "streak", "current")),
        getDocs(collection(db, "users", user.uid, "completedUnits")),
      ])

      const completedUnitIds = new Set(completedUnitsSnap.docs.map(d => d.id))
      setCompletedUnits(completedUnitIds)

      if (profileSnap.exists()) {
        const data = profileSnap.data()
        setProfile(data)
        setMofu(data.mofu || 0)
        setTotalLessons(data.totalLessons || 0)
        setTotalRounds(data.totalRounds || 0)
      } else {
        const defaultProfile = {
          nickname: user.displayName || "ゲスト",
          avatar: "01.png",
          acc_head: null,
          acc_eye: null,
          acc_mouth: null,
          mofu: 0,
        }
        await setDoc(userRef, defaultProfile)
        setProfile(defaultProfile)
        setMofu(0)
      }

      // streak取得
      if (streakSnap.exists()) {
        const data = streakSnap.data()
        const today = new Date().toLocaleDateString("sv-SE")
        const yesterday = new Date(Date.now() - 86400000).toLocaleDateString("sv-SE")
        if (data.lastDate === today || data.lastDate === yesterday) {
          setStreak(data.count || 0)
        } else {
          setStreak(0)
        }
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
        let streakCount = 0
        const todayDate = new Date()
        for (let i = 0; i < 365; i++) {
          const d = new Date(todayDate)
          d.setDate(d.getDate() - i)
          const s = d.toLocaleDateString("sv-SE")
          if (allDays.has(s)) {
            streakCount++
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
          streak: streakCount,
          totalLessons: hSnap.size,
          isUnitComplete: isUnit1Complete ? "1" : null,
          isPerfect: false,
        })

        localStorage.setItem("dailyCheck", today)

      } catch (e) {
        console.error("dailyCheck失敗:", e)
      }
    })
    return () => unsubscribe()
  }, [])

  // ★ ページ遷移ごとに、未ログイン時のリダイレクト判定だけ行う
  useEffect(() => {
    if (!authChecked) return
    if (!currentUser && !PUBLIC_PAGES.includes(router.pathname)) {
      router.push("/")
    }
  }, [router.pathname, authChecked, currentUser])

  // 辞書読み込み＋効果音プリロード
  useEffect(() => {
    async function load() {
      const data = await loadCSV("/data/word_dic.csv")
      setDictionary(data)
    }
    load()

    // kirakira事前読み込み
    const kirakira = new Audio("/sound/kirakira.mp3")
    kirakira.volume = 0.3
    kirakira.load()
    window._kirakira = kirakira

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
      <ProfileContext.Provider value={{ 
        profile, setProfile, 
        mofu, setMofu, 
        streak, setStreak, 
        totalLessons, setTotalLessons,
        totalRounds, setTotalRounds,
        completedUnits, setCompletedUnits,
      }}>

        <Head>
          <link rel="manifest" href="/manifest.json" />
          <meta name="theme-color" content="#ebebeb" />
          {/* iOSのホーム画面アイコン用 */}
          <link rel="apple-touch-icon" href="/images/icons/icon-192.png" />
        </Head>
        {/* Google AdSense（本番環境のみ） */}
        {process.env.NEXT_PUBLIC_VERCEL_ENV === "production" && (
          <Script
            async
            src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-3714576929730992"
            crossOrigin="anonymous"
            strategy="afterInteractive"
          />
        )}
        <main className={noto.className}>
          <Component {...pageProps} />
        </main>
      </ProfileContext.Provider>
    </DictionaryContext.Provider>
  )
}

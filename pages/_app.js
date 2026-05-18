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
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (!user && !PUBLIC_PAGES.includes(router.pathname)) {
        router.push("/")
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

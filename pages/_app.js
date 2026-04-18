import { Noto_Sans_JP } from "next/font/google"
import "../styles/home.css";
import "../styles/profile.css";
import "../styles/unitList.css";
import "../styles/lecture.css";
import "../styles/lessonList.css";
import "../styles/practice.css";
import { useState, useEffect } from "react";
import { DictionaryContext } from "../utils/DictionaryContext";
import { loadCSV } from "../utils/csvLoader";

const noto = Noto_Sans_JP({
  weight: ["400", "700"],
  subsets: ["latin"],
  display: "swap",
})

export default function MyApp({ Component, pageProps }) {
  const [dictionary, setDictionary] = useState([])

  useEffect(() => {
    async function load() {
      const data = await loadCSV("/data/word_dic.csv")
      setDictionary(data)
    }
    load()
  }, [])

  return (
    <DictionaryContext.Provider value={dictionary}>
      <main className={noto.className}>
        <Component {...pageProps} />
      </main>
    </DictionaryContext.Provider>
  )
}
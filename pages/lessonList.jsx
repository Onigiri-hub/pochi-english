import { useEffect, useState } from "react"
import { useRouter } from "next/router"
import Papa from "papaparse"
import { getProgress } from "../utils/progressManager"
import Navigation from "../components/Navigation";

export default function LessonList() {
  const [lessons, setLessons] = useState([])
  const [progress, setProgress] = useState(1)
  const [hasExtra, setHasExtra] = useState(false) 
  const router = useRouter()
  const { unit } = router.query

  useEffect(() => {
    if (!unit) return;

    async function load() {
      const res = await fetch("/data/all_unit_list.csv")
      const text = await res.text()
      const data = Papa.parse(text, { header: true, skipEmptyLines: true }).data

      setLessons(data.filter(l => l.unit_NO === unit))
      setProgress(await getProgress(unit) || 1)

      // エクストラCSVが存在するかチェック
      try {
        const extraRes = await fetch(`/data/practice/u${unit}_extra.csv`)
        // ファイルがあれば200、なければ404が返る
        if (extraRes.ok) {
          const extraText = await extraRes.text()
          // 中身が空っぽやHTMLエラーページじゃないか軽く確認
          if (extraText && !extraText.trim().startsWith("<")) {
            setHasExtra(true)
          }
        }
      } catch (e) {
        setHasExtra(false)
      }
    }    
    load()

  }, [unit])

  function goLesson(l) {
    const path = l.lesson_type === "lecture" ? "/testLecture" : "/testPractice"
    router.push(`${path}?lesson=${l.lesson_id}`)
  }

  if (lessons.length === 0) return <div>loading...</div>

  const unitColor = lessons[0]?.unit_color || "#e53935";

  return (
    <div className="lessonList" style={{ paddingBottom: "80px" }}>

      <div style={{ padding: "10px 20px" }}>
        <button
          onClick={() => router.push("/unitList")}
          style={{
            background: "none",
            border: "none",
            fontSize: "15px",
            fontWeight: "bold",
            color: "#333333",
            cursor: "pointer"
          }}
        >
          ◀
        </button>
      </div>
      
      <div
        className="lessonHeader"
        onClick={() => router.push("/unitList")}
        data-sound
      >
        <img 
          src="/images/illustrations/unitlist_button.png" 
          className="unitCardBg"
        />
        <div className="lessonHeaderContent">
          <h1>Unit {unit}</h1>
          <p>{lessons[0]?.unit_name}</p>
        </div>
      </div>

      {lessons.map((l) => {
        const order = Number(l.lesson_order);
        const isCleared = order < progress;
        const isCurrent = order === progress;
        const isLocked = order > progress;

        return (
          <div className="lessonRow" key={l.lesson_id}>
            <div
              className={`lessonIcon ${isLocked ? "locked" : isCurrent ? "current" : "cleared"}`}
              style={{ backgroundColor: isLocked ? "#9e9e9e" : l.unit_color }}
              onClick={() => { if (!isLocked) goLesson(l) }}
              data-sound
            >
              <img
                src={l.lesson_type === "lecture"
                  ? "/images/icons/lecture_icon.png"
                  : "/images/icons/practice_icon.png"
                }
                className="iconImage"
              />
            </div>
            <div className="lessonInfo">
              <div className="lessonName">{l.lesson_name}</div>
            </div>
          </div>
        );
      })}

      {/* エクストラLesson（全Lessonクリア済み＆CSVがあるときだけ表示） */}
      {hasExtra && progress > Number(lessons[lessons.length - 1]?.lesson_order) && (
        <div className="lessonRow">
          <div
            className="lessonIcon current"
            style={{ backgroundColor: "#FFD54F" }}
            onClick={() => router.push(`/testPractice?lesson=u${unit}_extra`)}
          >
            <img
              src="/images/icons/practice_icon.png"
              className="iconImage"
            />
          </div>
          <div className="lessonInfo">
            <div className="lessonName">ひたすら復習！</div>
          </div>
        </div>
      )}

      <Navigation />
    </div>
  )
}
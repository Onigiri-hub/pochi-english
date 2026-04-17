import { useEffect, useState } from "react"
import { loadCSV } from "../utils/csvLoader"
import { getLecturePages } from "../engines/LectureEngine"
import LecturePage from "../components/LecturePage"
import { useRouter } from "next/router"
import Navigation from "../components/Navigation"; // ①インポートを追加

export default function TestLecture() {

  const [pages, setPages] = useState([])
  const router = useRouter()
  const { lesson } = router.query

  useEffect(() => {
    if(!lesson) return
    async function load() {
      const lectureData = await loadCSV(`/data/lecture/${lesson}.csv`)
      const lessonPages = getLecturePages(lectureData)
      setPages(lessonPages)
    }
    load()
  }, [lesson])  

  if (pages.length === 0) return <div>loading...</div>

  // ② return の中身を Navigation を含む形に書き換える
  return (
    <div style={{ paddingBottom: "180px", minHeight: "100vh" }}>
      <LecturePage pages={pages} />
      <Navigation />
    </div>
  )
}
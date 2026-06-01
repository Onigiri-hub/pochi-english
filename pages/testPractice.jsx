import { useEffect, useState } from "react"
import { loadCSV } from "../utils/csvLoader"
import { getPracticeQuestions } from "../engines/PracticeEngine"
import PracticePage from "../components/PracticePage"
import { useRouter } from "next/router"
import Navigation from "../components/Navigation";

export default function TestPractice() {

  const [questions, setQuestions] = useState([])
  const router = useRouter()
  const { lesson } = router.query

  console.log("lesson:", lesson)

  function shuffle(array) {
    const copy = [...array]
    for (let i = copy.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      const temp = copy[i]
      copy[i] = copy[j]
      copy[j] = temp
    }
    return copy
  }

  useEffect(() => {

    if(!router.isReady) return

    async function load() {

      console.log("loading csv:", `/data/practice/${lesson}.csv`)

      const data =
        await loadCSV(`/data/practice/${lesson}.csv`)

      console.log("csv data:", data)

      let q = getPracticeQuestions(data)

      // エクストラLessonならシャッフルして上から10問
      if (lesson.includes("extra")) {
        q = shuffle(q).slice(0, 10)
      }

      console.log("questions:", q)

      setQuestions(q)

    }

    load()

  }, [lesson])

  if (questions.length === 0) return <div>loading...</div>
  
  return (
    <div style={{ paddingBottom: "180px", minHeight: "100vh" }}>
      <PracticePage questions={questions} />
      <Navigation />
    </div>
  );
}
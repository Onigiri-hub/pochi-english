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

  useEffect(() => {

    if(!router.isReady) return

    async function load() {

      console.log("loading csv:", `/data/practice/${lesson}.csv`)

      const data =
        await loadCSV(`/data/practice/${lesson}.csv`)

      console.log("csv data:", data)

      const q = getPracticeQuestions(data)

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
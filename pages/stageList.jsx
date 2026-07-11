import { useEffect, useState } from "react"
import { useRouter } from "next/router"
import { db, auth } from "../firebase"
import { collection, getDocs } from "firebase/firestore"
import Papa from "papaparse"
import Navigation from "../components/Navigation"

export default function StageList() {
  const [stages, setStages] = useState([])
  const [progressMap, setProgressMap] = useState({})
  const router = useRouter()

  useEffect(() => {
    async function load() {
      const [stageRes, secRes, arrSecRes] = await Promise.all([
        fetch("/data/vocab/stageList.csv"),
        fetch("/data/vocab/sectionList.csv"),
        fetch("/data/vocab/arrangeSectionList.csv"),
      ])

      const stageData = Papa.parse(await stageRes.text(), { header: true, skipEmptyLines: true }).data
      const secData = Papa.parse(await secRes.text(), { header: true, skipEmptyLines: true }).data
      const arrSecData = Papa.parse(await arrSecRes.text(), { header: true, skipEmptyLines: true }).data
      setStages(stageData)

      const user = auth.currentUser
      const clearedSet = new Set()
      if (user) {
        try {
          const roundsSnap = await getDocs(collection(db, "users", user.uid, "vocab_rounds"))
          roundsSnap.docs.forEach(d => {
            const data = d.data()
            if (data.totalWords > 0 && data.doneWords?.length >= data.totalWords) {
              clearedSet.add(d.id)
            }
          })
        } catch (e) {
          console.error("vocab_rounds一括取得失敗:", e)
        }
      }

      const map = {}
      await Promise.all(
        stageData.map(async (stage) => {
          const isArrange = stage.mode_category === "arrange"
          const sections = isArrange
            ? arrSecData.filter(s => s.stage_id === stage.stage_id)
            : secData.filter(s => s.stage_id === stage.stage_id)

          let totalRounds = 0
          let clearedRounds = 0

          await Promise.all(
            sections.map(async (section) => {
              const csvPath = isArrange
                ? `/data/vocab/arrange_rounds/${section.arrange_rounds_csv}`
                : `/data/vocab/rounds/${section.rounds_csv}`
              try {
                const rRes = await fetch(csvPath)
                const rText = await rRes.text()
                const rounds = Papa.parse(rText, { header: true, skipEmptyLines: true }).data
                totalRounds += rounds.length
                rounds.forEach(round => {
                  if (clearedSet.has(round.round_id)) clearedRounds++
                })
              } catch (e) {
                console.error(`rounds取得失敗: ${csvPath}`)
              }
            })
          )

          map[stage.stage_id] = { totalRounds, clearedRounds }
        })
      )
      setProgressMap(map)
    }
    load()
  }, [])

  const oneToOne = stages.filter(s => s.mode_category === "1to1")
  const arrange = stages.filter(s => s.mode_category === "arrange")

  return (
    <div className="unitListContainer" style={{ paddingBottom: "100px" }}>
      <div className="unitList">

        {/* 1:1英単語セクション */}
        <div style={{ textAlign: "center", margin: "25px 0 40px", fontSize: "22px", fontWeight: "bold", color: "#333333" }}>
          <img src="/images/icons/honekko_333.svg" style={{ width: "24px", marginRight: "8px", verticalAlign: "middle" }} />
          1:1英単語
        </div>

        {oneToOne.map((stage) => {
          const progress = progressMap[stage.stage_id] || { totalRounds: 0, clearedRounds: 0 }
          return (
            <div
              className="unitCard"
              key={stage.stage_id}
              onClick={() => router.push(`/sectionList?stage=${stage.stage_id}&name=${encodeURIComponent(stage.stage_name)}`)}
            >
              <img src="/images/illustrations/stagelist_button.png" className="unitCardBg" />
              <div className="unitCardContent">
                <div className="unitTitle">{stage.stage_name}</div>
                <div style={{ fontSize: "14px", marginTop: "8px" }}>
                  {progress.clearedRounds}/{progress.totalRounds}
                </div>
              </div>
            </div>
          )
        })}

        {/* 並べて英単語セクション */}
        {arrange.length > 0 && (
          <>
            <div style={{ textAlign: "center", margin: "40px 0 40px", fontSize: "22px", fontWeight: "bold", color: "#333333" }}>
              <img src="/images/icons/honekko_333.svg" style={{ width: "24px", marginRight: "8px", verticalAlign: "middle" }} />
              並べて英単語
            </div>

            {arrange.map((stage) => {
              const progress = progressMap[stage.stage_id] || { totalRounds: 0, clearedRounds: 0 }
              return (
                <div
                  className="unitCard"
                  key={stage.stage_id}
                  style={{ opacity: 0.4, pointerEvents: "none" }}
                >
                  <img src="/images/illustrations/stagelist_button.png" className="unitCardBg" />
                  <div className="unitCardContent">
                    <div className="unitTitle">{stage.stage_name}</div>
                    <div style={{ fontSize: "14px", marginTop: "8px" }}>
                      {progress.clearedRounds}/{progress.totalRounds}
                    </div>
                  </div>
                </div>
              )
            })}
          </>
        )}

      </div>
      <Navigation />
    </div>
  )
}

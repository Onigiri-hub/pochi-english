import { useEffect, useState } from "react"
import { useRouter } from "next/router"
import { db, auth } from "../firebase"
import { collection, getDocs } from "firebase/firestore"
import Papa from "papaparse"
import Navigation from "../components/Navigation"
import { getArrangeWordStatus } from "../utils/vocabProgressManager"

export default function StageList() {
  const [stages, setStages] = useState([])
  const [progressMap, setProgressMap] = useState({})
  const router = useRouter()

  useEffect(() => {
    async function load() {
      const [stageRes, secRes] = await Promise.all([
        fetch("/data/vocab/stageList.csv"),
        fetch("/data/vocab/sectionList.csv"),
      ])

      const stageData = Papa.parse(await stageRes.text(), { header: true, skipEmptyLines: true }).data
      const secData = Papa.parse(await secRes.text(), { header: true, skipEmptyLines: true }).data
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
          // 並べて英単語：Rounds ではなく「履修済み単語数 / 全単語数」で進捗を出す
          if (stage.mode_category === "arrange") {
            try {
              const wRes = await fetch(`/data/vocab/arrange_words/arrange_words_${stage.stage_id}.csv`)
              const wText = await wRes.text()
              const wordsData = Papa.parse(wText, { header: true, skipEmptyLines: true }).data
                .filter(w => w.arrange_word)
              const status = await getArrangeWordStatus(stage.stage_id)
              const learnedCount = wordsData.filter(w => status[w.arrange_word_id]?.learned).length
              map[stage.stage_id] = { total: wordsData.length, cleared: learnedCount }
            } catch (e) {
              console.error(`arrange_words取得失敗: ${stage.stage_id}`)
              map[stage.stage_id] = { total: 0, cleared: 0 }
            }
            return
          }

          // 1:1英単語：Rounds のクリア数で進捗を出す
          const sections = secData.filter(s => s.stage_id === stage.stage_id)
          let total = 0
          let cleared = 0

          await Promise.all(
            sections.map(async (section) => {
              const csvPath = `/data/vocab/rounds/${section.rounds_csv}`
              try {
                const rRes = await fetch(csvPath)
                const rText = await rRes.text()
                const rounds = Papa.parse(rText, { header: true, skipEmptyLines: true }).data
                total += rounds.length
                rounds.forEach(round => {
                  if (clearedSet.has(round.round_id)) cleared++
                })
              } catch (e) {
                console.error(`rounds取得失敗: ${csvPath}`)
              }
            })
          )

          map[stage.stage_id] = { total, cleared }
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
          const progress = progressMap[stage.stage_id] || { total: 0, cleared: 0 }
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
                  {progress.cleared}/{progress.total}
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
              const progress = progressMap[stage.stage_id] || { total: 0, cleared: 0 }
              return (
                <div
                  className="unitCard"
                  key={stage.stage_id}
                  onClick={() => router.push(`/arrangeSectionList?stage=${stage.stage_id}&name=${encodeURIComponent(stage.stage_name)}`)}
                >
                  <img src="/images/illustrations/stagelist_button.png" className="unitCardBg" />
                  <div className="unitCardContent">
                    <div className="unitTitle">{stage.stage_name}</div>
                    <div style={{ fontSize: "14px", marginTop: "8px" }}>
                      {progress.cleared}/{progress.total}
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

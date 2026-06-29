import { useEffect, useState } from "react"
import { useRouter } from "next/router"
import Papa from "papaparse"
import Navigation from "../components/Navigation"
import { getVocabRoundProgress } from "../utils/vocabProgressManager"

export default function ArrangeSectionList() {
  const [sections, setSections] = useState([])
  const [roundsMap, setRoundsMap] = useState({})
  const [roundProgressMap, setRoundProgressMap] = useState({})
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  const { stage, name } = router.query
  const stageName = name ? decodeURIComponent(name) : ""

  useEffect(() => {
    if (!stage) return

    async function load() {
      const res = await fetch("/data/vocab/arrangeSectionList.csv")
      const text = await res.text()
      const data = Papa.parse(text, { header: true, skipEmptyLines: true }).data
      const filtered = data.filter(s => s.stage_id === stage)
      setSections(filtered)

      const map = {}
      await Promise.all(
        filtered.map(async (section) => {
          const r = await fetch(`/data/vocab/arrange_rounds/${section.arrange_rounds_csv}`)
          const t = await r.text()
          const rounds = Papa.parse(t, { header: true, skipEmptyLines: true }).data
          map[section.section_id] = rounds
        })
      )
      setRoundsMap(map)

      const allRounds = Object.values(map).flat()
      const progressEntries = await Promise.all(
        allRounds.map(async (r) => {
          const p = await getVocabRoundProgress(r.round_id)
          return [r.round_id, p]
        })
      )
      setRoundProgressMap(Object.fromEntries(progressEntries))
      setLoading(false)
    }
    load()
  }, [stage])

  if (loading) return <div>loading...</div>
  if (sections.length === 0) return (
    <div className="unitListContainer" style={{ paddingBottom: "100px" }}>
      <div className="unitList">
        <div style={{ display: "flex", alignItems: "center", marginBottom: "10px", position: "relative" }}>
          <button
            onClick={() => router.push("/stageList")}
            style={{ background: "none", border: "none", fontSize: "15px", fontWeight: "bold", color: "#333333", cursor: "pointer" }}
          >
            ◀
          </button>
          <div style={{ position: "absolute", left: "50%", transform: "translateX(-50%)", fontWeight: "bold", fontSize: "16px", color: "#333333" }}>
            {stageName}
          </div>
        </div>
        <div style={{ textAlign: "center", color: "#aaa", marginTop: "60px" }}>このステージはまだ準備中です</div>
      </div>
      <Navigation />
    </div>
  )

  return (
    <div className="unitListContainer" style={{ paddingBottom: "100px" }}>
      <div className="unitList">

        <div style={{ display: "flex", alignItems: "center", marginBottom: "10px", position: "relative" }}>
          <button
            onClick={() => router.push("/stageList")}
            style={{ background: "none", border: "none", fontSize: "15px", fontWeight: "bold", color: "#333333", cursor: "pointer" }}
          >
            ◀
          </button>
          <div style={{ position: "absolute", left: "50%", transform: "translateX(-50%)", fontWeight: "bold", fontSize: "16px", color: "#333333" }}>
            {stageName}
          </div>
        </div>

        {sections.map((section) => {
          const rounds = roundsMap[section.section_id] || []

          return (
            <div key={section.section_id} style={{ marginBottom: "30px" }}>

              <div style={{ marginBottom: "25px", marginTop: "60px", textAlign: "center" }}>
                <div style={{ fontWeight: "bold", fontSize: "18px", marginBottom: "0px" }}>
                  {section.section_name}
                </div>
                <img
                  src="/images/illustrations/section_underbar.png"
                  style={{ width: "90%", height: "auto" }}
                />
              </div>

              <div style={{
                display: "grid",
                gridTemplateColumns: "repeat(4, 60px)",
                gap: "25px",
                justifyContent: "center",
                padding: "0 30px"
              }}>
                {rounds.map((round) => {
                  const progress = roundProgressMap[round.round_id] || { doneWords: [], totalWords: 0 }
                  const doneCount = (progress.doneWords || []).length
                  const totalCount = progress.totalWords || parseInt(round.question_count)
                  const isCompleted = totalCount > 0 && doneCount >= totalCount
                  const inProgress = doneCount > 0 && !isCompleted
                  const percent = totalCount > 0 ? (doneCount / totalCount) * 100 : 0

                  return (
                    <div
                      key={round.round_id}
                      onClick={() => router.push(`/vocabArrange?section=${section.section_id}&round=${round.round_id}`)}
                      style={{
                        width: "60px",
                        height: "60px",
                        borderRadius: "50%",
                        background: isCompleted ? "#02ccbb" : "#ddd",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        color: "white",
                        fontWeight: "bold",
                        cursor: "pointer",
                        position: "relative"
                      }}
                    >
                      {isCompleted ? (
                        <span style={{ fontSize: "25px" }}>✓</span>
                      ) : inProgress ? (
                        <>
                          <svg width="60" height="60" style={{ position: "absolute", top: 0, left: 0 }}>
                            <circle
                              cx="30" cy="30" r="26"
                              fill="none"
                              stroke="#02ccbb"
                              strokeWidth="4"
                              strokeDasharray={`${2 * Math.PI * 26 * percent / 100} ${2 * Math.PI * 26}`}
                              strokeLinecap="round"
                              transform="rotate(-90 30 30)"
                            />
                          </svg>
                          <span style={{ fontSize: "18px", color: "#555" }}>{round.round_no}</span>
                        </>
                      ) : (
                        <span>{round.round_no}</span>
                      )}
                    </div>
                  )
                })}
              </div>

            </div>
          )
        })}

      </div>
      <Navigation />
    </div>
  )
}

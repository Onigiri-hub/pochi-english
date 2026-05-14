import { useEffect, useState } from "react"
import { useRouter } from "next/router"
import Papa from "papaparse"
import Navigation from "../components/Navigation"

export default function SectionList() {
  const [sections, setSections] = useState([])
  const [roundsMap, setRoundsMap] = useState({}) // section_idごとのRound一覧
  const router = useRouter()
  const { stage } = router.query

  useEffect(() => {
    if (!stage) return

    async function load() {
      // sectionList.csvを読み込む
      const res = await fetch("/data/vocab/sectionList.csv")
      const text = await res.text()
      const data = Papa.parse(text, {
        header: true,
        skipEmptyLines: true
      }).data

      const filtered = data.filter(s => s.stage_id === stage)
      setSections(filtered)

      // 各セクションのroundsファイルを読み込む
      const map = {}
      await Promise.all(
        filtered.map(async (section) => {
          const r = await fetch(`/data/vocab/rounds/${section.rounds_csv}`)
          const t = await r.text()
          const rounds = Papa.parse(t, {
            header: true,
            skipEmptyLines: true
          }).data
          map[section.section_id] = rounds
        })
      )
      setRoundsMap(map)
    }
    load()
  }, [stage])

  if (sections.length === 0) return <div>loading...</div>

  return (
    <div className="unitListContainer" style={{ paddingBottom: "100px" }}>
      <div className="unitList">

        {/* 戻るボタン */}
        <div style={{ marginBottom: "10px" }}>
          <button
            onClick={() => router.push("/stageList")}
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
        {/* デバッグ用リセットボタン（確認したら消す） */}
        <button
          onClick={() => {
            Object.keys(localStorage)
              .filter(key => 
                key.startsWith("vocab_round_") || 
                key.startsWith("vocab_mastery_")
              )
              .forEach(key => localStorage.removeItem(key))
            alert("リセットしました！")
            router.reload()
          }}          
          style={{
            background: "#ff4444",
            color: "white",
            border: "none",
            borderRadius: "8px",
            padding: "8px 16px",
            cursor: "pointer",
            marginBottom: "10px"
          }}
        >
          🗑️ 進捗リセット（デバッグ用）
        </button>

        {sections.map((section) => {
          const rounds = roundsMap[section.section_id] || []

          return (
            <div key={section.section_id} style={{ marginBottom: "30px" }}>

              {/* セクション名と進捗バー */}
              <div style={{
                background: "white",
                borderRadius: "16px",
                padding: "16px 20px",
                margin: "50px 0 25px 0",
                boxShadow: "0 2px 8px rgba(0,0,0,0.1)"
              }}>
                <div style={{ fontWeight: "bold", fontSize: "16px", marginBottom: "8px", textAlign: "center" }}>
                  {section.section_name}
                </div>

              </div>

              {/* Roundボタン */}
              <div style={{
                display: "grid",
                gridTemplateColumns: "repeat(4, 60px)",
                gap: "16px",
                justifyContent: "center",
                padding: "0 30px"
              }}>

                {rounds.map((round) => {
                  const key = `vocab_round_${round.round_id}`
                  const progress = JSON.parse(localStorage.getItem(key) || '{"doneWords":[],"totalWords":0}')
                  const doneCount = progress.doneWords.length
                  const totalCount = progress.totalWords || 20
                  const isCompleted = totalCount > 0 && doneCount >= totalCount
                  const inProgress = doneCount > 0 && !isCompleted
                  const percent = totalCount > 0 ? (doneCount / totalCount) * 100 : 0

                  return (
                    <div
                      key={round.round_id}
                      //onClick={() => router.push(`/fourChoices?section=${section.section_id}&round=${round.round_id}`)}
                      
                      onClick={() => {
                        const path = round.mode_type?.includes("typing")
                          ? `/typing1to1?section=${section.section_id}&round=${round.round_id}`
                          : `/fourChoices?section=${section.section_id}&round=${round.round_id}`
                        router.push(path)
                      }}
                      
                      style={{
                        width: "50px",
                        height: "50px",
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
                        <span style={{ fontSize: "20px" }}>✓</span>
                      ) : inProgress ? (
                        <>
                          <svg
                            width="50" height="50"
                            style={{ position: "absolute", top: 0, left: 0 }}
                          >
                            <circle
                              cx="25" cy="25" r="20"
                              fill="none"
                              stroke="#02ccbb"
                              strokeWidth="4"
                              strokeDasharray={`${2 * Math.PI * 20 * percent / 100} ${2 * Math.PI * 20}`}
                              strokeLinecap="round"
                              transform="rotate(-90 25 25)"
                            />
                          </svg>
                          <span style={{ fontSize: "14px", color: "#555" }}>
                            {round.round_no}
                          </span>
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
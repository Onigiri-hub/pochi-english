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
              fontSize: "20px",
              cursor: "pointer"
            }}
          >
            ←
          </button>

        </div>
        
        {/* デバッグ用リセットボタン（確認したら消す） */}
        <button
          onClick={() => {
            // vocab_round_で始まるlocalStorageを全部消す
            Object.keys(localStorage)
              .filter(key => key.startsWith("vocab_round_"))
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
                marginBottom: "12px",
                boxShadow: "0 2px 8px rgba(0,0,0,0.1)"
              }}>
                <div style={{ fontWeight: "bold", fontSize: "16px", marginBottom: "8px" }}>
                  {section.section_name}
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <div style={{
                    flexGrow: 1,
                    height: "8px",
                    background: "#eee",
                    borderRadius: "4px",
                    overflow: "hidden"
                  }}>
                    <div style={{
                      width: "0%",
                      height: "100%",
                      background: "#555",
                      borderRadius: "4px"
                    }} />
                  </div>
                  <div style={{ fontSize: "14px", color: "#666" }}>
                    0/{section.total_words}
                  </div>
                </div>
              </div>

              {/* Roundボタン */}
              <div style={{
                display: "flex",
                flexWrap: "wrap",
                gap: "10px",
                paddingLeft: "10px"
              }}>

              {rounds.map((round) => {
                // localStorageから進捗を取得
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
                    onClick={() => router.push(`/fourChoices?section=${section.section_id}&round=${round.round_id}`)}
                    style={{
                      width: "50px",
                      height: "50px",
                      borderRadius: "50%",
                      background: isCompleted ? "#02ccbb" : "#ccc",
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
                      // 完了：✓
                      <span style={{ fontSize: "20px" }}>✓</span>
                    ) : inProgress ? (
                      // 進行中：円グラフ＋数字
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
                      // 未着手：数字
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
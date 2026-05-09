import { useEffect, useState } from "react"
import { useRouter } from "next/router"
import Papa from "papaparse"
import Navigation from "../components/Navigation"

export default function StageList() {
  const [stages, setStages] = useState([])
  const router = useRouter()

  useEffect(() => {
    async function load() {
      const res = await fetch("/data/vocab/stageList.csv")
      const text = await res.text()
      const data = Papa.parse(text, {
        header: true,
        skipEmptyLines: true
      }).data
      setStages(data)
    }
    load()
  }, [])

  // mode_categoryごとにグループ化
  const oneToOne = stages.filter(s => s.mode_category === "1to1")
  const example  = stages.filter(s => s.mode_category === "example")

  return (
    <div className="unitListContainer" style={{ paddingBottom: "100px" }}>
      <div className="unitList">

        {/* 1:1英単語セクション */}
        <div style={{ textAlign: "center", margin: "20px 0 10px", fontSize: "18px", fontWeight: "bold" }}>
          🐾 1:1英単語
        </div>

        {oneToOne.map((stage) => (
          <div
            className="unitCard"
            key={stage.stage_id}
            onClick={() => router.push(`/sectionList?stage=${stage.stage_id}`)}
          >
            <img
              src="/images/illustrations/unitlist_button.png"
              className="unitCardBg"
            />
            <div className="unitCardContent">
              <div className="unitTitle">{stage.stage_name}</div>
              <div className="unitName">{stage.description}</div>
              <div className="unitBarRow">
                <div className="unitBarContainer">
                  <div className="unitBarFill" style={{ width: "0%", backgroundColor: "#555" }} />
                </div>
                <div className="progressText">-</div>
              </div>
            </div>
          </div>
        ))}

        {/* 使いながら英単語セクション（データがあれば表示） */}
        {example.length > 0 && (
          <>
            <div style={{ textAlign: "center", margin: "30px 0 10px", fontSize: "18px", fontWeight: "bold" }}>
              🐾 使いながら英単語
            </div>
            {example.map((stage) => (
              <div
                className="unitCard"
                key={stage.stage_id}
                onClick={() => router.push(`/sectionList?stage=${stage.stage_id}`)}
              >
                <img
                  src="/images/illustrations/unitlist_button.png"
                  className="unitCardBg"
                />
                <div className="unitCardContent">
                  <div className="unitTitle">{stage.stage_name}</div>
                  <div className="unitName">{stage.description}</div>
                  <div className="unitBarRow">
                    <div className="unitBarContainer">
                      <div className="unitBarFill" style={{ width: "0%", backgroundColor: "#555" }} />
                    </div>
                    <div className="progressText">-</div>
                  </div>
                </div>
              </div>
            ))}
          </>
        )}

      </div>
      <Navigation />
    </div>
  )
}
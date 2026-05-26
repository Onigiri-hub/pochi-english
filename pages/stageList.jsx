import { useEffect, useState } from "react"
import { useRouter } from "next/router"
import { db, auth } from "../firebase"
import { collection, getDocs } from "firebase/firestore"
import Papa from "papaparse"
import Navigation from "../components/Navigation"

export default function StageList() {
  const [stages, setStages] = useState([])
  const [progressMap, setProgressMap] = useState({}) // stage_idごとの進捗
  const router = useRouter()

  useEffect(() => {
    async function load() {
      // stageList.csvを読み込む
      const res = await fetch("/data/vocab/stageList.csv")
      const text = await res.text()
      const stageData = Papa.parse(text, {
        header: true,
        skipEmptyLines: true
      }).data
      setStages(stageData)

      // sectionList.csvを読み込む
      const secRes = await fetch("/data/vocab/sectionList.csv")
      const secText = await secRes.text()
      const secData = Papa.parse(secText, {
        header: true,
        skipEmptyLines: true
      }).data

      // ★ 全vocab_roundsを1回で取得して、クリア済みRoundのSetを作る
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

      // 各stageの進捗を計算
      const map = {}
      await Promise.all(
        stageData.map(async (stage) => {
          // このstageのsectionを絞り込む
          const sections = secData.filter(s => s.stage_id === stage.stage_id)

          let totalRounds = 0
          let clearedRounds = 0

          await Promise.all(
            sections.map(async (section) => {
              // rounds csvを読み込む
              const rRes = await fetch(`/data/vocab/rounds/${section.rounds_csv}`)
              const rText = await rRes.text()
              const rounds = Papa.parse(rText, {
                header: true,
                skipEmptyLines: true
              }).data

              totalRounds += rounds.length

              // ★ clearedSetで判定するだけ（Firestoreアクセスなし）
              rounds.forEach(round => {
                if (clearedSet.has(round.round_id)) clearedRounds++
              })
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
  const example = stages.filter(s => s.mode_category === "example")

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
              onClick={() => router.push(`/sectionList?stage=${stage.stage_id}&name=${encodeURIComponent(stage.stage_name)}`)}            >
              <img
                src="/images/illustrations/stagelist_button.png"
                className="unitCardBg"
              />
              <div className="unitCardContent">
                <div className="unitTitle">{stage.stage_name}</div>
                <div style={{ fontSize: "14px", marginTop: "8px" }}>
                  {progress.clearedRounds}/{progress.totalRounds}
                </div>
              </div>
            </div>
          )
        })}

        {/* 使いながら英単語セクション */}
        {example.length > 0 && (
          <>
            <div style={{ textAlign: "center", margin: "25px 0 40px", fontSize: "22px", fontWeight: "bold", color: "#333333" }}>          <img src="/images/icons/honekko_333.svg" style={{ width: "24px", marginRight: "8px", verticalAlign: "middle" }} />
              <img src="/images/icons/honekko_333.svg" style={{ width: "24px", marginRight: "8px", verticalAlign: "middle" }} />
              使いながら英単語
            </div>

            {example.map((stage) => {
              const progress = progressMap[stage.stage_id] || { totalRounds: 0, clearedRounds: 0 }

              return (
                <div
                  className="unitCard"
                  key={stage.stage_id}
                  onClick={() => router.push(`/sectionList?stage=${stage.stage_id}&name=${encodeURIComponent(stage.stage_name)}`)}
                >
                  <img
                    src="/images/illustrations/stagelist_button.png"
                    className="unitCardBg"
                  />
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

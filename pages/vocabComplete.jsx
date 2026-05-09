import { useRouter } from "next/router"
import { useEffect } from "react"
import Navigation from "../components/Navigation"

export default function VocabComplete() {
  const router = useRouter()
  const { stage, section } = router.query

  useEffect(() => {
    if (!router.isReady) return

    const audio = new Audio("/sound/kirakira.mp3")
    audio.volume = 0.3
    audio.play().catch(e => console.log("音の再生に失敗:", e))

  }, [router.isReady])

  return (
    <div className="completePage" style={{ paddingBottom: "80px" }}>
      <div className="app">
        <div className="completeArea" style={{ flexDirection: "column" }}>

          {/* アニメーション動画 */}
          <video
            src="/animations/animation-great.mp4"
            autoPlay
            muted
            playsInline
            style={{ width: "70%" }}
          />

          {/* 広告エリア（後で中身を入れる） */}
          <div style={{
            width: "100%",
            minHeight: "100px",
            background: "#f0f0f0",
            borderRadius: "12px",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            color: "#aaa",
            fontSize: "14px",
            margin: "20px 0"
          }}>
            広告エリア
          </div>

        </div>
        <div className="bottomArea">
          <div className="completeBottom">
            <button
              className="finishButton"
              onClick={() => router.push(`/sectionList?stage=${stage}`)}
              data-sound
            >
              次へ
            </button>
          </div>
        </div>
      </div>
      <Navigation />
    </div>
  )
}
import { useRouter } from "next/router"
import { useEffect, useState } from "react"
import Navigation from "../components/Navigation"
import { getVocabRoundProgress } from "../utils/vocabProgressManager"
import { updateStreak, calcMofu, addMofu } from "../utils/mofuManager"
import { checkAndEarnBadges, getTotalLessons, BADGE_LIST } from "../utils/badgeManager"

export default function VocabComplete() {
  const router = useRouter()
  const { stage, section, round } = router.query

  const [newBadges, setNewBadges] = useState([])
  const [mofuEarned, setMofuEarned] = useState(0)
  const [showPopup, setShowPopup] = useState(false)

  useEffect(() => {
    if (!router.isReady || !round) return

    const audio = new Audio("/sound/kirakira.mp3")
    audio.volume = 0.3
    audio.play().catch(e => console.log("音の再生に失敗:", e))

    async function handleComplete() {

      // 1. このRoundが初クリアかどうか判定
      // doneWordsがtotalWordsに達しているかで判断
      // ※fourChoicesから来るときはすでにsaveVocabRoundProgressが呼ばれている
      const progress = await getVocabRoundProgress(round)
      const totalWords = progress.totalWords || 20
      const doneCount = progress.doneWords?.length || 0
      const isFirstClear = doneCount >= totalWords

      // 2. 連続日数を更新して取得
      const streak = await updateStreak()

      // 3. モフを計算して加算
      const mofu = calcMofu(streak, isFirstClear)
      await addMofu(mofu)
      setMofuEarned(mofu)

      // 4. 累計レッスン数を取得（英文法と英単語合算）
      const totalLessons = await getTotalLessons()

      // 5. バッジチェック（英単語側はUnit1判定なし、パーフェクト判定なし）
      const badges = await checkAndEarnBadges({
        streak,
        totalLessons,
        isUnit1Complete: false,
        isPerfect: false,
      })

      setNewBadges(badges)

      if (badges.length > 0 || mofu > 0) {
        setShowPopup(true)
      }
    }

    handleComplete()

  }, [router.isReady, round])

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

          {/* モフ獲得表示 */}
          {mofuEarned > 0 && (
            <div style={{
              fontSize: "24px",
              fontWeight: "bold",
              color: "#FF9F43",
              marginTop: "10px",
              animation: "poyon 0.6s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards"
            }}>
              +{mofuEarned} モフ獲得！
            </div>
          )}

          {/* 広告エリア */}
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

        {/* バッジ獲得ポップアップ */}
        {showPopup && newBadges.length > 0 && (
          <>
            <div
              onClick={() => setShowPopup(false)}
              style={{
                position: "fixed",
                inset: 0,
                background: "rgba(0,0,0,0.5)",
                zIndex: 100,
              }}
            />
            <div style={{
              position: "fixed",
              top: "50%",
              left: "50%",
              transform: "translate(-50%, -50%)",
              background: "white",
              borderRadius: "20px",
              padding: "30px 24px",
              zIndex: 101,
              textAlign: "center",
              minWidth: "280px",
              boxShadow: "0 8px 32px rgba(0,0,0,0.2)"
            }}>
              <div style={{ fontSize: "28px", marginBottom: "8px" }}>🎉</div>
              <div style={{ fontSize: "18px", fontWeight: "bold", marginBottom: "16px" }}>
                バッジ獲得！
              </div>
              {newBadges.map(id => {
                const badge = BADGE_LIST.find(b => b.id === id)
                if (!badge) return null
                return (
                  <div key={id} style={{
                    background: "#fffbe6",
                    border: "2px solid #FFD700",
                    borderRadius: "12px",
                    padding: "12px 16px",
                    marginBottom: "10px",
                  }}>
                    <div style={{ fontSize: "32px" }}>{badge.icon}</div>
                    <div style={{ fontSize: "16px", fontWeight: "bold" }}>{badge.name}</div>
                    <div style={{ fontSize: "13px", color: "#888", marginTop: "4px" }}>{badge.description}</div>
                  </div>
                )
              })}
              <button
                onClick={() => setShowPopup(false)}
                style={{
                  marginTop: "16px",
                  padding: "10px 30px",
                  borderRadius: "20px",
                  border: "none",
                  background: "#FF9F43",
                  color: "white",
                  fontWeight: "bold",
                  fontSize: "16px",
                  cursor: "pointer",
                }}
              >
                やった！
              </button>
            </div>
          </>
        )}

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

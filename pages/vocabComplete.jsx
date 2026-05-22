import { useRouter } from "next/router"
import { useEffect, useState } from "react"
import Navigation from "../components/Navigation"
import { checkAndEarnBadges, loadBadgeList } from "../utils/badgeManager"
import { useProfileContext } from "../utils/ProfileContext"
import { updateStreak, calcMofu, addMofu, addTotalRounds } from "../utils/mofuManager"
import { db } from "../firebase"
import { doc, getDoc } from "firebase/firestore"
import { auth } from "../firebase"
import { loadCSV } from "../utils/csvLoader"

export default function VocabComplete() {
  const router = useRouter()
  const { stage, section, round, isFirstClear } = router.query
  const { setMofu, setStreak, setTotalLessons, setTotalDays, totalLessons, totalRounds, totalDays } = useProfileContext()
  const [newBadges, setNewBadges] = useState([])
  const [mofuEarned, setMofuEarned] = useState(0)
  const [showPopup, setShowPopup] = useState(false)

  useEffect(() => {
    if (!router.isReady) return

    const audio = window._kirakira || new Audio("/sound/kirakira.mp3");
    audio.volume = 0.3;
    audio.currentTime = 0;
    audio.play().catch(e => console.log("音の再生に失敗:", e));

    async function handleComplete() {

      // 1. URLから初クリア判定を受け取る ★修正
      const firstClear = isFirstClear === "true"

      // 2. 連続日数を更新して取得
      const streak = await updateStreak()
      setStreak(streak)  // ★追加

      // 3. モフを計算して加算
      const mofu = calcMofu(streak, firstClear)
      await addMofu(mofu)
      if (firstClear) {
        await addTotalRounds() // ★初クリアだけ
        setTotalLessons(prev => prev + 1)  // ★追加
      } 
      setMofuEarned(mofu)
      setMofu(prev => prev + mofu)  // ★追加

      // 4. 累計レッスン数を取得
      //const totalLessons = await getTotalLessons()

      // 4. カウンター取得
      const user = auth.currentUser
      const userSnap = await getDoc(doc(db, "users", user.uid))
      const userData = userSnap.exists() ? userSnap.data() : {}
      const totalLessons = userData.totalLessons || 0
      const totalRounds = userData.totalRounds || 0
      const totalDays = userData.totalDays || 0

      // Stageクリア判定
      const stageId = stage
      const completedStages = []

      // そのStageの全sectionを取得
      const allSections = await loadCSV("/data/vocab/sectionList.csv")
      const stageSections = allSections.filter(s => s.stage_id === stageId)

      // 全sectionの全round_idを収集
      const allRoundIds = []
      await Promise.all(stageSections.map(async (sec) => {
        const rounds = await loadCSV(`/data/vocab/rounds/${sec.rounds_csv}`)
        rounds.forEach(r => allRoundIds.push(r.round_id))
      }))

      // vocab_roundsに全round_idが存在するか確認
      const { getDocs, collection } = await import("firebase/firestore")
      const roundsSnap = await getDocs(collection(db, "users", user.uid, "vocab_rounds"))
      const clearedRoundIds = new Set(roundsSnap.docs.map(d => d.id))

      const isStageComplete = allRoundIds.every(id => clearedRoundIds.has(id))
      if (isStageComplete) completedStages.push(stageId)

      // バッジチェック
      const badges = await checkAndEarnBadges({
        streak,
        totalLessons,
        totalRounds: totalRounds + (firstClear ? 1 : 0),  // ★初クリアなら+1
        totalDays,
        completedStages,
        isUnit1Complete: false,
        isPerfect: false,
      })
      if (badges.length > 0) {
        const badgeList = await loadBadgeList()
        const badgeObjects = badges
          .map(id => badgeList.find(b => b.badge_id === id))
          .filter(Boolean)
        setNewBadges(badgeObjects)
      } else {
        setNewBadges([])
      }

      if (badges.length > 0 || mofu > 0) {
        setShowPopup(true)
      }
    }

    handleComplete()

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
              {newBadges.map(badge => (
                <div key={badge.badge_id} style={{
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
              ))}
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

import { useRouter } from "next/router"
import { saveProgress, checkAndSaveUnitComplete } from "../utils/progressManager"
import { loadCSV } from "../utils/csvLoader"
import { checkAndEarnBadges, loadBadgeList } from "../utils/badgeManager"
import { useEffect, useState } from "react"
import { useProfileContext } from "../utils/ProfileContext"
import Navigation from "../components/Navigation";
import { updateStreak, calcMofu, addMofu, addTotalLessons } from "../utils/mofuManager"
import ShareModal from "../components/ShareModal"

export default function LessonComplete() {
  const router = useRouter()
  const { unit, order, isPerfect, extra } = router.query
  const { 
    setMofu, setStreak, 
    setTotalLessons, totalLessons, 
    totalRounds, 
    completedUnits, setCompletedUnits 
  } = useProfileContext()
  const [newBadges, setNewBadges] = useState([])   // 新しく取ったバッジオブジェクトの配列
  const [mofuEarned, setMofuEarned] = useState(0)
  const [streakCount, setStreakCount] = useState(0)
  const [showStreakPopup, setShowStreakPopup] = useState(false)
  const [showPopup, setShowPopup] = useState(false)
  const [showRest, setShowRest] = useState(false)
  const [shareTarget, setShareTarget] = useState(null)

  useEffect(() => {
    if (!unit) return;

    const audio = window._kirakira || new Audio("/sound/kirakira.mp3");
    audio.volume = 0.2;
    audio.currentTime = 0;
    audio.play().catch(e => console.log("音の再生に失敗:", e));

    let cancelled = false;

    async function updateProgress() {
      if (cancelled) return;

      const isExtra = extra === "true"

      // ★ エクストラLessonの場合：モフ+3固定、進捗・初回判定はスキップ
      if (isExtra) {
        // streakは更新する（学習した事実として）
        const { count: streak, isFirstToday } = await updateStreak()
        setStreak(streak)

        if (isFirstToday && streak >= 2) {
          setStreakCount(streak)
          setShowStreakPopup(true)
        }

        // モフ+3固定
        await addMofu(3)
        setMofuEarned(3)
        setMofu(prev => prev + 3)

        // バッジチェック（累計Lessonは増やさない＝totalLessonsそのまま）
        const newBadgeIds = await checkAndEarnBadges({
          streak,
          totalLessons,
          totalRounds,
          isUnitComplete: null,
          isPerfect: false,
          completedUnitCount: completedUnits.size,
        })

        if (newBadgeIds.length > 0) {
          const badgeList = await loadBadgeList()
          const badgeObjects = newBadgeIds
            .map(id => badgeList.find(b => b.badge_id === id))
            .filter(Boolean)
          setNewBadges(badgeObjects)
          if (!(isFirstToday && streak >= 2)) setShowPopup(true)
        }

        return  // ★ 通常処理はやらずに終了
      }

      // ===== ここから下は通常Lessonの処理（今まで通り）=====

      // 1. 進捗保存 → 初クリアかどうかが返ってくる
      const { isFirstClear } = await saveProgress(unit, Number(order));

      // 2. 連続日数を更新して取得
      const { count: streak, isFirstToday } = await updateStreak()
      setStreak(streak)

      if (isFirstToday && streak >= 2) {
        setStreakCount(streak)
        setShowStreakPopup(true)
      }

      // 3. モフを計算して加算
      const mofu = calcMofu(streak, isFirstClear);
      await addMofu(mofu);
      if (isFirstClear) {
        await addTotalLessons()
        setTotalLessons(prev => prev + 1)
      }      
      setMofuEarned(mofu);
      setMofu(prev => prev + mofu)

      // 4. Unit完了チェック
      const unitList = await loadCSV("/data/all_unit_list.csv")
      const unitLessons = unitList.filter(r => r.unit_NO === String(unit))
      const totalLessonsInUnit = unitLessons.length

      const isUnitComplete = await checkAndSaveUnitComplete(unit, totalLessonsInUnit, completedUnits)
      if (isUnitComplete) {
        setCompletedUnits(prev => new Set([...prev, `u${unit}`]))
      }

      // 5. バッジチェック（Contextの値を使う）
      const newBadgeIds = await checkAndEarnBadges({
        streak,
        totalLessons: totalLessons + (isFirstClear ? 1 : 0),
        totalRounds,
        isUnitComplete: isUnitComplete ? String(unit) : null,
        isPerfect: isPerfect === "true",
        completedUnitCount: completedUnits.size + (isUnitComplete ? 1 : 0),
      })

      // 6. csvからバッジ一覧を読み込んで、IDからオブジェクトに変換
      if (newBadgeIds.length > 0) {
        const badgeList = await loadBadgeList()
        const badgeObjects = newBadgeIds
          .map(id => badgeList.find(b => b.badge_id === id))
          .filter(Boolean)
        setNewBadges(badgeObjects)
        if (!(isFirstToday && streak >= 2)) setShowPopup(true)
      }
    }

    updateProgress();
    return () => { cancelled = true };

  }, [unit])

  useEffect(() => {
    document.documentElement.style.overscrollBehavior = "none"
    document.body.style.overscrollBehavior = "none"
    return () => {
      document.documentElement.style.overscrollBehavior = ""
      document.body.style.overscrollBehavior = ""
    }
  }, [])

  useEffect(() => {
    const timer = setTimeout(() => setShowRest(true), 2000)
    return () => clearTimeout(timer)
  }, [])  

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
          {false && showRest && (
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
          )}

        </div>

        {/* 連続学習ポップアップ */}
        {showStreakPopup && (
          <>
            <div
              onClick={() => {
                setShowStreakPopup(false)
                if (newBadges.length > 0) setShowPopup(true)
              }}
              style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 100 }}
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
              <div style={{ fontSize: "48px", marginBottom: "8px" }}>🔥</div>
              <div style={{ fontSize: "22px", fontWeight: "bold", color: "#FF9F43" }}>
                {streakCount}日連続！
              </div>
              <div style={{ fontSize: "14px", color: "#888", margin: "8px 0 20px" }}>
                すごい！頑張ってるね！
              </div>
              <button
                onClick={() => {
                  setShowStreakPopup(false)
                  if (newBadges.length > 0) setShowPopup(true)
                }}
                style={{
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
                  <button
                    onClick={() => { setShowPopup(false); setShareTarget(badge) }}
                    style={{
                      marginTop: "10px",
                      padding: "8px 20px",
                      borderRadius: "16px",
                      border: "none",
                      background: "#f4a6c0",
                      color: "#fff",
                      fontWeight: "bold",
                      fontSize: "13px",
                      cursor: "pointer",
                    }}
                  >
                    shareする
                  </button>
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

        {shareTarget && (
          <ShareModal badge={shareTarget} onClose={() => setShareTarget(null)} />
        )}

        {showRest && (
          <div className="bottomArea">
            <div className="completeBottom">
              <button
                className="finishButton"
                onClick={() => router.replace(`/lessonList?unit=${unit}`)}
                data-sound
              >
                次へ
              </button>
            </div>
          </div>
        )}
      </div>
      <Navigation />
    </div>
  )
}

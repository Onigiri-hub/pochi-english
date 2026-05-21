// pages/progress.jsx
import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import Navigation from "../components/Navigation";
import { auth, db } from "../firebase";
import { doc, getDoc, setDoc, collection, query, getDocs, orderBy } from "firebase/firestore";
import { Bar } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";
import { getBadges, loadBadgeList } from "../utils/badgeManager"; // ★追加

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

export default function Progress() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true); // ★追加
  const [profile, setProfile] = useState(null);
  const [streakCount, setStreakCount] = useState(0) // ★追加
  const [historyData, setHistoryData] = useState([]);
  const [vocabHistoryData, setVocabHistoryData] = useState([])
  const [earnedBadges, setEarnedBadges] = useState([])  // ★追加
  const [badgeList, setBadgeList] = useState([])         // ★追加
  const router = useRouter();

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (u) => {
      setUser(u);
      if (u) {
        // 1. プロフィール読み込み
        const userRef = doc(db, "users", u.uid);
        const snap = await getDoc(userRef);
        if (snap.exists()) {
          setProfile(snap.data());
        } else {
          const defaultProfile = {
            nickname: u.displayName || "ゲスト",
            avatar: "01.png"
          };
          await setDoc(userRef, defaultProfile);
          setProfile(defaultProfile);
        }
        setLoading(false); // ★ここに追加 



        // 2. 英文法の学習履歴
        const historyRef = collection(db, "users", u.uid, "history");
        const q = query(historyRef, orderBy("clearedAt", "desc"));
        const hSnap = await getDocs(q);
        const docs = hSnap.docs.map(doc => doc.data());
        setHistoryData(docs);

        // 3. 英単語の学習履歴
        const vocabHistoryRef = collection(db, "users", u.uid, "vocab_history")
        const vocabQ = query(vocabHistoryRef, orderBy("clearedAt", "desc"))
        const vocabSnap = await getDocs(vocabQ)
        const vocabDocs = vocabSnap.docs.map(doc => doc.data())
        setVocabHistoryData(vocabDocs)

        // 4. streak取得 ★追加
        const { getStreak } = await import("../utils/mofuManager")
        const currentStreak = await getStreak()
        setStreakCount(currentStreak)

        // 5. バッジ読み込み ★追加
        const earned = await getBadges()
        setEarnedBadges(earned)
        const list = await loadBadgeList()
        setBadgeList(list)
      }
    });
    return () => unsubscribe();
  }, []);

  const getGraphData = () => {
    const days = []
    const grammarCounts = []
    const vocabCounts = []

    for (let i = 6; i >= 0; i--) {
      const d = new Date()
      d.setDate(d.getDate() - i)
      const s = d.toLocaleDateString('sv-SE')
      days.push(d.toLocaleDateString('ja-JP', { weekday: 'short' }))

      const grammarCount = historyData.filter(h => h.dateString === s).length
      const vocabCount = vocabHistoryData.filter(h => h.dateString === s).length
      grammarCounts.push(grammarCount)
      vocabCounts.push(vocabCount)
    }

    return {
      labels: days,
      datasets: [
        {
          label: "英文法",
          data: grammarCounts,
          backgroundColor: "#FF9F43",
          borderRadius: 5,
        },
        {
          label: "英単語",
          data: vocabCounts,
          backgroundColor: "#02ccbb",
          borderRadius: 5,
        },
      ],
    }
  }

  // 学習開始日
  const allHistory = [...historyData, ...vocabHistoryData]
  const startDate = allHistory.length > 0
    ? allHistory.reduce((oldest, h) =>
        h.dateString < oldest ? h.dateString : oldest
      , allHistory[0].dateString)
    : null

  // 連続記録
  //const calcStreak = () => {
  //  const allDays = new Set(allHistory.map(h => h.dateString))
  //  let streak = 0
  //  const today = new Date()
  //  for (let i = 0; i < 365; i++) {
  //    const d = new Date(today)
  //    d.setDate(d.getDate() - i)
  //    const s = d.toLocaleDateString("sv-SE")
  //    if (allDays.has(s)) {
  //      streak++
  //    } else {
  //      break
  //    }
  //  }
  //  return streak
  //}
  
  //const streak = calcStreak()
  
  if (loading) return null; // ★追加（何も表示しない）

  return (
    <div className="container">
      <div className="mainContent">
        <div className="header" style={{ justifyContent: "flex-end" }}>
          <button className="settingsBtn" onClick={() => router.push("/settings")}>⚙️</button>
        </div>

        <div className="profileSection">

          <div className="avatarCircle" style={{ position: "relative" }}>
            {/* レイヤー1: アバター（ベース） */}
            <img
              src={`/images/avatars/${profile?.avatar || "01.png"}`}
              alt="Avatar"
              style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%" }}
            />
            {/* レイヤー2: 目元アクセサリ */}
            {profile?.acc_eye && (
              <img
                src={`/images/avatars/${profile.acc_eye}`}
                alt="eye"
                style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%" }}
              />
            )}
            {/* レイヤー3: 口元アクセサリ */}
            {profile?.acc_mouth && (
              <img
                src={`/images/avatars/${profile.acc_mouth}`}
                alt="mouth"
                style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%" }}
              />
            )}
            {/* レイヤー4: 頭アクセサリ（最前面） */}
            {profile?.acc_head && (
              <img
                src={`/images/avatars/${profile.acc_head}`}
                alt="head"
                style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%" }}
              />
            )}
          </div>

          <h2 className="nickname">{profile ? profile.nickname : ""}</h2>
        </div>

        <div className="statsGrid">
          <div className="statItem">
            <span className="statLabel">学習開始</span>
            <span style={{ fontSize: "16px", fontWeight: "bold", color: "#333" }}>
              {startDate
                ? `${startDate.slice(0, 4)}年${Number(startDate.slice(5, 7))}月`
                : "-"
              }
            </span>
          </div>
          <div className="statItem">
            <span className="statLabel">連続記録</span>
            <span className="statValue">{streakCount}日</span>
          </div>
        </div>

        {/* グラフエリア */}
        <div className="graphContainer"
          style={{
            background: "#f8f8f8",
            padding: "10px",
            borderRadius: "10px",
            marginTop: "20px",
            height: "200px"
          }}>
          <Bar
            data={getGraphData()}
            options={{
              responsive: true,
              maintainAspectRatio: false,
              plugins: {
                legend: { display: true, position: "bottom" }
              },
              scales: {
                x: {
                  stacked: true,
                  grid: { display: false },
                },
                y: {
                  stacked: true,
                  display: true,
                  grid: { display: false },
                  beginAtZero: true,
                  ticks: {
                    stepSize: 1,
                    callback: (value) => {
                      if (Math.floor(value) === value) return value
                    }
                  }
                }
              }
            }}
          />
        </div>

        {/* バッジ一覧 ★追加 */}
        <div style={{ marginTop: "50px" }}>
          <h3 style={{ fontSize: "16px", color: "#666", marginBottom: "20px" }}>
            実績バッジ
          </h3>
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(4, 1fr)",
            gap: "8px",
          }}>
            {badgeList.map(badge => {
              const earned = earnedBadges.includes(badge.badge_id)
              return (
                <div
                  key={badge.badge_id}
                  style={{
                    textAlign: "center",
                    opacity: earned ? 1 : 0.35,
                  }}
                  title={badge.description}
                >
                  <img
                    src={earned
                      ? `/images/badges/${badge.image_earned}`
                      : `/images/badges/${badge.image_locked}`
                    }
                    alt={badge.name}
                    style={{
                      width: "70%",
                      aspectRatio: "1",
                      objectFit: "contain",
                      borderRadius: "12px",
                    }}
                  />
                  <div style={{
                    fontSize: "10px",
                    color: "#555",
                    marginTop: "4px",
                    lineHeight: 1.2,
                  }}>
                    {badge.name}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        <div className="profileLinks" style={{ marginTop: "30px" }}>
          <ul className="links">
            <li onClick={() => router.push("/help")} style={{ cursor: "pointer" }}>ヘルプ</li>
            <li onClick={() => router.push("/terms")} style={{ cursor: "pointer" }}>利用規約とプライバシーポリシー</li>
          </ul>
          <button
            className="logoutBtn"
            onClick={async () => {
              await auth.signOut();
              router.push("/");
            }}
          >
            ログアウト
          </button>
        </div>

      </div>
      <Navigation />
    </div>
  );
}

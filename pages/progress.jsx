// pages/progress.jsx
import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import Navigation from "../components/Navigation";
import { auth, db } from "../firebase";
import { doc, getDoc, setDoc, collection, query, getDocs, orderBy } from "firebase/firestore"; // collection, queryなどを追加
import { Bar } from "react-chartjs-2"; // グラフ用
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

export default function Progress() {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [historyData, setHistoryData] = useState([]); // 履歴データ用
  const [totalDays, setTotalDays] = useState(0);      // 学習日数用
  const router = useRouter();

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (u) => {
      setUser(u);
      if (u) {
        // 1. プロフィール読み込み（既存）
        const userRef = doc(db, "users", u.uid);
        const snap = await getDoc(userRef);
        //if (snap.exists()) {
        //  setProfile(snap.data());
        //}
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
        // 2. 学習履歴(history)の読み込みを追加
        const historyRef = collection(db, "users", u.uid, "history");
        const q = query(historyRef, orderBy("clearedAt", "desc"));
        const hSnap = await getDocs(q);
        const docs = hSnap.docs.map(doc => doc.data());
        setHistoryData(docs);

        // 学習日数の集計（重複を除いた日付の数）
        const uniqueDays = new Set(docs.map(d => d.dateString));
        setTotalDays(uniqueDays.size);
      }
    });
    return () => unsubscribe();
  }, []);

  // グラフ用のデータ作成
  const getGraphData = () => {
    const days = [];
    const counts = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const s = d.toLocaleDateString('sv-SE'); // "YYYY-MM-DD"
      days.push(d.toLocaleDateString('ja-JP', { weekday: 'short' })); // "月", "火"...
      
      const count = historyData.filter(h => h.dateString === s).length;
      counts.push(count);
    }

    return {
      labels: days,
      datasets: [
        {
          label: "レッスン数",
          data: counts,
          backgroundColor: "#FF9F43",
          borderRadius: 5,
        },
      ],
    };
  };

  return (
    <div className="container">
      <div className="mainContent">
        <div className="header" style={{ justifyContent: "flex-end" }}>
          <button className="settingsBtn" onClick={() => router.push("/settings")}>⚙️</button>
        </div>

        <div className="profileSection">
          <div className="avatarCircle">
            {profile ? (
              <img src={`/images/avatars/${profile.avatar}`} alt="Avatar" />
            ) : null}
          </div>
          <h2 className="nickname">{profile ? profile.nickname : ""}</h2>          
        </div>

        <div className="statsGrid">
          <div className="statItem">
            <span className="statLabel">学習した日数</span>
            <span className="statValue">{totalDays}日</span>
          </div>
         <div className="statItem">
            <span className="statLabel">今週のレッスン数</span>
            <span className="statValue">
              {historyData.filter(h => {
                const d = new Date();
                d.setDate(d.getDate() - 6);
                return h.dateString >= d.toLocaleDateString("sv-SE");
              }).length}回
            </span>
          </div>
        </div>

        {/* グラフエリア */}
        <div className="graphContainer" 
          style={{ 
            background: "#f8f8f8", 
            padding: "10px", 
            borderRadius: "10px", 
            marginTop: "20px", 
            marginBottom: "100px"  
          }}>

          <Bar 
            data={getGraphData()} 
            options={{ 
              responsive: true,
              plugins: { 
                legend: { display: false } // 凡例を非表示
              },
              scales: { 
                x: { 
                  grid: { display: false }, // ★横軸の縦線を消す
                  border: { display: true } // 軸の線自体も消すとよりスッキリするお
                },
                y: { 
                  display: true, // ★左側の数字と横線をまるごと消す場合
                  grid: { display: false }, // 線だけ消したい場合はこちら
                  beginAtZero: true,
                  ticks: {
                    stepSize: 1, // メモリを1刻みにする
                    callback: (value) => {
                      if (Math.floor(value) === value) return value; // 整数のみ表示
                    }
                  }
                }
              }
            }} 
          />

        </div>
        <div className="profileLinks">

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
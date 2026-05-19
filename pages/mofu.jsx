import { useRouter } from "next/router"
import { useEffect, useState } from "react"
import Navigation from "../components/Navigation"
import { getMofu } from "../utils/mofuManager"

export default function Mofu() {
  const router = useRouter()
  const [mofu, setMofu] = useState(null)

  useEffect(() => {
    getMofu().then(m => setMofu(m))
  }, [])

  return (
    <div className="container">
      <div className="mainContent">

        {/* ヘッダー */}
        <div className="header">
          <button className="backBtn" onClick={() => router.back()}>←</button>
          <h2>モフ</h2>
        </div>

        {/* モフ数表示 */}
        <div style={{
          textAlign: "center",
          margin: "30px 0",
          padding: "24px",
          background: "#fffbe6",
          borderRadius: "20px",
          border: "2px solid #FFD700",
        }}>
          <img
            src="/images/icons/mofu.svg"
            alt="モフ"
            style={{ width: "60px", height: "60px", marginBottom: "10px" }}
          />
          <div style={{ fontSize: "14px", color: "#888", marginBottom: "4px" }}>
            現在のモフ
          </div>
          <div style={{ fontSize: "48px", fontWeight: "bold", color: "#FF9F43" }}>
            {mofu === null ? "..." : mofu}
          </div>
        </div>

        {/* アイテムショップ（準備中） */}
        <div style={{ marginBottom: "100px" }}>
          <h3 style={{ fontSize: "16px", color: "#666", marginBottom: "12px" }}>
            アイテムショップ
          </h3>
          <div style={{
            padding: "24px",
            background: "#f8f8f8",
            borderRadius: "16px",
            textAlign: "center",
            color: "#aaa",
            fontSize: "14px",
          }}>
            🛒 準備中…
          </div>
        </div>

      </div>
      <Navigation />
    </div>
  )
}

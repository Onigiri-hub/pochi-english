import { useRouter } from "next/router"
import { useEffect, useState } from "react"
import { useProfileContext } from "../utils/ProfileContext"
import Navigation from "../components/Navigation"
import { getMofu, spendMofu } from "../utils/mofuManager"
import { loadCSV } from "../utils/csvLoader"
import { auth, db } from "../firebase"
import { doc, getDoc, setDoc, collection, getDocs } from "firebase/firestore"

const CATEGORY_LABELS = {
  avatar: "アバター",
  head: "頭のアクセサリ",
  eye: "目元のアクセサリ",
  mouth: "口元のアクセサリ",
}

const CATEGORIES = ["avatar", "head", "eye", "mouth"]

export default function Mofu() {
  const router = useRouter()
  const { mofu, setMofu, profile, streak } = useProfileContext()
  const [items, setItems] = useState([])
  const [purchasedIds, setPurchasedIds] = useState(new Set())
  const [loading, setLoading] = useState(true)
  const [unlockedIds, setUnlockedIds] = useState(new Set())

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      if (!user) return

      // 3. 購入済みアイテム取得
      const itemsSnap = await getDocs(collection(db, "users", user.uid, "items"))
      const ids = new Set(itemsSnap.docs.map((d) => d.id))
      setPurchasedIds(ids)

      // 4. itemList.csv読み込み
      const allItems = await loadCSV("/data/itemList.csv")
      setItems(allItems)

      // 解放済みアイテム取得
      const unlockedSnap = await getDocs(collection(db, "users", user.uid, "unlocked"))
      const unlockedIds = new Set(unlockedSnap.docs.map((d) => d.id))

      // 条件達成したアイテムを新たに解放
      const toUnlock = allItems.filter((item) => {
        if (unlockedIds.has(item.item_id)) return false  // すでに解放済み
        if (item.unlock_condition === "none") return false  // 最初から解放
        if (item.unlock_condition.startsWith("streak_")) {
          const required = parseInt(item.unlock_condition.replace("streak_", ""))
          return streak >= required
        }
        return false
      })
      
      // 新たに解放されたものをFirestoreに保存
      await Promise.all(toUnlock.map((item) =>
        setDoc(doc(db, "users", user.uid, "unlocked", item.item_id), {
          unlockedAt: new Date()
        })
      ))

      // unlockedIdsを更新
      toUnlock.forEach((item) => unlockedIds.add(item.item_id))

      setUnlockedIds(unlockedIds)  // ←最後に追加

      setLoading(false)
    })
    return () => unsubscribe()
  }, [])

  const isUnlocked = (item) => {
    if (item.unlock_condition === "none") return true
    return unlockedIds.has(item.item_id)  // Firestoreの解放済みリストを参照
  }

  const handlePurchase = async (item) => {
    const user = auth.currentUser
    if (!user) return

    const cost = parseInt(item.mofu_cost)

    if (mofu < cost) {
      alert("モフが足りないよ！")
      return
    }

    const confirmed = window.confirm(`「${item.item_id}」を${cost}モフで購入しますか？`)
    if (!confirmed) return

    try {
      // モフを消費
      await spendMofu(cost)
      setMofu((prev) => prev - cost)

      // Firestoreのitemsに追加
      await setDoc(doc(db, "users", user.uid, "items", item.item_id), {
        purchased: true,
        purchasedAt: new Date(),
      })

      setPurchasedIds((prev) => new Set([...prev, item.item_id]))
      alert("購入完了！設定画面から着せ替えできるよ🎉")
    } catch (e) {
      console.error(e)
      alert("購入に失敗しました。")
    }
  }

  if (loading) return (
    <div className="container">
      <div className="mainContent" />
      <Navigation />
    </div>
  )
  
  return (
    <div className="container">
      <div className="mainContent">

        {/* ヘッダー */}
        <div className="header">
          <button className="backBtn" onClick={() => router.back()}>←</button>
          <h2>モフ</h2>
        </div>

        {/* モフ残高 */}
        <div style={{
          textAlign: "center",
          margin: "20px 0",
          padding: "20px",
          background: "#fffbe6",
          borderRadius: "20px",
          border: "2px solid #FFD700",
        }}>
          <img
            src="/images/icons/mofu.svg"
            alt="モフ"
            style={{ width: "50px", height: "50px", marginBottom: "8px" }}
          />
          <div style={{ fontSize: "13px", color: "#888", marginBottom: "4px" }}>現在のモフ</div>
          <div style={{ fontSize: "44px", fontWeight: "bold", color: "#FF9F43" }}>
            {mofu}
          </div>
        </div>

        {/* アイテムショップ */}
        <h3 style={{ fontSize: "16px", color: "#666", marginBottom: "16px" }}>アイテムショップ</h3>

        {CATEGORIES.map((category) => {
          const categoryItems = items.filter((i) => i.category === category)
          if (categoryItems.length === 0) return null

          return (
            <div key={category} style={{ marginBottom: "32px" }}>
              <h4 style={{
                fontSize: "14px",
                color: "#444",
                marginBottom: "12px",
                paddingBottom: "6px",
                borderBottom: "2px solid #eee",
              }}>
                {CATEGORY_LABELS[category]}
              </h4>

              <div style={{
                display: "grid",
                gridTemplateColumns: "repeat(3, 1fr)",
                gap: "12px",
              }}>
                {categoryItems.map((item) => {
                  const unlocked = isUnlocked(item)
                  const purchased = purchasedIds.has(item.item_id)
                  const isFree = parseInt(item.mofu_cost) === 0
                  const canBuy = unlocked && !purchased && !isFree

                  return (
                    <div
                      key={item.item_id}
                      style={{
                        borderRadius: "16px",
                        background: "#f8f8f8",
                        padding: "10px",
                        textAlign: "center",
                        border: purchased ? "2px solid #a9b8e7" : "2px solid transparent",
                        opacity: unlocked ? 1 : 0.6,
                      }}
                    >

                      {/* アイテム画像 */}
                      <div style={{ position: "relative", marginBottom: "8px" }}>
                        {/* シルエット（アバターカテゴリのときは表示しない） */}
                        {category !== "avatar" && (
                          <img
                            src="/images/avatars/silhouette.png"
                            alt=""
                            style={{
                              position: "absolute",
                              top: 0,
                              left: 0,
                              width: "100%",
                              borderRadius: "10px",
                              filter: unlocked ? "none" : "grayscale(100%)",
                            }}
                          />
                        )}
                        {/* アイテム本体（シルエットの上に重ねる） */}
                        <img
                          src={`/images/avatars/${item.file_name}`}
                          alt={item.item_id}
                          style={{
                            position: "relative",
                            width: "100%",
                            borderRadius: "10px",
                            filter: unlocked ? "none" : "grayscale(100%)",
                          }}
                        />
                      </div>

                      {/* 解放条件 or モフ数 or 購入済み */}
                      {!unlocked ? (
                        <div style={{ fontSize: "11px", color: "#aaa", lineHeight: "1.4" }}>
                          🔒 {item.unlock_label}
                        </div>
                      ) : purchased ? (
                        <div style={{ fontSize: "12px", color: "#a9b8e7", fontWeight: "bold" }}>
                          購入済み
                        </div>
                      ) : isFree ? (
                        <div style={{ fontSize: "12px", color: "#888" }}>
                          無料
                        </div>
                      ) : (
                        <button
                          onClick={() => handlePurchase(item)}
                          style={{
                            background: mofu >= parseInt(item.mofu_cost) ? "#FF9F43" : "#ddd",
                            color: mofu >= parseInt(item.mofu_cost) ? "white" : "#aaa",
                            border: "none",
                            borderRadius: "10px",
                            padding: "6px 10px",
                            fontSize: "12px",
                            fontWeight: "bold",
                            cursor: mofu >= parseInt(item.mofu_cost) ? "pointer" : "not-allowed",
                            width: "100%",
                          }}
                          disabled={mofu < parseInt(item.mofu_cost)}
                        >
                          {item.mofu_cost} モフ
                        </button>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })}

        <div style={{ height: "80px" }} />
      </div>
      <Navigation />
    </div>
  )
}

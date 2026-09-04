import { useRouter } from "next/router";
import Navigation from "../components/Navigation";

const newsItems = [
  {
    date: "2026-09-03",
    title: "並べて英単語の機能をスタートしました！",
    body: "",
  },
  {
    date: "2026-09-03",
    title: "英文法をUnit35まで追加しました",
    body: "",
  },
  {
    date: "2026-09-03",
    title: "プライバシーポリシーを改定しました",
    body: "広告（Google AdSense）に関する項目を削除しました。これに伴い、本サービスでは広告配信および広告に関連するデータの取得を行いません。詳しくは「規約とプライバシーポリシー」をご確認ください。",
  },
  {
    date: "2026-07-26",
    title: "実績を画像でシェアする機能を実装しました！",
    body: "",
  },
  {
    date: "2026-07-26",
    title: "Unit25まで追加しました",
    body: "",
  },
  {
    date: "2026-07-18",
    title: "Pochi β版を公開しました",
    body: "ポチの英文法アプリをリリースしました。今後もコンテンツを追加していく予定です。どうぞよろしくお願いします！",
  },
];

export default function News() {
  const router = useRouter();

  return (
    <div className="container">
      <div className="mainContent">
        <div className="header">
          <button className="backBtn" onClick={() => router.back()}>←</button>
          <h2>お知らせ</h2>
        </div>
        <div style={{ marginTop: "20px" }}>
          {newsItems.length === 0 ? (
            <p style={{ textAlign: "center", color: "#aaa", marginTop: "40px" }}>
              現在お知らせはありません
            </p>
          ) : (
            newsItems.map((item, i) => (
              <div
                key={i}
                style={{
                  marginBottom: "20px",
                  padding: "15px",
                  background: "#f9f9f9",
                  borderRadius: "8px",
                }}
              >
                <p style={{ fontSize: "12px", color: "#aaa", margin: "0 0 6px" }}>
                  {item.date}
                </p>
                <p style={{ fontWeight: "bold", color: "#FF9F43", margin: "0 0 8px" }}>
                  {item.title}
                </p>
                {item.body && (
                  <p style={{ fontSize: "14px", lineHeight: "1.6", margin: 0 }}>
                    {item.body}
                  </p>
                )}
              </div>
            ))
          )}
        </div>
      </div>
      <Navigation />
    </div>
  );
}

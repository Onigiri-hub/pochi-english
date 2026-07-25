import { useRouter } from "next/router";
import Navigation from "../components/Navigation";

const newsItems = [
  {
    date: "2026-07-25",
    title: "サイトを公開しました",
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
                <p style={{ fontSize: "14px", lineHeight: "1.6", margin: 0 }}>
                  {item.body}
                </p>
              </div>
            ))
          )}
        </div>
      </div>
      <Navigation />
    </div>
  );
}

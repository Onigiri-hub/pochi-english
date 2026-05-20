import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/router";
import Navigation from "../components/Navigation";
import { doc, setDoc, getDoc, collection, getDocs, deleteDoc } from "firebase/firestore"; 
import { auth, db } from "../firebase";
//import "../styles/profile.css";

export default function Settings() {
  const [nickname, setNickname] = useState("");
  const [selectedAvatar, setSelectedAvatar] = useState("avatar01.png");
  const carouselRef = useRef(null);
  const router = useRouter();

  const avatars = [
    "01.png", "02.png", "03.png",
    "04.png"
  ];

  const handleReset = async () => {
    const user = auth.currentUser;
    if (!user) return;

    const confirmed = window.confirm("進捗データをリセットしますか？\nモフ・バッジ・連続日数もすべてリセットされます。この操作は元に戻せません。");
    if (!confirmed) return;

    try {
      const uid = user.uid;

      // 削除するサブコレクション一覧
      const subCollections = [
        "progress",
        "history",
        "vocab_rounds",
        "vocab_progress",
        "vocab_history",
        "streak",
        "badges",
      ];

      // 全サブコレクションのドキュメントを一括削除
      await Promise.all(
        subCollections.map(async (colName) => {
          const ref = collection(db, "users", uid, colName);
          const snap = await getDocs(ref);
          await Promise.all(snap.docs.map((d) => deleteDoc(d.ref)));
        })
      );

      // mofu（ポイント数）をリセット（users/{uid}のフィールド）
      const userRef = doc(db, "users", uid);
      await setDoc(userRef, { mofu: 0 }, { merge: true });

      // localStorageをクリア
      localStorage.clear();

      alert("すべてのデータをリセットしました！");
      router.reload?.();
    } catch (e) {
      console.error(e);
      alert("リセットに失敗しました。");
    }
  };

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      if (user) {
        const userRef = doc(db, "users", user.uid);
        const snap = await getDoc(userRef);

        if (snap.exists()) {
          // Firestoreにデータがある場合：保存済みの設定を使う
          const data = snap.data();
          setNickname(data.nickname || user.displayName || "user");
          setSelectedAvatar(data.avatar || "01.svg");
            if (data.avatar) {
              const target = carouselRef.current.querySelector(`[data-avatar="${data.avatar}"]`);
              if (target) {
                target.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
              }
            }
        } else {
          // Firestoreにデータがない場合：Googleの初期値を使う
          setNickname(user.displayName || "user");
        }
      }
    });

    return () => unsubscribe();
  }, []);

  // IntersectionObserver（カルーセルの検知）は独立させてOK
  useEffect(() => {
    if (!carouselRef.current) return;

    // Firestoreからの読み込みが終わるまで、少しだけ待ってから監視を始める
    const timer = setTimeout(() => {
      const observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            // ユーザーが実際にスワイプした時だけ反応するようにする
            if (entry.isIntersecting && entry.intersectionRatio > 0.6) {
              const avatarName = entry.target.getAttribute("data-avatar");
              setSelectedAvatar(avatarName);
            }
          });
        },
        { root: carouselRef.current, threshold: 0.6 }
      );

      const elements = carouselRef.current.querySelectorAll(".avatarOption");
      elements.forEach((el) => observer.observe(el));
      
      return () => observer.disconnect();
    }, 500); // 0.5秒くらい猶予をあげる

    return () => clearTimeout(timer);
  }, [nickname]); // ニックネームが入った（読み込み完了）タイミングで動かす
  



 const handleSave = async () => {
  // ボタンを押した瞬間に、改めて現在のユーザーを確認する
  const user = auth.currentUser; 

  if (!user) {
    alert("ログイン状態が確認できません。一度ログインページへ戻るか、しばらく待ってから試してください");
    return;
  }

  try {
    const userRef = doc(db, "users", user.uid);
    await setDoc(userRef, {
      nickname: nickname,
      avatar: selectedAvatar,
      updatedAt: new Date()
    }, { merge: true });

    alert("設定を保存しました！");
    router.push("/progress"); 
  } catch (error) {
    console.error(error);
    alert("保存に失敗しました。Firestoreの権限（Rules）を確認してください。");
  }
};


  return (
    <div className="container">
      <div className="mainContent">
        <div className="header">
          <button className="backBtn" onClick={() => router.back()}>←</button>
          <h2>設定</h2>
        </div>

        <section className="settingSection">
            <h3>アバターの変更</h3>
            <div className="avatarCarousel" ref={carouselRef}>
                {avatars.map((av) => (
                <div 
                    key={av} 
                    data-avatar={av} // 判定用にデータ属性を付与
                    className={`avatarOption ${selectedAvatar === av ? "active" : ""}`}
                    onClick={() => setSelectedAvatar(av)}
                >
                    <img src={`/images/avatars/${av}`} alt="avatar" />
                </div>
                ))}
            </div>
        </section>

        <section className="settingSection">
          <h3>ニックネームの変更</h3>
          <input 
            type="text" 
            className="nickInput"
            value={nickname}
            placeholder="新しいニックネーム"
            onChange={(e) => setNickname(e.target.value)}
          />
        </section>

        <div className="actionButtons">
          <button className="saveBtn" onClick={handleSave}>設定を保存する</button>

          <ul className="links">
            <li onClick={() => router.push("/delete-account")} style={{ cursor: "pointer", color: "#878787" }}>アカウントの削除</li>
            <li onClick={handleReset} style={{ cursor: "pointer", color: "#878787" }}>データリセット</li>
          </ul>
        
        </div>


      </div>
      <Navigation />
    </div>
  );
}
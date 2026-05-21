import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/router";
import Navigation from "../components/Navigation";
import { doc, setDoc, getDoc, collection, getDocs, deleteDoc } from "firebase/firestore";
import { auth, db } from "../firebase";
import { loadCSV } from "../utils/csvLoader";

export default function Settings() {
  const [nickname, setNickname] = useState("");
  const [selectedAvatar, setSelectedAvatar] = useState("01.png");
  const [selectedHead, setSelectedHead] = useState(null);
  const [selectedEye, setSelectedEye] = useState(null);
  const [selectedMouth, setSelectedMouth] = useState(null);

  // 購入済みアイテムをカテゴリ別に管理
  const [avatarItems, setAvatarItems] = useState([]);
  const [headItems, setHeadItems] = useState([]);
  const [eyeItems, setEyeItems] = useState([]);
  const [mouthItems, setMouthItems] = useState([]);

  const avatarCarouselRef = useRef(null);
  const headCarouselRef = useRef(null);
  const eyeCarouselRef = useRef(null);
  const mouthCarouselRef = useRef(null);

  const router = useRouter();

  // カルーセルのIntersectionObserverをセットアップする関数
  const setupCarousel = (ref, setter) => {
    if (!ref.current) return;
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && entry.intersectionRatio > 0.6) {
            const value = entry.target.getAttribute("data-value");
            setter(value === "nothing" ? null : value);
          }
        });
      },
      { root: ref.current, threshold: 0.6 }
    );
    const elements = ref.current.querySelectorAll(".avatarOption");
    elements.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  };

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      if (!user) return;

      // 1. Firestoreからプロフィール取得
      const userRef = doc(db, "users", user.uid);
      const snap = await getDoc(userRef);
      if (snap.exists()) {
        const data = snap.data();
        setNickname(data.nickname || user.displayName || "user");
        setSelectedAvatar(data.avatar || "01.png");
        setSelectedHead(data.acc_head || null);
        setSelectedEye(data.acc_eye || null);
        setSelectedMouth(data.acc_mouth || null);
      } else {
        setNickname(user.displayName || "user");
      }

      // 2. 購入済みアイテム取得
      const itemsSnap = await getDocs(collection(db, "users", user.uid, "items"));
      const purchasedIds = new Set(itemsSnap.docs.map((d) => d.id));

      // 3. itemList.csvを読み込んで購入済みでフィルタリング
      const allItems = await loadCSV("/data/itemList.csv");
      const purchased = allItems.filter(
        (item) => item.mofu_cost === "0" && item.unlock_condition === "none"
          || purchasedIds.has(item.item_id)
      );

      setAvatarItems(purchased.filter((i) => i.category === "avatar"));
      setHeadItems(purchased.filter((i) => i.category === "head"));
      setEyeItems(purchased.filter((i) => i.category === "eye"));
      setMouthItems(purchased.filter((i) => i.category === "mouth"));
    });

    return () => unsubscribe();
  }, []);


  const handleReset = async () => {
    const user = auth.currentUser;
    if (!user) return;

    const confirmed = window.confirm("進捗データをリセットしますか？\nモフ・バッジ・連続日数もすべてリセットされます。この操作は元に戻せません。");
    if (!confirmed) return;

    try {
      const uid = user.uid;
      const subCollections = [
        "progress", "history", "vocab_rounds",
        "vocab_progress", "vocab_history", "streak", "badges",
      ];
      await Promise.all(
        subCollections.map(async (colName) => {
          const ref = collection(db, "users", uid, colName);
          const snap = await getDocs(ref);
          await Promise.all(snap.docs.map((d) => deleteDoc(d.ref)));
        })
      );
      const userRef = doc(db, "users", uid);
      await setDoc(userRef, { mofu: 0 }, { merge: true });
      localStorage.clear();
      alert("すべてのデータをリセットしました！");
      router.reload?.();
    } catch (e) {
      console.error(e);
      alert("リセットに失敗しました。");
    }
  };

  const handleSave = async () => {
    const user = auth.currentUser;
    if (!user) {
      alert("ログイン状態が確認できません。");
      return;
    }
    try {
      const userRef = doc(db, "users", user.uid);
      await setDoc(userRef, {
        nickname,
        avatar: selectedAvatar,
        acc_head: selectedHead,
        acc_eye: selectedEye,
        acc_mouth: selectedMouth,
        updatedAt: new Date(),
      }, { merge: true });
      alert("設定を保存しました！");
      router.push("/progress");
    } catch (error) {
      console.error(error);
      alert("保存に失敗しました。");
    }
  };

  // カルーセルのレンダリング用ヘルパー
  const renderCarousel = (ref, items, selected, setter, category) => {
    const nothingValue = "nothing";
    const allItems = category === "avatar"
      ? items  // アバターはなし不要
      : [{ item_id: "nothing", file_name: "nothing.png" }, ...items];

    return (
      <div className="avatarCarousel" ref={ref}>
        {allItems.map((item) => {
          const value = item.item_id === "nothing" ? null : item.file_name;
          const isSelected = selected === value;
          return (
            <div
              key={item.item_id}
              data-value={item.item_id === "nothing" ? nothingValue : item.file_name}
              className={`avatarOption ${isSelected ? "active" : ""}`}
              onClick={() => setter(value)}
            >
              <img
                src={`/images/avatars/${item.file_name}`}
                alt={item.item_id}
              />
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="container">
      <div className="mainContent">
        <div className="header">
          <button className="backBtn" onClick={() => router.back()}>←</button>
          <h2>設定</h2>
        </div>

        {/* プレビュー */}
        <section className="settingSection">
          <h3>プレビュー</h3>
          <div style={{
            position: "relative",
            width: "120px",
            height: "120px",
            margin: "0 auto",
          }}>
            {/* レイヤー1: アバター（ベース） */}
            <img
              src={`/images/avatars/${selectedAvatar}`}
              alt="avatar"
              style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%" }}
            />
            {/* レイヤー2: 目元アクセサリ */}
            {selectedEye && (
              <img
                src={`/images/avatars/${selectedEye}`}
                alt="eye"
                style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%" }}
              />
            )}
            {/* レイヤー3: 口元アクセサリ */}
            {selectedMouth && (
              <img
                src={`/images/avatars/${selectedMouth}`}
                alt="mouth"
                style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%" }}
              />
            )}
            {/* レイヤー4: 頭アクセサリ（最前面） */}
            {selectedHead && (
              <img
                src={`/images/avatars/${selectedHead}`}
                alt="head"
                style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%" }}
              />
            )}
          </div>
        </section>

        {/* アバター選択 */}
        <section className="settingSection">
          <h3>アバター</h3>
          {renderCarousel(avatarCarouselRef, avatarItems, selectedAvatar, setSelectedAvatar, "avatar")}
        </section>

        {/* 頭アクセサリ */}
        <section className="settingSection">
          <h3>ぼうし</h3>
          {renderCarousel(headCarouselRef, headItems, selectedHead, setSelectedHead, "head")}
        </section>

        {/* 目元アクセサリ */}
        <section className="settingSection">
          <h3>アイテム ①</h3>
          {renderCarousel(eyeCarouselRef, eyeItems, selectedEye, setSelectedEye, "eye")}
        </section>

        {/* 口元アクセサリ */}
        <section className="settingSection">
          <h3>アイテム ②</h3>
          {renderCarousel(mouthCarouselRef, mouthItems, selectedMouth, setSelectedMouth, "mouth")}
        </section>

        {/* ニックネーム */}
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

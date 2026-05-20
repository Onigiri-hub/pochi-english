//import "../styles/practice.css"
import { useState, useEffect, useRef } from "react"
import { checkAnswer } from "../engines/PracticeEngine"
import { useRouter } from "next/router"
import { auth, db } from "../firebase";
import { doc, getDoc } from "firebase/firestore";
import { useDictionary } from "../utils/useDictionary"
import WordPopup from "./WordPopup"

export default function PracticePage({ questions }) {

  const [index,setIndex] = useState(0)
  const [selected,setSelected] = useState([])
  const [chips,setChips] = useState([])
  const [result,setResult] = useState(null)
  const pa = useRef(new Audio("/sound/pi.mp3"))
  const seikaiRef = useRef(null) // 新しく追加（名前をseikaiRefにして区別する
  const q = questions[index]
  const [showJaFirst, setShowJaFirst] = useState(false)
  const [showJaSecond, setShowJaSecond] = useState(false)
  const nextQ = questions[index+1]
  const router = useRouter()
  const { lesson } = router.query
  const unit = lesson?.split("_")[0].replace("u","")
  const [profile, setProfile] = useState({ avatar: "01.png" });
  const order = Number(lesson?.split("_")[1]?.replace("l",""))
  const { tokenize } = useDictionary()
  const [popupEntry, setPopupEntry] = useState(null)

  useEffect(() => {
    // ★追加：ログインしているユーザーのアバターを取得
    const unsubscribe = auth.onAuthStateChanged(async (u) => {
      if (u) {
        const userRef = doc(db, "users", u.uid);
        const snap = await getDoc(userRef);
        if (snap.exists()) {
          const data = snap.data();
          setProfile({ avatar: data.avatar || "01.png", ...data });
        }
      }
    });
    return () => unsubscribe();
  }, []);



  function handleWordTap(entry) {
    if (entry.audio) {
      const audio = new Audio(`/audio/words/${entry.audio}`)
      audio.play().catch(e => console.log("再生失敗:", e))
    }
    setPopupEntry(entry)
  }  


  useEffect(() => {
    setShowJaFirst(q.ja_show_first === "1")
    setShowJaSecond(q.ja_show_second === "1")
  }, [index])

  // 自動再生
  useEffect(() => {
    if (q.audio_auto !== "1" || !q.audio_first) return

    const timer = setTimeout(() => {
      const audio = new Audio(`/audio/practice/${q.audio_first}`)
      audio.play().catch(e => console.log("自動再生失敗:", e))
    }, 500) // ★ 500ms秒後

    return () => clearTimeout(timer) // クリーンアップ

  }, [index])

  // 手動再生
  function playAudio(filename) {
    if (!filename) return
    const audio = new Audio(`/audio/practice/${filename}`)
    audio.play().catch(e => console.log("再生失敗:", e))
  }

  useEffect(()=>{
    setChips(shuffle(q.chips.split("|")))
    // 音の準備（まだ作られていなければ作る）
    if (!seikaiRef.current) {
      seikaiRef.current = new Audio("/sound/seikai.mp3")
      seikaiRef.current.playbackRate = 1.5 // ここで1.5倍速！
    }
    
  },[index])


  function shuffle(array){
    const copy=[...array]
    for(let i=copy.length-1;i>0;i--){
      const j=Math.floor(Math.random()*(i+1))
      const temp=copy[i]
      copy[i]=copy[j]
      copy[j]=temp
    }
    return copy
  }

  function addChip(word,i){
    pa.current.currentTime = 0
    pa.current.play()
    setSelected([...selected,word])
    const copy = [...chips]
    copy.splice(i,1)
    setChips(copy)
  }

  function removeChip(word,i){
    pa.current.currentTime = 0
    pa.current.play()
    const copy = [...selected]
    copy.splice(i,1)
    setSelected(copy)
    setChips([...chips,word])
  }

  function check(){
    const answer = selected.join(" ")
    const ok = checkAnswer(answer,q.answer)

    if(ok){
      // seikaiRef.current があるか確認して再生
      if (seikaiRef.current) {
        seikaiRef.current.currentTime = 0
        seikaiRef.current.play()
      }
      setResult("correct")
    }else{
      setResult("wrong")
    }
  }


  function next(){
    if(index < questions.length-1){
      setIndex(i=>i+1)
      setSelected([])
      setChips([])
      setResult(null)
    }else{
      router.push(`/lessonComplete?unit=${unit}&order=${order}`)
    }
  }

  return (

    <div className="app">

      <div className="progressDots">
        {questions.map((_,i)=>(
          <div
            key={i}
            className={i===index ? "dot active" : "dot"}
          />
        ))}
      </div>
    


      <div className={`chat ${q.position_first || "left"}`}>
        <div className="iconContainer">
          <img
            src={q?.icon_first === "user"
              ? `/images/avatars/${profile.avatar}`
              : `/images/avatars/${q?.icon_first}`}
            alt="Character Icon"
            className="characterIcon"
          />
        </div>
        <div className="bubble">

          {/*
          <div className="en">
            {q.audio_first && (
              <span className="audioBtn" onClick={() => playAudio(q.audio_first)}>🔊</span>
            )}
            {q.sentence_first_en}
            {q.ja_show_first !== "1" && (
              <span className="jaToggleBtn" onClick={() => setShowJaFirst(v => !v)}>
                {showJaFirst ? "🔼" : "🔽"}
              </span>
            )}
          </div>
          */}

          <div className="en">
            {q.audio_first && (
              <span className="audioBtn" onClick={() => playAudio(q.audio_first)}>🔊</span>
            )}
            {tokenize(q.sentence_first_en).map((token, i) =>
              token.entry ? (
                <span
                  key={i}
                  style={{ borderBottom: "2px solid #a9b8e7", cursor: "pointer" }}
                  onClick={() => handleWordTap(token.entry)}
                >
                  {token.text}
                </span>
              ) : (
                <span key={i}>{token.text}</span>
              )
            )}
            {q.ja_show_first !== "1" && (
              <span className="jaToggleBtn" onClick={() => setShowJaFirst(v => !v)}>
                {showJaFirst ? "🔼" : "🔽"}
              </span>
            )}
          </div>

          {showJaFirst && (
            <div className="ja">{q.sentence_first_ja}</div>
          )}
        </div>
      </div>

      {q.position_second !== "none" && (
        <div className={`chat ${q.position_second || "right"}`}>
          <div className="iconContainer">
            <img
              src={q?.icon_second === "user"
                ? `/images/avatars/${profile.avatar}`
                : `/images/avatars/${q?.icon_second}`}
              alt="Character Icon"
              className="characterIcon"
            />
          </div>
          <div className="bubble">

            {/*
            <div className="en">
              {q.audio_second && (
                <span className="audioBtn" onClick={() => playAudio(q.audio_second)}>🔊</span>
              )}
              {q.sentence_second_en}
              {q.ja_show_second !== "1" && (
                <span className="jaToggleBtn" onClick={() => setShowJaSecond(v => !v)}>
                  {showJaSecond ? "🔼" : "🔽"}
                </span>
              )}
            </div>
            */}

            <div className="en">
              {q.audio_second && (
                <span className="audioBtn" onClick={() => playAudio(q.audio_second)}>🔊</span>
              )}
              {tokenize(q.sentence_second_en).map((token, i) =>
                token.entry ? (
                  <span
                    key={i}
                    style={{ borderBottom: "2px solid #a9b8e7", cursor: "pointer" }}
                    onClick={() => handleWordTap(token.entry)}
                  >
                    {token.text}
                  </span>
                ) : (
                  <span key={i}>{token.text}</span>
                )
              )}
              {q.ja_show_second !== "1" && (
                <span className="jaToggleBtn" onClick={() => setShowJaSecond(v => !v)}>
                  {showJaFirst ? "🔼" : "🔽"}
                </span>
              )}
            </div>

            {showJaSecond && (
              <div className="ja">{q.sentence_second_ja}</div>
            )}
          </div>
        </div>
      )}


      {/* 答えエリア */}

      <div className="chipBox">
        {selected.map((w,i)=>(
          <button className="chip"
            key={i}
            onClick={()=>removeChip(w,i)}
          >
            {w}
          </button>
        ))}
      </div>

      {/* チップ */}

      <div>
        {chips.map((c,i)=>(
          <button className="chip"
            key={i}
            onClick={()=>addChip(c,i)}
          >
            {c}
          </button>
        ))}
      </div>
      <div className={`bottomArea ${result}`}>
        {result==="correct" && (
          <div className="resultText">Perfect！</div>
        )}
        {result==="wrong" && (
          <div className="resultText">惜しい！</div>
        )}
        <button
          className="mainButton"
          onClick={
            result==="correct"
              ? next
              : result==="wrong"
              ? ()=>setResult(null)
              : check
          }
        >
          {result==="correct"
            ? "Next"
            : result==="wrong"
            ? "Try again"
            : "Check"}
        </button>
      </div>     
      
      <WordPopup entry={popupEntry} onClose={() => setPopupEntry(null)} />

    </div>
  
  )

}
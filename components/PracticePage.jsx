//import "../styles/practice.css"
import { useState, useEffect, useRef } from "react"
import { checkAnswer } from "../engines/PracticeEngine"
import { useRouter } from "next/router"
import { useProfileContext } from "../utils/ProfileContext"
import { auth, db } from "../firebase";
import { useDictionary } from "../utils/useDictionary"
import WordPopup from "./WordPopup"

export default function PracticePage({ questions }) {

  const [index,setIndex] = useState(0)
  const [selected,setSelected] = useState([])
  const [chips,setChips] = useState([])
  const [result,setResult] = useState(null)
  const pa = useRef((() => { const a = new Audio("/sound/pa.mp3"); a.volume = 0.3; return a })())
  const seikaiRef = useRef(null) // 新しく追加（名前をseikaiRefにして区別する
  const q = questions[index]
  const [showJaFirst, setShowJaFirst] = useState(false)
  const [showJaSecond, setShowJaSecond] = useState(false)
  const [userShowJa, setUserShowJa] = useState(true)
  const nextQ = questions[index+1]
  const router = useRouter()
  const { lesson } = router.query
  const unit = lesson?.split("_")[0].replace("u","")
  const order = Number(lesson?.split("_")[1]?.replace("l",""))
  const { tokenize, findEntry } = useDictionary()
  const [popupEntry, setPopupEntry] = useState(null)
  const { profile } = useProfileContext()

  //const [longPressEntry, setLongPressEntry] = useState(null)
  const longPressTimer = useRef(null)
  const chipLockRef = useRef(false)

  function handleChipPressStart(word) {
    // 400ms長押しで意味表示＋音声再生
    longPressTimer.current = setTimeout(() => {
      const entry = findEntry(word)
      if (entry) {
        setPopupEntry(entry)
        if (entry.audio) {
          new Audio(`/audio/words/${entry.audio}`).play().catch(() => {})
        }
      }
      longPressTimer.current = null  // 長押し成立フラグ
    }, 400)
  }

  function handleChipPressEnd(word, action, e) {
    // ★B案：マウスイベントの二重発火を防ぐ
    if (e) e.preventDefault()

    // ★A案：処理直後はロック（200ms）
    if (chipLockRef.current) return
    chipLockRef.current = true
    setTimeout(() => { chipLockRef.current = false }, 100)

    // 長押し成立済みなら何もしない（タップ動作キャンセル）
    if (longPressTimer.current === null) {
      setPopupEntry(null)
      return
    }
    // 長押し前に離した = タップ扱い
    clearTimeout(longPressTimer.current)
    longPressTimer.current = null

    // チップの音声を再生
    const chipSoundOn = localStorage.getItem("chipSoundOn") === "true"
    if (chipSoundOn) {
      const entry = findEntry(word)
      if (entry?.audio) {
        const audio = new Audio(`/audio/words/${entry.audio}`)
        audio.play().catch(e => console.log("再生失敗:", e))
      }
    }
    // 元の動作（addChip / removeChip）
    action()
  }    

  function handleWordTap(entry) {
    if (entry.audio) {
      const audio = new Audio(`/audio/words/${entry.audio}`)
      audio.play().catch(e => console.log("再生失敗:", e))
    }
    setPopupEntry(entry)
  }  


  useEffect(() => {
    document.documentElement.style.overscrollBehavior = "none"
    document.body.style.overscrollBehavior = "none"
    return () => {
      document.documentElement.style.overscrollBehavior = ""
      document.body.style.overscrollBehavior = ""
    }
  }, [])

  useEffect(() => {
    setUserShowJa(localStorage.getItem("showJaTranslation") !== "false")
  }, [])

  useEffect(() => {
    setShowJaFirst(false)
    setShowJaSecond(false)
  }, [index])

  // 自動再生（1文目→2文目の連続再生）
  useEffect(() => {
    const autoPlayOn = localStorage.getItem("autoPlayOn") !== "false"
    if (!autoPlayOn || q.audio_auto !== "1" || !q.audio_first) return

    let audio2 = null
    const timer = setTimeout(() => {
      const audio1 = new Audio(`/audio/practice/${q.audio_first}`)
      audio1.play().catch(e => console.log("自動再生1失敗:", e))

      // 1文目が終わったら2文目を500ms後に再生
      if (q.audio_second) {
        audio1.addEventListener("ended", () => {
          setTimeout(() => {
            audio2 = new Audio(`/audio/practice/${q.audio_second}`)
            audio2.play().catch(e => console.log("自動再生2失敗:", e))
          }, 100)
        })
      }
    }, 500)

    return () => clearTimeout(timer)
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
      seikaiRef.current.volume = 0.5
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
      const isExtra = lesson?.includes("extra")
      router.replace(`/lessonComplete?unit=${unit}&order=${order}&extra=${isExtra}`)
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
          {q?.icon_first === "user" ? (
            <div style={{ position: "relative", width: "60px", height: "60px" }}>
              <img src={`/images/avatars/${profile?.avatar || "01.png"}`} alt="" style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%" }} className="characterIcon" />
              {profile?.acc_eye && <img src={`/images/avatars/${profile.acc_eye}`} alt="" style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%" }} />}
              {profile?.acc_mouth && <img src={`/images/avatars/${profile.acc_mouth}`} alt="" style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%" }} />}
              {profile?.acc_head && <img src={`/images/avatars/${profile.acc_head}`} alt="" style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%" }} />}
            </div>
          ) : (
            <img src={`/images/avatars/${q?.icon_first}`} alt="Character Icon" className="characterIcon" />
          )}

        </div>
        <div className="bubble">
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
            {!userShowJa && q.sentence_first_ja && (
              <span className="jaToggleBtn" onClick={() => setShowJaFirst(v => !v)}>
                {showJaFirst ? "🔼" : "🔽"}
              </span>
            )}
          </div>

          {(userShowJa ? !!q.sentence_first_ja : showJaFirst) && (
            <div className="ja">{q.sentence_first_ja}</div>
          )}
        </div>
      </div>

      {q.position_second !== "none" && (
        <div className={`chat ${q.position_second || "right"}`}>
          <div className="iconContainer">
           {console.log("second:", JSON.stringify(q?.icon_second), "profile:", profile)} 
            {q?.icon_second === "user" ? (
              <div style={{ position: "relative", width: "60px", height: "60px" }}>
                <img src={`/images/avatars/${profile?.avatar || "01.png"}`} alt="" style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%" }} className="characterIcon" />
                {profile?.acc_eye && <img src={`/images/avatars/${profile.acc_eye}`} alt="" style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%" }} />}
                {profile?.acc_mouth && <img src={`/images/avatars/${profile.acc_mouth}`} alt="" style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%" }} />}
                {profile?.acc_head && <img src={`/images/avatars/${profile.acc_head}`} alt="" style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%" }} />}
              </div>
            ) : (
              <img src={`/images/avatars/${q?.icon_second}`} alt="Character Icon" className="characterIcon" />
            )}

          </div>
          <div className="bubble">
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
              {!userShowJa && q.sentence_second_ja && (
                <span className="jaToggleBtn" onClick={() => setShowJaSecond(v => !v)}>
                  {showJaSecond ? "🔼" : "🔽"}
                </span>
              )}
            </div>

            {(userShowJa ? !!q.sentence_second_ja : showJaSecond) && (
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
            onMouseDown={() => handleChipPressStart(w)}
            onMouseUp={(e) => handleChipPressEnd(w, () => removeChip(w, i), e)}
            onTouchEnd={(e) => handleChipPressEnd(w, () => removeChip(w, i), e)}
            onMouseLeave={() => {
              if (longPressTimer.current) {
                clearTimeout(longPressTimer.current)
                longPressTimer.current = null
              }
            }}
            onTouchStart={() => handleChipPressStart(w)}
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
            onMouseDown={() => handleChipPressStart(c)}
            onMouseUp={(e) => handleChipPressEnd(c, () => addChip(c, i), e)}
            onTouchEnd={(e) => handleChipPressEnd(c, () => addChip(c, i), e)}
            onMouseLeave={() => {
              if (longPressTimer.current) {
                clearTimeout(longPressTimer.current)
                longPressTimer.current = null
              }
            }}
            onTouchStart={() => handleChipPressStart(c)}
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
      {/*     
      {longPressEntry && (
        <div style={{
          position: "fixed",
          bottom: "30%",
          left: "50%",
          transform: "translateX(-50%)",
          background: "rgba(0,0,0,0.85)",
          color: "white",
          padding: "12px 20px",
          borderRadius: "12px",
          fontSize: "18px",
          fontWeight: "bold",
          zIndex: 1000,
          pointerEvents: "none"
        }}>
          {longPressEntry.ja}
        </div>
      )}*/}
      <WordPopup entry={popupEntry} onClose={() => setPopupEntry(null)} />

    </div>
  
  )

}
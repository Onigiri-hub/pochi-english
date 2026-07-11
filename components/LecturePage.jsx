//import "../styles/lecture.css"
import { useState } from "react";
import { useRouter } from "next/router"
import { useDictionary } from "../utils/useDictionary"
import WordPopup from "./WordPopup"


export default function LecturePage({ pages }) {
  const [index, setIndex] = useState(0);
  const router = useRouter()
  const page = pages[index];
  const { lesson } = router.query
  const unit = lesson?.split("_")[0].replace("u","")
  const order = Number(lesson?.split("_")[1]?.replace("l",""))  // "l1" → 1
  const { tokenize } = useDictionary()
  const [popupEntry, setPopupEntry] = useState(null)

  function handleWordTap(entry) {
    if (entry.audio) {
      const audio = new Audio(`/audio/words/${entry.audio}`)
      audio.play().catch(e => console.log("再生失敗:", e))
    }
    setPopupEntry(entry)
  }
  
  function playKachi() {
    const audio = new Audio("/sound/kachi.mp3")
    audio.play().catch(() => {})
  }

  function next() {
    playKachi()
    if (index < pages.length - 1) {
      setIndex(index + 1);
    } else {
      router.replace(`/lessonComplete?unit=${unit}`)
    }
  }

  return (
  <div className="app">

    <div className="progressDots">
      {pages.map((_,i)=>(
        <div
          key={i}
          className={i===index ? "dot active" : "dot"}
        />
      ))}
    </div>

    <div className="imgArea">  
      <img
        src={`/images/lecture/${page.image_NO}.jpg`}
        style={{ width:"80%" }}
      />
    </div>

    <div className="text">
      {tokenize(page.text).map((token, i) =>
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
    </div>

    <WordPopup entry={popupEntry} onClose={() => setPopupEntry(null)} />

    {/*}
    <div className="text">
      {page.text}
    </div>
    */}
    
    <div className="bottomArea">

      <div className="bottomInner">

        <button
          className="navButton"
          onClick={() => { if (index > 0) { playKachi(); setIndex(index - 1) } }}
          style={{ visibility: index === 0 ? "hidden" : "visible" }}  // ★ disabledじゃなくvisibilityで
          data-sound
        >
          ←
        </button>

        {index === pages.length-1 ? (
          <button
            className="finishButton"
            onClick={()=>{ playKachi(); router.replace(`/lessonComplete?unit=${unit}&order=${order}`) }}
            data-sound
          >
            Finish
          </button>
        ) : (
          <button
            className="navButton"
            onClick={next}
            data-sound
          >
            →
          </button>
        )}

      </div>

    </div>

  </div>

  )  


}
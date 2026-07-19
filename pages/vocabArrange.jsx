import { saveVocabRoundProgress, getVocabRoundProgress, addVocabHistory } from "../utils/vocabProgressManager"
import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/router"
import Papa from "papaparse"
import { checkAnswer } from "../engines/PracticeEngine"
import { useProfileContext } from "../utils/ProfileContext"
import Navigation from "../components/Navigation"
import { useDictionary } from "../utils/useDictionary"
import WordPopup from "../components/WordPopup"

export default function VocabArrange() {
  const router = useRouter()
  const { section, round } = router.query
  const [questions, setQuestions] = useState([])
  const [index, setIndex] = useState(0)
  const [selected, setSelected] = useState([])
  const [chips, setChips] = useState([])
  const [result, setResult] = useState(null)
  const [userShowJa, setUserShowJa] = useState(true)
  const doneWordsRef = useRef(new Set())
  const isFirstClearRef = useRef(false)
  const pa = useRef(null)
  const seikaiRef = useRef(null)
  const { profile } = useProfileContext()
  const { tokenize, findEntry } = useDictionary()
  const [popupEntry, setPopupEntry] = useState(null)
  const longPressTimer = useRef(null)
  const chipLockRef = useRef(false)

  function handleChipPressStart(word) {
    longPressTimer.current = setTimeout(() => {
      const entry = findEntry(word)
      if (entry) {
        setPopupEntry(entry)
        if (entry.audio) {
          new Audio(`/audio/words/${entry.audio}`).play().catch(() => {})
        }
      }
      longPressTimer.current = null
    }, 400)
  }

  function handleChipPressEnd(word, action, e) {
    if (e) e.preventDefault()
    if (chipLockRef.current) return
    chipLockRef.current = true
    setTimeout(() => { chipLockRef.current = false }, 100)
    if (longPressTimer.current === null) {
      setPopupEntry(null)
      return
    }
    clearTimeout(longPressTimer.current)
    longPressTimer.current = null
    const chipSoundOn = localStorage.getItem("chipSoundOn") === "true"
    if (chipSoundOn) {
      const entry = findEntry(word)
      if (entry?.audio) {
        new Audio(`/audio/words/${entry.audio}`).play().catch(() => {})
      }
    }
    action()
  }

  function handleWordTap(entry) {
    if (entry.audio) {
      new Audio(`/audio/words/${entry.audio}`).play().catch(() => {})
    }
    setPopupEntry(entry)
  }

  useEffect(() => {
    setUserShowJa(localStorage.getItem("showJaTranslation") !== "false")
    pa.current = new Audio("/sound/pa.mp3")
    pa.current.volume = 0.3
    seikaiRef.current = new Audio("/sound/seikai.mp3")
    seikaiRef.current.playbackRate = 1.5
    seikaiRef.current.volume = 0.5
  }, [])

  useEffect(() => {
    if (!router.isReady) return

    async function load() {
      const secRes = await fetch("/data/vocab/arrangeSectionList.csv")
      const secText = await secRes.text()
      const secData = Papa.parse(secText, { header: true, skipEmptyLines: true }).data
      const sec = secData.find(s => s.section_id === section)
      if (!sec) return

      const wRes = await fetch(`/data/vocab/sentences/${sec.sentences_csv}`)
      const wText = await wRes.text()
      const wData = Papa.parse(wText, { header: true, skipEmptyLines: true }).data

      const filtered = wData.filter(q => q.round_id === round)
      if (filtered.length === 0) return
      setQuestions(filtered)

      const roundProgress = await getVocabRoundProgress(round)
      doneWordsRef.current = new Set(roundProgress.doneWords || [])

      const alreadyCleared = (roundProgress.doneWords?.length || 0) >= filtered.length
      isFirstClearRef.current = !alreadyCleared
    }
    load()
  }, [router.isReady])

  useEffect(() => {
    if (questions.length === 0) return
    const q = questions[index]
    setChips(shuffle(q.chips.split("|")))
    setSelected([])
    setResult(null)
  }, [index, questions])

  useEffect(() => {
    if (questions.length === 0) return
    const autoPlayOn = localStorage.getItem("autoPlayOn") !== "false"
    if (!autoPlayOn) return
    const q = questions[index]

    const timer = setTimeout(() => {
      if (q.audio_auto === "1" && q.audio_first) {
        new Audio(`/audio/arrange_words/${q.audio_first}`).play().catch(() => {})
      } else if (q.audio_auto === "2" && q.audio_second) {
        new Audio(`/audio/arrange_words/${q.audio_second}`).play().catch(() => {})
      }
    }, 500)

    return () => clearTimeout(timer)
  }, [index, questions])

  function shuffle(array) {
    const copy = [...array]
    for (let i = copy.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[copy[i], copy[j]] = [copy[j], copy[i]]
    }
    return copy
  }

  function playAudio(filename) {
    if (!filename) return
    new Audio(`/audio/arrange_words/${filename}`).play().catch(() => {})
  }

  function addChip(word, i) {
    if (!pa.current) return
    pa.current.currentTime = 0
    pa.current.play()
    setSelected(prev => [...prev, word])
    setChips(prev => { const c = [...prev]; c.splice(i, 1); return c })
  }

  function removeChip(word, i) {
    if (!pa.current) return
    pa.current.currentTime = 0
    pa.current.play()
    setSelected(prev => { const s = [...prev]; s.splice(i, 1); return s })
    setChips(prev => [...prev, word])
  }

  function check() {
    const q = questions[index]
    const answer = selected.join(" ")
    const ok = checkAnswer(answer, q.answer)
    if (ok) {
      const newDone = new Set([...doneWordsRef.current, q.question_id])
      doneWordsRef.current = newDone
      if (seikaiRef.current) {
        seikaiRef.current.currentTime = 0
        seikaiRef.current.play()
      }
      setResult("correct")
    } else {
      setResult("wrong")
    }
  }

  async function next() {
    if (index < questions.length - 1) {
      setIndex(i => i + 1)
    } else {
      await saveVocabRoundProgress(round, [...doneWordsRef.current], questions.length)
      await addVocabHistory(round, section)
      const stageId = section.split("_")[0]
      router.replace(`/vocabComplete?stage=${stageId}&section=${section}&round=${round}&isFirstClear=${isFirstClearRef.current}&mode=arrange`)
    }
  }

  if (questions.length === 0) return <div>loading...</div>

  const q = questions[index]
  const highlightWord = q.highlight_word?.trim().toLowerCase() || ""

  function isHighlighted(chip) {
    if (!highlightWord) return false
    const stripped = chip.toLowerCase().replace(/[.,!?'"]/g, "").trim()
    return stripped === highlightWord
  }

  function renderSentence(text) {
    if (!text || text.includes("____")) return text
    return tokenize(text).map((token, i) => {
      const highlighted = isHighlighted(token.text)
      const style = {
        ...(highlighted ? { color: "#02ccbb", fontWeight: "bold" } : {}),
        ...(token.entry ? { borderBottom: "2px solid #a9b8e7", cursor: "pointer" } : {})
      }
      return (
        <span
          key={i}
          style={Object.keys(style).length > 0 ? style : undefined}
          onClick={token.entry ? () => handleWordTap(token.entry) : undefined}
        >
          {token.text}
        </span>
      )
    })
  }

  function renderAvatar(iconName) {
    if (iconName === "user") {
      return (
        <div style={{ position: "relative", width: "60px", height: "60px" }}>
          <img src={`/images/avatars/${profile?.avatar || "01.png"}`} style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%" }} className="characterIcon" alt="" />
          {profile?.acc_eye && <img src={`/images/avatars/${profile.acc_eye}`} style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%" }} alt="" />}
          {profile?.acc_mouth && <img src={`/images/avatars/${profile.acc_mouth}`} style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%" }} alt="" />}
          {profile?.acc_head && <img src={`/images/avatars/${profile.acc_head}`} style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%" }} alt="" />}
        </div>
      )
    }
    return <img src={`/images/avatars/${iconName}`} alt="" className="characterIcon" />
  }

  return (
    <div className="app" style={{ paddingBottom: "180px" }}>
      <Navigation />

      <div className="progressDots">
        {questions.map((_, i) => (
          <div key={i} className={i === index ? "dot active" : "dot"} />
        ))}
      </div>

      {q.position_first !== "none" && (
        <div
          className={`chat ${q.position_first || "left"}`}
          style={{ opacity: q.bubble_gray === "1" ? 0.35 : 1 }}
        >
          <div className="iconContainer">
            {renderAvatar(q.icon_first)}
          </div>
          <div className="bubble">
            <div className="en">
              {q.audio_first && (
                <span className="audioBtn" onClick={() => playAudio(q.audio_first)}>🔊</span>
              )}
              {renderSentence(q.sentence_first_en)}
            </div>
            {userShowJa && q.sentence_first_ja && (
              <div className="ja">{q.sentence_first_ja}</div>
            )}
          </div>
        </div>
      )}

      {q.position_second !== "none" && (
        <div
          className={`chat ${q.position_second || "right"}`}
          style={{ opacity: q.bubble_gray === "2" ? 0.35 : 1 }}
        >
          <div className="iconContainer">
            {renderAvatar(q.icon_second)}
          </div>
          <div className="bubble">
            <div className="en">
              {q.audio_second && (
                <span className="audioBtn" onClick={() => playAudio(q.audio_second)}>🔊</span>
              )}
              {renderSentence(q.sentence_second_en)}
            </div>
            {userShowJa && q.sentence_second_ja && (
              <div className="ja">{q.sentence_second_ja}</div>
            )}
          </div>
        </div>
      )}

      <div className="chipBox">
        {selected.map((w, i) => (
          <button
            key={i}
            className="chip"
            style={isHighlighted(w) ? { background: "#02ccbb", color: "white" } : {}}
            onMouseDown={() => handleChipPressStart(w)}
            onMouseUp={(e) => handleChipPressEnd(w, () => removeChip(w, i), e)}
            onMouseLeave={() => { if (longPressTimer.current) { clearTimeout(longPressTimer.current); longPressTimer.current = null } }}
            onTouchStart={() => handleChipPressStart(w)}
            onTouchEnd={(e) => handleChipPressEnd(w, () => removeChip(w, i), e)}
          >
            {w}
          </button>
        ))}
      </div>

      <div>
        {chips.map((c, i) => (
          <button
            key={i}
            className="chip"
            style={isHighlighted(c) ? { background: "#02ccbb", color: "white" } : {}}
            onMouseDown={() => handleChipPressStart(c)}
            onMouseUp={(e) => handleChipPressEnd(c, () => addChip(c, i), e)}
            onMouseLeave={() => { if (longPressTimer.current) { clearTimeout(longPressTimer.current); longPressTimer.current = null } }}
            onTouchStart={() => handleChipPressStart(c)}
            onTouchEnd={(e) => handleChipPressEnd(c, () => addChip(c, i), e)}
          >
            {c}
          </button>
        ))}
      </div>

      <div className={`bottomArea ${result || ""}`}>
        {result === "correct" && <div className="resultText">Perfect！</div>}
        {result === "wrong" && <div className="resultText">惜しい！</div>}
        <button
          className="mainButton"
          onClick={
            result === "correct" ? next
            : result === "wrong" ? () => setResult(null)
            : check
          }
        >
          {result === "correct" ? "Next" : result === "wrong" ? "Try again" : "Check"}
        </button>
      </div>

      <WordPopup entry={popupEntry} onClose={() => setPopupEntry(null)} />
    </div>
  )
}

import { saveVocabRoundProgress, getVocabRoundProgress, addVocabHistory } from "../utils/vocabProgressManager"
import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/router"
import Papa from "papaparse"
import { checkAnswer } from "../engines/PracticeEngine"
import { useProfileContext } from "../utils/ProfileContext"

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

  useEffect(() => {
    setUserShowJa(localStorage.getItem("showJaTranslation") !== "false")
    pa.current = new Audio("/sound/pi.mp3")
    seikaiRef.current = new Audio("/sound/seikai.mp3")
    seikaiRef.current.playbackRate = 1.5
    seikaiRef.current.volume = 0.7
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

    let audio2 = null
    const timer = setTimeout(() => {
      if (q.audio_auto === "1" && q.audio_first) {
        const audio1 = new Audio(`/audio/arrange_words/${q.audio_first}`)
        audio1.play().catch(() => {})
        if (q.audio_second) {
          audio1.addEventListener("ended", () => {
            setTimeout(() => {
              audio2 = new Audio(`/audio/arrange_words/${q.audio_second}`)
              audio2.play().catch(() => {})
            }, 100)
          })
        }
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
    if (!text || !highlightWord || text.includes("____")) return text
    const escaped = highlightWord.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
    const regex = new RegExp(`\\b(${escaped})\\b`, "gi")
    const parts = text.split(regex)
    if (parts.length === 1) return text
    return parts.map((part, i) =>
      part.toLowerCase() === highlightWord
        ? <span key={i} style={{ color: "#02ccbb", fontWeight: "bold" }}>{part}</span>
        : <span key={i}>{part}</span>
    )
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
            onClick={() => removeChip(w, i)}
            style={isHighlighted(w) ? { background: "#02ccbb", color: "white" } : {}}
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
            onClick={() => addChip(c, i)}
            style={isHighlighted(c) ? { background: "#02ccbb", color: "white" } : {}}
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

    </div>
  )
}

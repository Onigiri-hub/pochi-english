import { useEffect, useState, useRef } from "react"
import { useRouter } from "next/router"
import Papa from "papaparse"

export default function FourChoices() {
  const router = useRouter()
  const { section, round, stage } = router.query

  const [words, setWords] = useState([])
  const [allWords, setAllWords] = useState([])
  const [current, setCurrent] = useState(0)
  const [choices, setChoices] = useState([])
  const [eliminated, setEliminated] = useState([]) // グレーアウトした不正解リスト
  const [correct, setCorrect] = useState(false)     // 正解したかどうか
  const [slideState, setSlideState] = useState("idle") // "idle" | "out" | "in"
  const [timeLeft, setTimeLeft] = useState(45)
  const [doneWords, setDoneWords] = useState(new Set()) // 一撃正解した単語ID
  const [roundInfo, setRoundInfo] = useState(null)
  const timerRef = useRef(null)
  const doneWordsRef = useRef(new Set())
  const [masteryMap, setMasteryMap] = useState({}) // word_idごとの習熟度
  const masteryMapRef = useRef({}) // タイマー用

  useEffect(() => {
    if (!router.isReady) return

    async function load() {
      const secRes = await fetch("/data/vocab/sectionList.csv")
      const secText = await secRes.text()
      const secData = Papa.parse(secText, {
        header: true,
        skipEmptyLines: true
      }).data
      const sectionInfo = secData.find(s => s.section_id === section)
      if (!sectionInfo) return

      const rRes = await fetch(`/data/vocab/rounds/${sectionInfo.rounds_csv}`)
      const rText = await rRes.text()
      const rData = Papa.parse(rText, {
        header: true,
        skipEmptyLines: true
      }).data
      const currentRound = rData.find(r => r.round_id === round)
      setRoundInfo(currentRound)

      const wRes = await fetch(`/data/vocab/words/${sectionInfo.words_csv}`)
      const wText = await wRes.text()
      const wData = Papa.parse(wText, {
        header: true,
        skipEmptyLines: true
      }).data
      setAllWords(wData)

              //const from = currentRound.word_from
              //const to = currentRound.word_to
              //const filtered = wData.filter(w =>
              //  w.word_id >= from && w.word_id <= to
              //)

              //const shuffled = shuffle(filtered).slice(0, 20)
              //setWords(shuffled)
     
      const from = currentRound.word_from
      const to = currentRound.word_to
      const filtered = wData.filter(w =>
        w.word_id >= from && w.word_id <= to
      )

      let selectedWords
      if (currentRound.is_review === "1") {
        // reviewRound：習熟度が低い順にピックアップ
        const masteryKey = `vocab_mastery_${section}`
        const masteryData = JSON.parse(localStorage.getItem(masteryKey) || '{}')

        const sorted = filtered.sort((a, b) => {
          const easeA = masteryData[a.word_id]?.ease ?? 0
          const easeB = masteryData[b.word_id]?.ease ?? 0
          if (easeA !== easeB) return easeA - easeB // ease低い順

          // 同率なら最終学習日が古い順（なければ一番古い扱い）
          const dateA = masteryData[a.word_id]?.lastStudied ?? "0"
          const dateB = masteryData[b.word_id]?.lastStudied ?? "0"
          return dateA.localeCompare(dateB)
        })
        selectedWords = sorted.slice(0, 20)
      } else {
        // 通常Round：シャッフルして20単語
        selectedWords = shuffle(filtered).slice(0, 20)
      }

      setWords(selectedWords)

      // localStorageから前回の「できた」を読み込む
      const key = `vocab_round_${round}`
      const existing = JSON.parse(localStorage.getItem(key) || '{"doneWords":[]}')
      setDoneWords(new Set(existing.doneWords))

      // localStorageから習熟度を読み込む
      const masteryKey = `vocab_mastery_${section}`
      const existingMastery = JSON.parse(localStorage.getItem(masteryKey) || '{}')
      masteryMapRef.current = existingMastery
      setMasteryMap(existingMastery)
    }
    load()
  }, [router.isReady])

  useEffect(() => {
    if (words.length === 0) return
    setChoices(makeChoices(words[current], allWords))
    setEliminated([])
    setCorrect(false)
  }, [current, words])

  useEffect(() => {
    if (words.length === 0) return
    timerRef.current = setInterval(() => {
      setTimeLeft(t => {
        if (t <= 1) {
          clearInterval(timerRef.current)
          saveRoundProgress(roundInfo?.is_review === "1")
          saveMastery() // ← 追加
          router.push(`/vocabComplete?stage=${section.split("_")[0]}&section=${section}`)

          return 0
        }
        return t - 1
      })
    }, 1000)
    return () => clearInterval(timerRef.current)
  }, [words])

  function shuffle(array) {
    const copy = [...array]
    for (let i = copy.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      const temp = copy[i]
      copy[i] = copy[j]
      copy[j] = temp
    }
    return copy
  }

  function makeChoices(correctWord, pool) {
    const others = pool.filter(w => w.word_id !== correctWord.word_id)
    const dummies = shuffle(others).slice(0, 3)
    return shuffle([correctWord, ...dummies])
  }

  function saveRoundProgress(isReview) {
    const key = `vocab_round_${round}`
    const existing = JSON.parse(localStorage.getItem(key) || '{"doneWords":[]}')
    const merged = new Set([...existing.doneWords, ...doneWordsRef.current])
    
    localStorage.setItem(key, JSON.stringify({
      doneWords: [...merged],
      totalWords: isReview ? words.length : 20
    }))
  }

  function updateMastery(wordId, isCorrect) {
    const current = masteryMapRef.current[wordId] || {
      correct: 0, wrong: 0, streak: 0, ease: 0, lastResult: null, mastery: "①未学習"
    }

            //let updated
            //if (isCorrect) {
            //  updated = {
            //    ...current,
            //    correct: current.correct + 1,
            //    streak: current.streak + 1,
            //    ease: Math.min(10, current.ease + 1),
            //    lastResult: true,
            //  }
            //} else {
            //  updated = {
            //    ...current,
            //    wrong: current.wrong + 1,
            //    streak: 0,
            //    ease: Math.max(0, current.ease - 2),
            //    lastResult: false,
            //  }
            //}

    const updated = isCorrect ? {
      ...current,
      correct: current.correct + 1,
      streak: current.streak + 1,
      ease: Math.min(10, current.ease + 1),
      lastResult: true,
      lastStudied: new Date().toISOString(),
    } : {
      ...current,
      wrong: current.wrong + 1,
      streak: 0,
      ease: Math.max(0, current.ease - 2),
      lastResult: false,
      lastStudied: new Date().toISOString(),
    }


    // mastery判定
    if (updated.ease >= 3 && updated.streak >= 2) {
      updated.mastery = "③定着済"
    } else if (updated.correct > 0 || updated.wrong > 0) {
      updated.mastery = "②学習中"
    } else {
      updated.mastery = "①未学習"
    }

    const newMap = { ...masteryMapRef.current, [wordId]: updated }
    masteryMapRef.current = newMap
    setMasteryMap(newMap)
  }

  function handleSelect(choice) {
    const isCorrect = choice.word_id === currentWord.word_id

    if (isCorrect) {
      if (eliminated.length === 0) {
        const newDone = new Set([...doneWordsRef.current, currentWord.word_id])
        doneWordsRef.current = newDone
        setDoneWords(newDone)
      }
      updateMastery(currentWord.word_id, true) // ← 追加
      setCorrect(true)
      setTimeout(() => {
        setSlideState("out")
        setTimeout(() => {
          if (current < words.length - 1) {
            setCurrent(c => c + 1)
          } else {
            saveRoundProgress(roundInfo?.is_review === "1")
            saveMastery() // ← 追加
            setWords(prev => shuffle([...prev]))
            setCurrent(0)
          }
          setSlideState("in")
          setTimeout(() => {
            setSlideState("idle")
          }, 50)
        }, 100)
      }, 200)
    } else {
      updateMastery(currentWord.word_id, false) // ← 追加
      setEliminated(prev => [...prev, choice.word_id])
    }
  }

  function saveMastery() {
    const masteryKey = `vocab_mastery_${section}`
    localStorage.setItem(masteryKey, JSON.stringify(masteryMapRef.current))
  }

  const slideStyle = {
    transition: slideState === "idle" ? "transform 0.4s ease, opacity 0.4s ease" : 
                slideState === "out" ? "transform 0.4s ease, opacity 0.4s ease" : "none",
    transform: slideState === "out" ? "translateX(-120%)" :
               slideState === "in" ? "translateX(120%)" : "translateX(0)",
    opacity: slideState === "out" ? 0 : 1,
  }

  if (words.length === 0) return <div>loading...</div>

  const currentWord = words[current]
  const timePercent = (timeLeft / 45) * 100

  return (
    <div style={{
      maxWidth: "400px",
      margin: "auto",
      padding: "20px",
      minHeight: "100vh",
      background: "#ebebeb"
    }}>

      {/* 時間制限バー */}
      <div style={{
        display: "flex",
        alignItems: "center",
        gap: "10px",
        marginBottom: "20px"
      }}>
        <div style={{
          flexGrow: 1,
          height: "10px",
          background: "#ddd",
          borderRadius: "5px",
          overflow: "hidden"
        }}>
          <div style={{
            width: `${timePercent}%`,
            height: "100%",
            background: timeLeft <= 10 ? "#ff4444" : "#58cc02",
            borderRadius: "5px",
            transition: "width 1s linear"
          }} />
        </div>
        <div style={{ fontSize: "16px", fontWeight: "bold", minWidth: "30px" }}>
          {timeLeft}
        </div>
      </div>

      {/* ポチアニメーション（仮）← スライドの外に出す */}
      <div style={{ display: "flex", justifyContent: "center", marginBottom: "30px" }}>
        <video
          src="/animations/wan.mp4"
          autoPlay
          muted
          loop
          playsInline
          style={{ width: "120px" }}
        />
      </div>

      {/* 単語と4択だけスライド */}
      <div style={{ overflow: "hidden" }}>
        <div style={slideStyle}>

          {/* 英単語 or 日本語（mode_typeで切り替え） */}
          <div style={{
            textAlign: "center",
            fontSize: "36px",
            fontWeight: "bold",
            margin: "30px 0"
          }}>
            {roundInfo?.mode_type === "fourChoices_ja2en"
              ? currentWord.ja      // 日本語を表示
              : currentWord.word    // 英語を表示
            }
          </div>

          {/* デバッグ用（確認したら消す） */}
          <div style={{ fontSize: "12px", color: "#999", textAlign: "center" }}>
            できた: {[...doneWords].join(", ") || "なし"}<br/>
            ease: {masteryMap[currentWord?.word_id]?.ease ?? 0} / 
            streak: {masteryMap[currentWord?.word_id]?.streak ?? 0} / 
            mastery: {masteryMap[currentWord?.word_id]?.mastery ?? "①未学習"}
          </div>

          {/* 4択ボタン */}
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            {choices.map((choice, i) => {
              const isCorrect = choice.word_id === currentWord.word_id
              const isEliminated = eliminated.includes(choice.word_id)

              let bgColor = "white"
              let textColor = "#333333"
              if (correct && isCorrect) {
                bgColor = "#02ccbb"
                textColor = "white"
              } else if (isEliminated) {
                bgColor = "#bdbdbd"
                textColor = "#333333"
              }

              return (
                <button
                  key={i}
                  onClick={() => {
                    if (isEliminated || correct) return
                    handleSelect(choice)
                  }}
                  style={{
                    padding: "16px",
                    borderRadius: "12px",
                    border: "2px solid #ddd",
                    background: bgColor,
                    color: textColor,
                    fontSize: "18px",
                    cursor: (isEliminated || correct) ? "default" : "pointer",
                    transition: "background 0.2s"
                  }}
                >

                  {roundInfo?.mode_type === "fourChoices_ja2en"
                    ? choice.word   // 英語を選択肢に
                    : choice.ja     // 日本語を選択肢に
                  }


                </button>
              )
            })}
          </div>

        </div>
      </div>

    </div>
  )
}
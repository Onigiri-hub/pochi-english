const fs = require('fs')
const path = require('path')

function parseCSVLine(line) {
  const result = []
  let current = ''
  let inQuotes = false
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') { current += '"'; i++ }
      else inQuotes = !inQuotes
    } else if (ch === ',' && !inQuotes) {
      result.push(current); current = ''
    } else {
      current += ch
    }
  }
  result.push(current)
  return result
}

function parseCSV(content) {
  const lines = content.replace(/\r\n/g, '\n').replace(/\r/g, '\n').trim().split('\n')
  const headers = parseCSVLine(lines[0])
  return lines.slice(1).filter(l => l.trim()).map(line => {
    const values = parseCSVLine(line)
    const obj = {}
    headers.forEach((h, i) => { obj[h.trim()] = (values[i] ?? '').trim() })
    return obj
  })
}

function csvField(value) {
  const s = String(value ?? '')
  if (s.includes(',') || s.includes('"') || s.includes('\n')) {
    return '"' + s.replace(/"/g, '""') + '"'
  }
  return s
}

function toCsvRow(fields) {
  return fields.map(csvField).join(',')
}

function generateChips(sentence) {
  return sentence.trim().split(/\s+/).join('|')
}

const DIALOGUES_PER_SECTION = 60
const DIALOGUES_PER_ROUND = 5

const rootDir = path.join(__dirname, '..')
const sourceFile = path.join(rootDir, 'public/data/vocab/sentences/並べて英単語リストstage1.csv')
const sentencesDir = path.join(rootDir, 'public/data/vocab/sentences')
const roundsDir = path.join(rootDir, 'public/data/vocab/arrange_rounds')

const sourceContent = fs.readFileSync(sourceFile, 'utf-8')
const sourceData = parseCSV(sourceContent)
const totalSections = Math.ceil(sourceData.length / DIALOGUES_PER_SECTION)

const sectionListRows = ['section_id,stage_id,section_no,section_name,sentences_csv,arrange_rounds_csv']

for (let secIdx = 0; secIdx < totalSections; secIdx++) {
  const secNo = secIdx + 1
  const secId = `ast1_sec${secNo}`
  const dialogues = sourceData.slice(secIdx * DIALOGUES_PER_SECTION, (secIdx + 1) * DIALOGUES_PER_SECTION)
  const totalRounds = Math.ceil(dialogues.length / DIALOGUES_PER_ROUND)

  const sentencesCsvName = `sentences_st1_sec${secNo}.csv`
  const roundsCsvName = `arrange_rounds_st1_sec${secNo}.csv`

  sectionListRows.push(toCsvRow([secId, 'ast1', secNo, `Section${secNo}`, sentencesCsvName, roundsCsvName]))

  // sentences CSV
  const sentenceHeaders = [
    'question_id', 'question_no', 'round_id', 'lesson_id',
    'sentence1_origin', 'sentence2_origin', 'sentence_first_ja', 'sentence_second_ja',
    'highlight_word', 'bubble_gray', 'chip_input', 'audio1_input', 'audio2_input',
    'voice1', 'voice2', 'audio_auto', 'icon_first', 'icon_second',
    'position_first', 'position_second', 'sentence_first_en', 'sentence_second_en',
    'answer', 'chips', 'audio_first', 'audio_second'
  ]
  const sentenceRows = [sentenceHeaders.join(',')]
  let questionNo = 1

  for (let dIdx = 0; dIdx < dialogues.length; dIdx++) {
    const d = dialogues[dIdx]
    const roundNo = Math.floor(dIdx / DIALOGUES_PER_ROUND) + 1
    const roundId = `${secId}_r${String(roundNo).padStart(2, '0')}`
    const lessonNo = dIdx + 1
    const audioInput = `1-${secNo}-${lessonNo}`
    const audioFirst = `1-${secNo}-${lessonNo}-a.mp3`
    const audioSecond = `1-${secNo}-${lessonNo}-b.mp3`

    // Row A: Ivyのセリフ (en1) を並べる
    // Ivy (voice1) = right (icon_first=user, position_first=right)
    // Ruth (voice2) = left  (icon_second=05.png, position_second=left)
    sentenceRows.push(toCsvRow([
      `st1_sec${secNo}_${d.example_id}a`, questionNo++, roundId, '',
      d.en1, d.en2, d.ja1, d.ja2, d.word,
      '2',      // bubble_gray=2 → Ruthのバブルを薄く
      d.en1,    // chip_input
      audioInput, audioInput, 'Ivy', 'Ruth',
      '1',      // audio_auto=1 → Ivyのセリフを自動再生
      'user', '05.png', 'right', 'left',
      '____________', '____________',
      d.en1, generateChips(d.en1), audioFirst, audioSecond
    ]))

    // Row B: Ruthのセリフ (en2) を並べる（Ivyのセリフがコンテキストとして薄く表示）
    sentenceRows.push(toCsvRow([
      `st1_sec${secNo}_${d.example_id}b`, questionNo++, roundId, '',
      d.en1, d.en2, d.ja1, d.ja2, d.word,
      '1',      // bubble_gray=1 → Ivyのバブルを薄く
      d.en2,    // chip_input
      audioInput, audioInput, 'Ivy', 'Ruth',
      '2',      // audio_auto=2 → Ruthのセリフを自動再生
      'user', '05.png', 'right', 'left',
      d.en1, '____________',   // Ivyのセリフをコンテキスト表示
      d.en2, generateChips(d.en2), audioFirst, audioSecond
    ]))
  }

  fs.writeFileSync(path.join(sentencesDir, sentencesCsvName), sentenceRows.join('\n') + '\n', 'utf-8')

  // rounds CSV
  const roundRows = ['section_id,round_id,round_no,question_count,is_review']
  for (let r = 0; r < totalRounds; r++) {
    const rNo = r + 1
    const rId = `${secId}_r${String(rNo).padStart(2, '0')}`
    const dlgCount = Math.min(DIALOGUES_PER_ROUND, dialogues.length - r * DIALOGUES_PER_ROUND)
    roundRows.push(toCsvRow([secId, rId, rNo, dlgCount * 2, 0]))
  }

  fs.writeFileSync(path.join(roundsDir, roundsCsvName), roundRows.join('\n') + '\n', 'utf-8')

  console.log(`Section ${secNo}: ${dialogues.length}件 → ${totalRounds}ラウンド (${sentencesCsvName})`)
}

fs.writeFileSync(
  path.join(rootDir, 'public/data/vocab/arrangeSectionList.csv'),
  sectionListRows.join('\n') + '\n',
  'utf-8'
)

console.log(`\n完了: ${totalSections}セクション生成`)
console.log('arrangeSectionList.csv 更新済み')

import type { CharacterCard } from '@/domain/types'

export interface RecognitionResult { transcript: string; confidence: number }
export interface Assessment { status: 'correct' | 'incorrect' | 'manual'; reason: string; transcript: string }

export function normalizeRecognition(value: string): string {
  return value.normalize('NFD').replace(/\p{Diacritic}/gu, '').replace(/ü/g, 'v').replace(/[^\p{Letter}\p{Script=Han}]/gu, '').toLowerCase()
}

export function isFlipCommand(value: string): boolean {
  return normalizeRecognition(value) === '翻'
}

export function assessPronunciation(result: RecognitionResult, card: CharacterCard, threshold = .55): Assessment {
  const normalized = normalizeRecognition(result.transcript)
  if (!normalized) return { status: 'manual', reason: '没有识别到内容，请手动判断。', transcript: result.transcript }
  if (result.confidence < threshold) return { status: 'manual', reason: '识别置信度较低，请手动判断。', transcript: result.transcript }
  const accepted = new Set([
    normalizeRecognition(card.character),
    ...card.readings.flatMap((reading) => [reading.pinyin, ...reading.acceptedForms]).map(normalizeRecognition),
  ])
  return accepted.has(normalized)
    ? { status: 'correct', reason: '识别结果与字卡读音相符。', transcript: result.transcript }
    : { status: 'incorrect', reason: '识别结果与字卡内容不符，可手动更正。', transcript: result.transcript }
}

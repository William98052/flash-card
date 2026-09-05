import type { CharacterCard } from '@/domain/types'

export interface RecognitionResult { transcript: string; confidence: number; alternatives?: string[] }
export interface Assessment { status: 'correct' | 'incorrect' | 'manual'; reason: string; transcript: string }

/** Character → the toneless readings it can be pronounced with. */
export type HomophoneIndex = Map<string, Set<string>>

export function normalizeRecognition(value: string): string {
  return value.normalize('NFD').replace(/\p{Diacritic}/gu, '').replace(/ü/g, 'v').replace(/[^\p{Letter}\p{Script=Han}]/gu, '').toLowerCase()
}

export function isFlipCommand(value: string): boolean {
  return normalizeRecognition(value) === '翻'
}

/**
 * Recognizing a lone syllable is the hardest case for general speech
 * recognition: there is no surrounding context, so saying 行 correctly comes
 * back just as readily as 型, 形 or 醒. Every one of those is the right
 * pronunciation, so match on the reading rather than on the exact character.
 */
export function buildHomophoneIndex(cards: Pick<CharacterCard, 'character' | 'readings'>[]): HomophoneIndex {
  const index: HomophoneIndex = new Map()
  for (const card of cards) {
    const readings = new Set(card.readings.map((reading) => normalizeRecognition(reading.pinyin)).filter(Boolean))
    if (!readings.size) continue
    const existing = index.get(card.character)
    if (existing) for (const reading of readings) existing.add(reading)
    else index.set(card.character, readings)
  }
  return index
}

function editDistance(a: string, b: string): number {
  if (a === b) return 0
  const previous = Array.from({ length: b.length + 1 }, (_, i) => i)
  for (let i = 1; i <= a.length; i += 1) {
    let diagonal = previous[0]
    previous[0] = i
    for (let j = 1; j <= b.length; j += 1) {
      const candidate = Math.min(previous[j] + 1, previous[j - 1] + 1, diagonal + (a[i - 1] === b[j - 1] ? 0 : 1))
      diagonal = previous[j]
      previous[j] = candidate
    }
  }
  return previous[b.length]
}

export function assessPronunciation(
  result: RecognitionResult,
  card: Pick<CharacterCard, 'character' | 'readings'>,
  options: { index?: HomophoneIndex; threshold?: number } = {},
): Assessment {
  const { index, threshold = .55 } = options
  const candidates = [result.transcript, ...(result.alternatives ?? [])].filter(Boolean)
  if (!candidates.some((value) => normalizeRecognition(value))) {
    return { status: 'manual', reason: 'Nothing was recognized. Please judge manually.', transcript: result.transcript }
  }

  const expectedReadings = new Set(card.readings.flatMap((reading) => [reading.pinyin, ...(reading.acceptedForms ?? [])]).map(normalizeRecognition).filter(Boolean))
  const expectedExact = new Set([normalizeRecognition(card.character), ...expectedReadings])

  for (const candidate of candidates) {
    const normalized = normalizeRecognition(candidate)
    if (!normalized) continue
    if (expectedExact.has(normalized)) {
      return { status: 'correct', reason: 'That matches this card’s reading.', transcript: result.transcript }
    }
    // A homophone the recognizer picked instead of this card's character.
    for (const character of candidate.match(/\p{Script=Han}/gu) ?? []) {
      for (const reading of index?.get(character) ?? []) {
        if (expectedReadings.has(reading)) {
          return { status: 'correct', reason: `Heard ${character}, which is pronounced the same way.`, transcript: result.transcript }
        }
      }
    }
    // A near miss in a romanized transcript, e.g. a dropped final letter.
    if (/^[a-z]+$/.test(normalized) && normalized.length >= 4) {
      for (const reading of expectedReadings) {
        if (reading.length >= 4 && editDistance(normalized, reading) <= 1) {
          return { status: 'correct', reason: 'That is close enough to this card’s reading.', transcript: result.transcript }
        }
      }
    }
  }

  // Nothing matched. Confidence is only used to decide between "wrong" and
  // "ask the learner" - never to reject a reading that did match, because the
  // score is unreliable (ambient noise has scored 0.89).
  return result.confidence < threshold
    ? { status: 'manual', reason: 'That did not match, and the recognition was uncertain. Please judge manually.', transcript: result.transcript }
    : { status: 'incorrect', reason: 'That does not match this card’s reading; you can correct it manually.', transcript: result.transcript }
}

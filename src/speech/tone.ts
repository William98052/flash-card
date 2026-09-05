export type Tone = 0 | 1 | 2 | 3 | 4

const TONE_MARKS: Record<string, Tone> = {
  '̄': 1, // macron    ā
  '́': 2, // acute     á
  '̌': 3, // caron     ǎ
  '̀': 4, // grave     à
}

/** The card already states the tone: it is the mark over the vowel. */
export function expectedToneFromPinyin(pinyin: string): Tone {
  for (const character of pinyin.normalize('NFD')) {
    const tone = TONE_MARKS[character]
    if (tone) return tone
  }
  return 0
}

const MIN_HZ = 70
const MAX_HZ = 400

/**
 * Autocorrelation pitch detection. Speech is periodic while voiced, so the lag
 * that best matches the signal against itself is the pitch period.
 */
export function detectPitchHz(frame: Float32Array, sampleRate: number): number {
  let energy = 0
  for (const sample of frame) energy += sample * sample
  const rms = Math.sqrt(energy / frame.length)
  if (rms < 0.01) return 0 // silence or breath, not a voiced sound

  const minLag = Math.floor(sampleRate / MAX_HZ)
  const maxLag = Math.min(Math.floor(sampleRate / MIN_HZ), frame.length - 1)
  let bestLag = -1
  let bestScore = 0
  for (let lag = minLag; lag <= maxLag; lag += 1) {
    let correlation = 0
    let selfEnergy = 0
    for (let i = 0; i < frame.length - lag; i += 1) {
      correlation += frame[i] * frame[i + lag]
      selfEnergy += frame[i + lag] * frame[i + lag]
    }
    const score = selfEnergy > 0 ? correlation / Math.sqrt(selfEnergy) : 0
    if (score > bestScore) { bestScore = score; bestLag = lag }
  }
  if (bestLag < 0) return 0
  const normalized = bestScore / Math.sqrt(frame.length)
  return normalized < 0.3 ? 0 : sampleRate / bestLag
}

/** Pitch across the whole recording: one reading per 10 ms step. */
export function extractContour(samples: Float32Array, sampleRate: number): number[] {
  const frameSize = Math.floor(sampleRate * 0.04)
  const hop = Math.floor(sampleRate * 0.01)
  const contour: number[] = []
  for (let start = 0; start + frameSize <= samples.length; start += hop) {
    contour.push(detectPitchHz(samples.subarray(start, start + frameSize), sampleRate))
  }
  return contour
}

const mean = (values: number[]) => values.reduce((total, value) => total + value, 0) / values.length

/**
 * Tone lives in the SHAPE of the pitch curve, not its height, so the curve is
 * measured in semitones relative to its own median. That makes a low voice and
 * a high voice score the same for the same tone.
 */
export function classifyTone(contourHz: number[]): { tone: Tone; confidence: number } {
  const voiced = contourHz.filter((hz) => hz >= MIN_HZ && hz <= MAX_HZ)
  if (voiced.length < 5) return { tone: 0, confidence: 0 }

  const sorted = [...voiced].sort((a, b) => a - b)
  const median = sorted[Math.floor(sorted.length / 2)]
  const semitones = voiced.map((hz) => 12 * Math.log2(hz / median))

  const window = Math.max(1, Math.ceil(semitones.length * 0.25))
  const head = mean(semitones.slice(0, window))
  const tail = mean(semitones.slice(-window))
  const slope = tail - head

  let lowest = Infinity
  let lowestIndex = 0
  semitones.forEach((value, index) => { if (value < lowest) { lowest = value; lowestIndex = index } })
  const dips = lowestIndex > semitones.length * 0.15
    && lowestIndex < semitones.length * 0.8
    && head - lowest > 0.8
    && tail - lowest > 1.5

  if (dips) return { tone: 3, confidence: Math.min(1, (tail - lowest) / 4) }
  if (slope > 1.5) return { tone: 2, confidence: Math.min(1, slope / 6) }
  if (slope < -1.5) return { tone: 4, confidence: Math.min(1, -slope / 6) }
  return { tone: 1, confidence: Math.min(1, 1 - Math.abs(slope) / 1.5) }
}

export interface ToneAssessment { status: 'match' | 'mismatch' | 'unclear'; heard: Tone; message: string }

const TONE_NAMES: Record<Tone, string> = {
  0: 'neutral',
  1: 'flat (1st)',
  2: 'rising (2nd)',
  3: 'dipping (3rd)',
  4: 'falling (4th)',
}

export function assessTone(contourHz: number[], expected: Tone): ToneAssessment {
  if (expected === 0) {
    return { status: 'unclear', heard: 0, message: 'This card has no marked tone, so there is nothing to check.' }
  }
  const { tone, confidence } = classifyTone(contourHz)
  if (!tone || confidence < 0.2) {
    return { status: 'unclear', heard: tone, message: 'Not enough voiced sound to read the tone. Try again, a little louder and longer.' }
  }
  return tone === expected
    ? { status: 'match', heard: tone, message: `Your tone sounded ${TONE_NAMES[tone]}, which is right.` }
    : { status: 'mismatch', heard: tone, message: `Your tone sounded ${TONE_NAMES[tone]}, but this card is ${TONE_NAMES[expected]}.` }
}

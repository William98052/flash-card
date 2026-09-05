import { describe, expect, it } from 'vitest'
import { assessTone, classifyTone, detectPitchHz, expectedToneFromPinyin, extractContour } from './tone'

const ramp = (from: number, to: number, count = 30) =>
  Array.from({ length: count }, (_, i) => from + ((to - from) * i) / (count - 1))

describe('reading the expected tone off the card', () => {
  it('reads the tone from the pinyin mark', () => {
    expect(expectedToneFromPinyin('xīng')).toBe(1)
    expect(expectedToneFromPinyin('xíng')).toBe(2)
    expect(expectedToneFromPinyin('xǐng')).toBe(3)
    expect(expectedToneFromPinyin('xìng')).toBe(4)
    expect(expectedToneFromPinyin('ma')).toBe(0)
    expect(expectedToneFromPinyin('lǜ')).toBe(4)
  })
})

describe('hearing the tone in a pitch curve', () => {
  it('classifies the four tones by the shape of the curve', () => {
    expect(classifyTone(ramp(200, 202)).tone).toBe(1)          // flat
    expect(classifyTone(ramp(150, 260)).tone).toBe(2)          // rising
    expect(classifyTone(ramp(260, 150)).tone).toBe(4)          // falling
    expect(classifyTone([...ramp(200, 140, 15), ...ramp(140, 235, 15)]).tone).toBe(3)  // dip then rise
  })

  it('judges the shape, not the speaker - a low and a high voice both rise for tone 2', () => {
    expect(classifyTone(ramp(90, 150)).tone).toBe(2)
    expect(classifyTone(ramp(220, 370)).tone).toBe(2)
  })

  it('reports nothing usable when too little of the sound was voiced', () => {
    expect(classifyTone([0, 0, 190, 0]).tone).toBe(0)
    expect(classifyTone([]).confidence).toBe(0)
  })
})

describe('scoring the attempt', () => {
  it('matches, mismatches, or asks for a human call', () => {
    expect(assessTone(ramp(150, 260), 2).status).toBe('match')
    expect(assessTone(ramp(260, 150), 2).status).toBe('mismatch')
    expect(assessTone([0, 0, 0], 2).status).toBe('unclear')
  })

  it('never claims a verdict for a neutral-tone card', () => {
    expect(assessTone(ramp(150, 260), 0).status).toBe('unclear')
  })
})

describe('finding pitch in real audio', () => {
  it('measures the frequency of a tone within a few Hz', () => {
    const sampleRate = 16000
    const frame = new Float32Array(2048)
    for (let i = 0; i < frame.length; i += 1) frame[i] = Math.sin((2 * Math.PI * 220 * i) / sampleRate)
    expect(detectPitchHz(frame, sampleRate)).toBeGreaterThan(215)
    expect(detectPitchHz(frame, sampleRate)).toBeLessThan(225)
  })

  it('reports silence as unvoiced', () => {
    expect(detectPitchHz(new Float32Array(2048), 16000)).toBe(0)
  })

  it('follows a rising sweep across a whole recording', () => {
    const sampleRate = 16000
    const samples = new Float32Array(sampleRate * 0.6)
    let phase = 0
    for (let i = 0; i < samples.length; i += 1) {
      const hz = 150 + (110 * i) / samples.length
      phase += (2 * Math.PI * hz) / sampleRate
      samples[i] = Math.sin(phase)
    }
    const contour = extractContour(samples, sampleRate).filter((hz) => hz > 0)
    expect(contour.length).toBeGreaterThan(5)
    expect(classifyTone(contour).tone).toBe(2)
  })
})

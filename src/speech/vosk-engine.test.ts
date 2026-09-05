import { describe, expect, it } from 'vitest'
import { resample, VOSK_SAMPLE_RATE } from './vosk-engine'

describe('rate conversion for the offline recognizer', () => {
  it('converts browser capture down to the 16 kHz the model expects', () => {
    expect(resample(new Float32Array(48000), 48000, VOSK_SAMPLE_RATE)).toHaveLength(16000)
    expect(resample(new Float32Array(44100), 44100, VOSK_SAMPLE_RATE)).toHaveLength(16000)
  })

  it('returns the samples untouched when the rate already matches', () => {
    const samples = new Float32Array([0.1, 0.2, 0.3])
    expect(resample(samples, 16000, 16000)).toBe(samples)
  })

  it('preserves the shape of the waveform', () => {
    // A ramp resampled must stay a ramp: first and last values survive.
    const ramp = Float32Array.from({ length: 480 }, (_, i) => i / 480)
    const out = resample(ramp, 48000, 16000)
    expect(out).toHaveLength(160)
    expect(out[0]).toBeCloseTo(0, 5)
    expect(out[out.length - 1]).toBeCloseTo(0.994, 2)
  })
})

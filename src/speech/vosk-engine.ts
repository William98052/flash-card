import type { Model } from 'vosk-browser'
import { speechLog } from './speech-adapter'

export const VOSK_MODEL_URL = '/models/vosk-cn.tar.gz'
/** Kaldi models are trained at 16 kHz; browser capture is usually 44.1 or 48. */
export const VOSK_SAMPLE_RATE = 16000

/** Linear resample. Pure, so the rate conversion is testable without audio hardware. */
export function resample(samples: Float32Array, from: number, to: number): Float32Array {
  if (from === to) return samples
  const ratio = from / to
  const output = new Float32Array(Math.floor(samples.length / ratio))
  for (let i = 0; i < output.length; i += 1) {
    const position = i * ratio
    const left = Math.floor(position)
    const right = Math.min(left + 1, samples.length - 1)
    const weight = position - left
    output[i] = samples[left] * (1 - weight) + samples[right] * weight
  }
  return output
}

export interface VoskTranscriber {
  transcribe(samples: Float32Array, sampleRate: number): Promise<string>
  dispose(): void
}

export async function loadVoskTranscriber(modelUrl = VOSK_MODEL_URL): Promise<VoskTranscriber> {
  const startedAt = Date.now()
  // Imported on demand: the WASM runtime is ~6.7 MB and must not sit in the
  // main bundle of an offline-first app that may never use offline speech.
  const { createModel } = await import('vosk-browser')
  const model: Model = await createModel(modelUrl)
  speechLog('vosk:model-loaded', { ms: Date.now() - startedAt })

  return {
    async transcribe(samples, sampleRate) {
      const audio = resample(samples, sampleRate, VOSK_SAMPLE_RATE)
      const recognizer = new model.KaldiRecognizer(VOSK_SAMPLE_RATE)
      try {
        return await new Promise<string>((resolve) => {
          let settled = false
          const finish = (text: string) => { if (!settled) { settled = true; resolve(text) } }
          recognizer.on('result', (message) => finish((message as { result?: { text?: string } }).result?.text ?? ''))
          recognizer.acceptWaveformFloat(audio, VOSK_SAMPLE_RATE)
          recognizer.retrieveFinalResult()
          setTimeout(() => finish(''), 10000)
        })
      } finally { recognizer.remove() }
    },
    dispose() { model.terminate() },
  }
}

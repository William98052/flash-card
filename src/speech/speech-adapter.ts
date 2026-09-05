export type SpeechEvent =
  | { type: 'listening' }
  | { type: 'stopped' }
  | { type: 'result'; transcript: string; confidence: number }
  | { type: 'error'; reason: 'denied' | 'timeout' | 'failed' }

type Listener = (event: SpeechEvent) => void
interface RecognitionLike {
  continuous: boolean
  interimResults: boolean
  lang: string
  onstart: (() => void) | null
  onend: (() => void) | null
  onerror: ((event: { error?: string }) => void) | null
  onresult: ((event: { results: ArrayLike<{ 0: { transcript: string; confidence: number } }> }) => void) | null
  start(): void
  stop(): void
}
type RecognitionConstructor = new () => RecognitionLike

export interface SpeechAdapter {
  capability: 'available' | 'unsupported'
  start(): void
  stop(): void
  subscribe(listener: Listener): () => void
}

export function createSpeechAdapter(targetWindow: Window): SpeechAdapter {
  const Constructor = (targetWindow as unknown as { SpeechRecognition?: RecognitionConstructor; webkitSpeechRecognition?: RecognitionConstructor }).SpeechRecognition
    ?? (targetWindow as unknown as { webkitSpeechRecognition?: RecognitionConstructor }).webkitSpeechRecognition
  const listeners = new Set<Listener>()
  const emit = (event: SpeechEvent) => listeners.forEach((listener) => listener(event))
  if (!Constructor) return { capability: 'unsupported', start() {}, stop() {}, subscribe(listener) { listeners.add(listener); return () => listeners.delete(listener) } }

  const recognition = new Constructor()
  recognition.lang = 'zh-CN'
  recognition.continuous = false
  recognition.interimResults = false
  recognition.onstart = () => emit({ type: 'listening' })
  recognition.onend = () => emit({ type: 'stopped' })
  recognition.onerror = ({ error }) => emit({ type: 'error', reason: error === 'not-allowed' ? 'denied' : error === 'no-speech' ? 'timeout' : 'failed' })
  recognition.onresult = (event) => {
    const result = event.results[0]?.[0]
    if (result) emit({ type: 'result', transcript: result.transcript, confidence: result.confidence })
  }
  return {
    capability: 'available',
    start() { try { recognition.start() } catch { emit({ type: 'error', reason: 'failed' }) } },
    stop() { recognition.stop() },
    subscribe(listener) { listeners.add(listener); return () => listeners.delete(listener) },
  }
}

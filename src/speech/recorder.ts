import { speechLog } from './speech-adapter'

export interface Recording { samples: Float32Array; sampleRate: number }

/**
 * Captures a short clip for tone analysis. Deliberately separate from speech
 * recognition: Chrome drops the microphone when capture is acquired and
 * released around a live recognition, so the two never run at once.
 */
export async function recordClip(targetWindow: Window, milliseconds = 2000): Promise<Recording> {
  const nav = targetWindow.navigator
  const stream = await nav.mediaDevices.getUserMedia({ audio: true })
  try {
    const recorder = new MediaRecorder(stream)
    const chunks: Blob[] = []
    recorder.ondataavailable = (event) => { if (event.data.size) chunks.push(event.data) }
    const finished = new Promise<void>((resolve) => { recorder.onstop = () => resolve() })
    recorder.start()
    speechLog('tone:recording', { milliseconds })
    await new Promise((resolve) => setTimeout(resolve, milliseconds))
    recorder.stop()
    await finished

    const AudioContextCtor = (targetWindow as unknown as { AudioContext: typeof AudioContext }).AudioContext
    const context = new AudioContextCtor()
    try {
      const buffer = await context.decodeAudioData(await new Blob(chunks).arrayBuffer())
      speechLog('tone:recorded', { seconds: Number(buffer.duration.toFixed(2)), sampleRate: buffer.sampleRate })
      return { samples: buffer.getChannelData(0), sampleRate: buffer.sampleRate }
    } finally { void context.close() }
  } finally {
    stream.getTracks().forEach((track) => track.stop())
  }
}

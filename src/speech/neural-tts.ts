import { speechLog } from './speech-adapter'

/** Piper VITS voice trained on Mandarin; markedly more natural than the compact system voices. */
export const NEURAL_VOICE_ID = 'zh_CN-huayan-medium'

export interface NeuralVoiceStatus { installed: boolean; downloading: boolean; progress: number }

export async function isNeuralVoiceInstalled(): Promise<boolean> {
  const { stored } = await import('@diffusionstudio/vits-web')
  return (await stored()).includes(NEURAL_VOICE_ID)
}

export async function installNeuralVoice(onProgress?: (fraction: number) => void): Promise<void> {
  const { download } = await import('@diffusionstudio/vits-web')
  speechLog('tts:install-start', { voice: NEURAL_VOICE_ID })
  await download(NEURAL_VOICE_ID, (progress) => {
    if (progress.total) onProgress?.(progress.loaded / progress.total)
  })
  speechLog('tts:install-done', { voice: NEURAL_VOICE_ID })
}

/** Synthesizes speech locally and returns playable audio. */
export async function synthesize(text: string): Promise<Blob> {
  const { predict } = await import('@diffusionstudio/vits-web')
  const startedAt = Date.now()
  const wav = await predict({ text, voiceId: NEURAL_VOICE_ID })
  speechLog('tts:synthesized', { ms: Date.now() - startedAt, bytes: wav.size })
  return wav
}

import { createVoiceCache, type VoiceCache } from './voice-cache'

let cache: VoiceCache | undefined
export function neuralVoiceCache(): VoiceCache {
  cache ??= createVoiceCache((text) => synthesize(text))
  return cache
}

/** Plays prepared audio, resolving when playback starts. */
export async function playAudio(audio: Blob, targetWindow: Window = window): Promise<void> {
  const url = URL.createObjectURL(audio)
  const element = new (targetWindow as unknown as { Audio: typeof Audio }).Audio(url)
  element.addEventListener('ended', () => URL.revokeObjectURL(url), { once: true })
  await element.play()
}

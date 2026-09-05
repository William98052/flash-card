import { expect, it, vi } from 'vitest'
import { pickChineseVoice, speakCharacter, speakWhenReady } from './speak'

const voice = (name: string, lang: string, localService = true) => ({ name, lang, localService }) as SpeechSynthesisVoice

it('prefers an offline mainland Chinese voice', () => {
  const chosen = pickChineseVoice([
    voice('Daniel', 'en-GB'),
    voice('Sandy', 'zh-TW'),
    voice('Tingting', 'zh-CN'),
  ])
  expect(chosen?.name).toBe('Tingting')
})

it('falls back to any Chinese voice, then to none at all', () => {
  expect(pickChineseVoice([voice('Sandy', 'zh-TW')])?.name).toBe('Sandy')
  expect(pickChineseVoice([voice('Daniel', 'en-GB')])).toBeUndefined()
})

it('speaks the character with the Chinese voice and cancels anything already playing', () => {
  const cancel = vi.fn()
  const speak = vi.fn()
  const synth = { cancel, speak, getVoices: () => [voice('Tingting', 'zh-CN')] } as unknown as SpeechSynthesis
  const spoken = speakCharacter('行', synth, (text) => ({ text, lang: '', voice: null, rate: 1 }) as SpeechSynthesisUtterance)
  expect(spoken).toBe(true)
  expect(cancel).toHaveBeenCalled()
  expect(speak).toHaveBeenCalledWith(expect.objectContaining({ text: '行', lang: 'zh-CN' }))
})

it('reports when the browser offers no Chinese voice', () => {
  const synth = { cancel: vi.fn(), speak: vi.fn(), getVoices: () => [voice('Daniel', 'en-GB')] } as unknown as SpeechSynthesis
  expect(speakCharacter('行', synth, (text) => ({ text }) as SpeechSynthesisUtterance)).toBe(false)
})

it('waits for voices, which Chrome loads asynchronously and reports empty at first', async () => {
  let listener: null | (() => void) = null
  let loaded = false
  const speak = vi.fn()
  const synth = {
    cancel: vi.fn(),
    speak,
    getVoices: () => (loaded ? [voice('Tingting', 'zh-CN')] : []),
    set onvoiceschanged(fn: () => void) { listener = fn as () => void },
  } as unknown as SpeechSynthesis

  const pending = speakWhenReady('行', synth, (text) => ({ text }) as SpeechSynthesisUtterance)
  loaded = true
  ;(listener as unknown as (() => void) | null)?.()
  expect(await pending).toBe(true)
  expect(speak).toHaveBeenCalled()
})

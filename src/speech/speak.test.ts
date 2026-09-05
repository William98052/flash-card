import { describe, expect, it, vi } from 'vitest'
import { listChineseVoices, pickChineseVoice, speakCharacter, speakWhenReady } from './speak'

const voice = (name: string, lang: string, localService = true) => ({ name, lang, localService, voiceURI: name }) as SpeechSynthesisVoice

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

describe('voice quality ranking', () => {
  const all = [
    voice('Eddy (Chinese (China mainland))', 'zh-CN'),
    voice('Flo (Chinese (China mainland))', 'zh-CN'),
    voice('Grandma (Chinese (China mainland))', 'zh-CN'),
    voice('Meijia', 'zh-TW'),
    voice('Tingting', 'zh-CN'),
    voice('Daniel', 'en-GB'),
  ]

  it('picks the natural voice over the novelty character voices', () => {
    // macOS ships Eddy, Flo, Grandma, Grandpa, Reed, Rocko, Sandy and Shelley
    // as character voices in every language. Tingting is the real zh-CN voice.
    expect(pickChineseVoice(all)?.name).toBe('Tingting')
  })

  it('falls back to a novelty voice only when nothing better exists', () => {
    const only = [voice('Grandpa (Chinese (China mainland))', 'zh-CN'), voice('Daniel', 'en-GB')]
    expect(pickChineseVoice(only)?.name).toMatch(/Grandpa/)
  })

  it('prefers mainland over Taiwan when both are natural', () => {
    expect(pickChineseVoice([voice('Meijia', 'zh-TW'), voice('Tingting', 'zh-CN')])?.name).toBe('Tingting')
    expect(pickChineseVoice([voice('Meijia', 'zh-TW')])?.name).toBe('Meijia')
  })

  it('lists the Chinese voices best first, so a picker can show them in order', () => {
    expect(listChineseVoices(all).map((v) => v.name)).toEqual([
      'Tingting', 'Meijia',
      'Eddy (Chinese (China mainland))', 'Flo (Chinese (China mainland))', 'Grandma (Chinese (China mainland))',
    ])
  })
})

describe('Google network voices', () => {
  it('prefers the Google Mandarin voice, which sounds better than the local ones', () => {
    const all = [
      voice('Eddy (Chinese (China mainland))', 'zh-CN'),
      voice('Tingting', 'zh-CN'),
      voice('Google 普通话（中国大陆）', 'zh-CN', false),
    ]
    expect(pickChineseVoice(all)?.name).toBe('Google 普通话（中国大陆）')
    expect(listChineseVoices(all).map((v) => v.name)).toEqual([
      'Google 普通话（中国大陆）', 'Tingting', 'Eddy (Chinese (China mainland))',
    ])
  })

  it('falls back to the best local voice when Google is unavailable', () => {
    expect(pickChineseVoice([voice('Eddy (Chinese (China mainland))', 'zh-CN'), voice('Tingting', 'zh-CN')])?.name).toBe('Tingting')
  })

  it('still honours an explicit choice', () => {
    const all = [voice('Google 普通话（中国大陆）', 'zh-CN', false), voice('Tingting', 'zh-CN')]
    expect(pickChineseVoice(all, 'Tingting')?.name).toBe('Tingting')
  })
})

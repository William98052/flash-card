import { describe, expect, it, vi } from 'vitest'
import { createVoiceCache } from './voice-cache'

const blob = (name: string) => new Blob([name])

describe('prepared audio', () => {
  it('synthesizes a character once and reuses it', async () => {
    const synthesize = vi.fn(async (text: string) => blob(text))
    const cache = createVoiceCache(synthesize)
    await cache.get('行')
    await cache.get('行')
    expect(synthesize).toHaveBeenCalledTimes(1)
  })

  it('prepares audio ahead of time so playback is instant', async () => {
    const synthesize = vi.fn(async (text: string) => blob(text))
    const cache = createVoiceCache(synthesize)
    cache.prefetch('闭')
    await vi.waitFor(() => expect(cache.ready('闭')).toBe(true))
    expect(synthesize).toHaveBeenCalledTimes(1)
  })

  it('does not start a second synthesis while the first is still running', async () => {
    const synthesize = vi.fn(() => new Promise<Blob>((resolve) => setTimeout(() => resolve(blob('x')), 20)))
    const cache = createVoiceCache(synthesize)
    const both = Promise.all([cache.get('好'), cache.get('好')])
    await both
    expect(synthesize).toHaveBeenCalledTimes(1)
  })

  it('forgets the oldest entries rather than growing without limit', async () => {
    const synthesize = vi.fn(async (text: string) => blob(text))
    const cache = createVoiceCache(synthesize, 2)
    await cache.get('a'); await cache.get('b'); await cache.get('c')
    expect(cache.ready('a')).toBe(false)
    expect(cache.ready('c')).toBe(true)
  })

  it('does not cache a failure, so a retry can succeed', async () => {
    let attempt = 0
    const synthesize = vi.fn(async () => { attempt += 1; if (attempt === 1) throw new Error('nope'); return blob('ok') })
    const cache = createVoiceCache(synthesize)
    await expect(cache.get('行')).rejects.toThrow('nope')
    await expect(cache.get('行')).resolves.toBeInstanceOf(Blob)
  })
})

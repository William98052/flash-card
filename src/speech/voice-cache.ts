/**
 * Neural synthesis takes 1-2 seconds per character, which is far too slow for a
 * button press but invisible while a card is being read. Audio is prepared as
 * soon as the card appears and reused afterwards.
 */
export interface VoiceCache {
  get(text: string): Promise<Blob>
  prefetch(text: string): void
  ready(text: string): boolean
}

export function createVoiceCache(synthesize: (text: string) => Promise<Blob>, limit = 40): VoiceCache {
  const pending = new Map<string, Promise<Blob>>()
  const done = new Map<string, Blob>()

  const remember = (text: string, audio: Blob) => {
    done.set(text, audio)
    while (done.size > limit) {
      const oldest = done.keys().next().value
      if (oldest === undefined) break
      done.delete(oldest)
    }
  }

  const get = (text: string): Promise<Blob> => {
    const finished = done.get(text)
    if (finished) return Promise.resolve(finished)
    const inFlight = pending.get(text)
    if (inFlight) return inFlight
    const work = synthesize(text)
      .then((audio) => { remember(text, audio); return audio })
      .finally(() => pending.delete(text))
    pending.set(text, work)
    return work
  }

  return {
    get,
    prefetch(text) { void get(text).catch(() => { /* a failed prefetch must stay silent */ }) },
    ready(text) { return done.has(text) },
  }
}

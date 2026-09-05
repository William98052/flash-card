/**
 * Playback of the expected pronunciation. Chrome ships offline Chinese voices
 * on macOS (Tingting, Shelley and others), so this needs no network and no
 * bundled audio.
 */
/**
 * macOS ships a set of character voices - Eddy, Flo, Grandma, Grandpa, Reed,
 * Rocko, Sandy, Shelley - in every language, and they sound like novelties
 * rather than speech. The natural Mandarin voice is Tingting (Meijia for
 * Taiwan), so those are preferred and the character voices are used only when
 * nothing else exists.
 */
const NOVELTY_VOICES = /^(Eddy|Flo|Grandma|Grandpa|Reed|Rocko|Sandy|Shelley|Superstar|Jester|Bells|Boing|Bubbles|Trinoids|Whisper|Wobble|Zarvox|Albert|Bahh|Cellos|Organ|Good News|Bad News)\b/i
const NATURAL_VOICES = /^(Tingting|Ting-Ting|Meijia|Mei-Jia|Sinji|Li-?mu|Yu-?shu|Han|Lili|Xiaoxiao|Yunyang)\b/i

/**
 * Chrome's Google Mandarin voice is the best sounding option available here, so
 * it is preferred despite needing a network connection. The local voices remain
 * the fallback when it is missing or offline.
 */
const GOOGLE_VOICE = /^Google\s/i

function voiceRank(item: SpeechSynthesisVoice): number {
  const novelty = NOVELTY_VOICES.test(item.name) ? 100 : 0
  const tier = GOOGLE_VOICE.test(item.name) ? -5 : NATURAL_VOICES.test(item.name) ? 0 : 10
  const mainland = /^(zh-CN|cmn-Hans|zh-Hans)/i.test(item.lang) ? 0 : 1
  return novelty + tier + mainland
}

/** Every Chinese voice, best first — for a picker the learner can listen through. */
export function listChineseVoices(voices: SpeechSynthesisVoice[]): SpeechSynthesisVoice[] {
  return voices.filter((item) => /^(zh|cmn)/i.test(item.lang)).sort((a, b) => voiceRank(a) - voiceRank(b))
}

export function pickChineseVoice(voices: SpeechSynthesisVoice[], preferredUri?: string): SpeechSynthesisVoice | undefined {
  const chinese = listChineseVoices(voices)
  return chinese.find((item) => item.voiceURI === preferredUri) ?? chinese[0]
}

export function speakCharacter(
  text: string,
  synth: SpeechSynthesis,
  createUtterance: (text: string) => SpeechSynthesisUtterance,
  preferredUri?: string,
): boolean {
  const chosen = pickChineseVoice(synth.getVoices(), preferredUri)
  if (!chosen) return false
  synth.cancel() // never let two readings overlap
  const utterance = createUtterance(text)
  utterance.voice = chosen
  utterance.lang = chosen.lang
  utterance.rate = 0.8 // a little slow, so the tone is easy to hear
  synth.speak(utterance)
  return true
}

/**
 * Chrome populates its voice list asynchronously: the first `getVoices()` on a
 * fresh page returns an empty array, which would wrongly look like "no Chinese
 * voice installed". Wait for the list before deciding.
 */
export async function loadVoices(synth: SpeechSynthesis, timeoutMs = 2000): Promise<SpeechSynthesisVoice[]> {
  const immediate = synth.getVoices()
  if (immediate.length) return immediate
  return await new Promise((resolve) => {
    const finish = () => resolve(synth.getVoices())
    synth.onvoiceschanged = finish
    setTimeout(finish, timeoutMs)
  })
}

export async function speakWhenReady(
  text: string,
  synth: SpeechSynthesis,
  createUtterance: (text: string) => SpeechSynthesisUtterance,
  preferredUri?: string,
): Promise<boolean> {
  await loadVoices(synth)
  return speakCharacter(text, synth, createUtterance, preferredUri)
}

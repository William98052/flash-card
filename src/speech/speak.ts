/**
 * Playback of the expected pronunciation. Chrome ships offline Chinese voices
 * on macOS (Tingting, Shelley and others), so this needs no network and no
 * bundled audio.
 */
export function pickChineseVoice(voices: SpeechSynthesisVoice[]): SpeechSynthesisVoice | undefined {
  const chinese = voices.filter((item) => /^(zh|cmn)/i.test(item.lang))
  if (!chinese.length) return undefined
  const rank = (item: SpeechSynthesisVoice) =>
    (/^(zh-CN|cmn-Hans)/i.test(item.lang) ? 0 : 1) + (item.localService ? 0 : 2)
  return [...chinese].sort((a, b) => rank(a) - rank(b))[0]
}

export function speakCharacter(
  text: string,
  synth: SpeechSynthesis,
  createUtterance: (text: string) => SpeechSynthesisUtterance,
): boolean {
  const chosen = pickChineseVoice(synth.getVoices())
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
): Promise<boolean> {
  await loadVoices(synth)
  return speakCharacter(text, synth, createUtterance)
}

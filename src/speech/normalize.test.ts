import { describe, expect, it } from 'vitest'
import { assessPronunciation, buildHomophoneIndex, isFlipCommand, normalizeRecognition } from './normalize'
import type { CharacterCard } from '@/domain/types'

const card = {
  character: '行', readings: [
    { pinyin: 'xíng', meaning: 'to go', acceptedForms: ['xing'] },
    { pinyin: 'háng', meaning: 'line', acceptedForms: ['hang'] },
  ],
} as CharacterCard

describe('speech normalization', () => {
  it('normalizes tone marks, spaces, punctuation, and case', () => {
    expect(normalizeRecognition(' XÍNG! ')).toBe('xing')
  })

  it('accepts target text and every listed polyphonic reading', () => {
    expect(assessPronunciation({ transcript: '行', confidence: .9 }, card)).toMatchObject({ status: 'correct' })
    expect(assessPronunciation({ transcript: 'háng', confidence: .9 }, card)).toMatchObject({ status: 'correct' })
  })

  it('requires manual judgment for empty or low-confidence results', () => {
    expect(assessPronunciation({ transcript: '', confidence: .9 }, card).status).toBe('manual')
    // A low score on something that does NOT match still needs a human call.
    expect(assessPronunciation({ transcript: 'zhuo', confidence: .2 }, card).status).toBe('manual')
    expect(assessPronunciation({ transcript: '错', confidence: .9 }, card).status).toBe('incorrect')
  })

  it('recognizes only the isolated flip command', () => {
    expect(isFlipCommand('翻')).toBe(true)
    expect(isFlipCommand('翻到下一张')).toBe(false)
  })
})

describe('constrained matching against the card\'s known readings', () => {
  const index = buildHomophoneIndex([
    { character: '行', readings: [{ pinyin: 'xíng' }, { pinyin: 'háng' }] },
    { character: '型', readings: [{ pinyin: 'xíng' }] },
    { character: '形', readings: [{ pinyin: 'xíng' }] },
    { character: '错', readings: [{ pinyin: 'cuò' }] },
  ] as CharacterCard[])

  it('accepts a homophone the recognizer returned instead of the card character', () => {
    // Saying "xíng" correctly often comes back as 型 or 形 - the pronunciation was right.
    expect(assessPronunciation({ transcript: '型', confidence: .9 }, card, { index }).status).toBe('correct')
    expect(assessPronunciation({ transcript: '形', confidence: .9 }, card, { index }).status).toBe('correct')
  })

  it('accepts a match found in any alternative, not just the top one', () => {
    const result = assessPronunciation({ transcript: '刑事', confidence: .9, alternatives: ['刑事', 'xíng'] }, card, { index })
    expect(result.status).toBe('correct')
  })

  it('trusts a matching reading even when the confidence score is low', () => {
    // Confidence is unreliable: ambient noise scored 0.89 while real speech scored lower.
    expect(assessPronunciation({ transcript: 'xing', confidence: .2 }, card, { index }).status).toBe('correct')
  })

  it('still asks for a manual judgment when nothing matches and confidence is low', () => {
    expect(assessPronunciation({ transcript: '错', confidence: .2 }, card, { index }).status).toBe('manual')
  })

  it('rejects a confidently recognized non-homophone', () => {
    expect(assessPronunciation({ transcript: '错', confidence: .9 }, card, { index }).status).toBe('incorrect')
  })

  it('tolerates a one-letter slip in a long pinyin transcript but not a short one', () => {
    expect(assessPronunciation({ transcript: 'xin', confidence: .9 }, card, { index }).status).toBe('incorrect')
    expect(assessPronunciation({ transcript: 'hang', confidence: .9 }, card, { index }).status).toBe('correct')
  })
})

describe('single letters that Chrome writes instead of a syllable', () => {
  const bi = { character: '闭', readings: [{ pinyin: 'bì', meaning: 'to close', acceptedForms: [] }] } as unknown as CharacterCard

  it('accepts the letter B for bì, since the letter is said "bee"', () => {
    expect(assessPronunciation({ transcript: 'B', confidence: .9 }, bi).status).toBe('correct')
    expect(assessPronunciation({ transcript: 'b.', confidence: .9 }, bi).status).toBe('correct')
  })

  it('handles the other letters whose names are Chinese syllables', () => {
    const di = { character: '第', readings: [{ pinyin: 'dì' }] } as unknown as CharacterCard
    const pi = { character: '皮', readings: [{ pinyin: 'pí' }] } as unknown as CharacterCard
    const ji = { character: '几', readings: [{ pinyin: 'jǐ' }] } as unknown as CharacterCard
    expect(assessPronunciation({ transcript: 'D', confidence: .9 }, di).status).toBe('correct')
    expect(assessPronunciation({ transcript: 'P', confidence: .9 }, pi).status).toBe('correct')
    expect(assessPronunciation({ transcript: 'G', confidence: .9 }, ji).status).toBe('correct')
  })

  it('does not let a letter match an unrelated reading', () => {
    expect(assessPronunciation({ transcript: 'B', confidence: .9 }, { character: '好', readings: [{ pinyin: 'hǎo' }] } as unknown as CharacterCard).status).toBe('incorrect')
  })

  it('only expands a lone letter, never a real word', () => {
    // "bi" spelled out is already handled by the normal path; a longer latin
    // transcript must not be treated as a letter name.
    expect(assessPronunciation({ transcript: 'bee', confidence: .9 }, bi).status).toBe('incorrect')
  })
})

describe('repeated syllables', () => {
  const bi = { character: '闭', readings: [{ pinyin: 'bì' }] } as unknown as CharacterCard

  it('accepts a reading that was said twice', () => {
    // Chrome often returns nothing for one short syllable, so learners repeat
    // themselves and get back "b b" or "bi bi".
    expect(assessPronunciation({ transcript: 'b b', confidence: .8 }, bi).status).toBe('correct')
    expect(assessPronunciation({ transcript: 'bi bi', confidence: .8 }, bi).status).toBe('correct')
    expect(assessPronunciation({ transcript: '闭 闭', confidence: .8 }, bi).status).toBe('correct')
  })

  it('accepts a self-correction, where only the last attempt was right', () => {
    expect(assessPronunciation({ transcript: 'hao bi', confidence: .8 }, bi).status).toBe('correct')
  })

  it('does not match when no part of it is the reading', () => {
    expect(assessPronunciation({ transcript: 'hao hao', confidence: .8 }, bi).status).toBe('incorrect')
  })
})

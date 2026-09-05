import { describe, expect, it } from 'vitest'
import { assessPronunciation, isFlipCommand, normalizeRecognition } from './normalize'
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
    expect(assessPronunciation({ transcript: 'xing', confidence: .2 }, card).status).toBe('manual')
    expect(assessPronunciation({ transcript: '错', confidence: .9 }, card).status).toBe('incorrect')
  })

  it('recognizes only the isolated flip command', () => {
    expect(isFlipCommand('翻')).toBe(true)
    expect(isFlipCommand('翻到下一张')).toBe(false)
  })
})

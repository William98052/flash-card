import { expect, it } from 'vitest'
import { fallbackExamples } from './seed-fallbacks'

it('uses two natural examples for the interjection 喔', () => {
  expect(fallbackExamples('喔')).toEqual([
    { text: '喔，我明白了。', pinyin: 'ō，wǒ míng bái le。', english: 'Oh, I understand now.' },
    { text: '记得带课本喔！', pinyin: 'jì dé dài kè běn ō！', english: 'Remember to bring your textbook!' },
  ])
})

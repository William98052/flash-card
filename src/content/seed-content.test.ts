import { expect, it } from 'vitest'
import seed from './ap-1000.json'
import { cleanDefinition } from './seed-content'
import type { CharacterCard } from '@/domain/types'

it('keeps the first meaningful definition after removing dictionary annotations', () => {
  expect(cleanDefinition(['(completed action marker)', '(modal particle)', 'to finish'])).toBe('to finish')
})

it('keeps each reading of 重 aligned with its meaning and useful compounds', () => {
  const card = (seed as CharacterCard[]).find(({ character }) => character === '重')

  expect(card).toMatchObject({
    readings: [
      { pinyin: 'zhòng', meaning: 'heavy; serious; important' },
      { pinyin: 'chóng', meaning: 'again; repeat' },
    ],
    englishMeaning: 'heavy; serious; important; again; repeat',
    compounds: [
      { text: '重要', pinyin: 'zhòng yào', english: 'important' },
      { text: '重量', pinyin: 'zhòng liàng', english: 'weight' },
      { text: '严重', pinyin: 'yán zhòng', english: 'serious' },
      { text: '重新', pinyin: 'chóng xīn', english: 'again; anew' },
      { text: '重复', pinyin: 'chóng fù', english: 'to repeat' },
    ],
  })
})

import { expect, it } from 'vitest'
import { extractUniqueHan } from './character-extraction'

it('extracts unique Han characters in first-seen order', () => {
  expect(extractUniqueHan('你好，world 你！\n学123习🙂', new Set(['好']))).toEqual({
    toAdd: ['你', '学', '习'],
    existing: ['好'],
    ignoredCount: 13,
  })
})

import { expect, it } from 'vitest'
import { cleanDefinition } from './seed-content'

it('keeps the first meaningful definition after removing dictionary annotations', () => {
  expect(cleanDefinition(['(completed action marker)', '(modal particle)', 'to finish'])).toBe('to finish')
})

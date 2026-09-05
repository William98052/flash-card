import { describe, expect, it } from 'vitest'
import { addMembership, deleteCard, resetUnreviewed, setMembership } from './library-service'
import type { LibraryState } from './types'

const state = (): LibraryState => ({
  cards: new Map([['a', { id: 'a', character: '学' } as never]]),
  memberships: new Map([['all', new Set(['a'])], ['unreviewed', new Set(['a'])]]),
  reviews: new Map([['a', { characterId: 'a', isUnreviewed: true, reviewCount: 3, correctCount: 2, incorrectCount: 1, lastReviewedAt: null }]]),
})

describe('library rules', () => {
  it('keeps memberships idempotent and overlapping', () => {
    const first = addMembership(state(), 'new-1', 'a')
    const second = addMembership(first, 'new-1', 'a')
    const familiar = addMembership(second, 'familiar', 'a')
    expect(familiar.memberships.get('new-1')).toEqual(new Set(['a']))
    expect(familiar.memberships.get('familiar')).toEqual(new Set(['a']))
  })

  it('deleting a card cleans all memberships and review state', () => {
    const tagged = addMembership(state(), 'wrong', 'a')
    const result = deleteCard(tagged, 'a')
    expect(result.cards.has('a')).toBe(false)
    expect([...result.memberships.values()].every((ids) => !ids.has('a'))).toBe(true)
    expect(result.reviews.has('a')).toBe(false)
  })

  it('resets unreviewed without clearing stats or tags', () => {
    const tagged = setMembership(state(), 'new-2', 'a', true)
    const result = resetUnreviewed(tagged)
    expect(result.memberships.get('unreviewed')).toEqual(new Set(['a']))
    expect(result.memberships.get('new-2')).toEqual(new Set(['a']))
    expect(result.reviews.get('a')?.reviewCount).toBe(3)
  })
})

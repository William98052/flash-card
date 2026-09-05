import { describe, expect, it } from 'vitest'
import { createSession, markShown, setPendingDecision, settleAndAdvance } from './study-engine'
import type { LibraryState } from './types'

const libraryState = (): LibraryState => ({
  cards: new Map(),
  memberships: new Map([['unreviewed', new Set(['a', 'b'])]]),
  reviews: new Map([
    ['a', { characterId: 'a', isUnreviewed: true, reviewCount: 0, correctCount: 0, incorrectCount: 0, lastReviewedAt: null }],
    ['b', { characterId: 'b', isUnreviewed: true, reviewCount: 0, correctCount: 0, incorrectCount: 0, lastReviewedAt: null }],
  ]),
})

describe('study engine', () => {
  it('creates an immutable shuffled snapshot without duplicates', () => {
    const source = ['a', 'b', 'c']
    const session = createSession('all', source, (ids) => ids.reverse(), () => '2026-09-05T00:00:00.000Z')
    source.push('d')
    expect(session.cardIds).toEqual(['c', 'b', 'a'])
    expect(new Set(session.cardIds).size).toBe(3)
  })

  it('marks a card reviewed when shown and settles the final override once', () => {
    const initial = createSession('all', ['a', 'b'], (ids) => ids, () => 'start')
    const shown = markShown(initial, libraryState())
    expect(shown.state.memberships.get('unreviewed')).toEqual(new Set(['b']))

    const changed = setPendingDecision(setPendingDecision(shown.session, 'incorrect'), 'correct')
    const settled = settleAndAdvance(changed, shown.state, () => 'end')
    expect(settled.state.reviews.get('a')).toMatchObject({ reviewCount: 1, correctCount: 1, incorrectCount: 0 })
    expect(settled.state.memberships.get('wrong')?.has('a')).toBe(false)
    expect(settled.session.currentIndex).toBe(1)
  })
})

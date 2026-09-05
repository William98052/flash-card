import { setMembership } from './library-service'
import type { Decision, LibraryId, LibraryState, StudySession } from './types'

type Shuffle = (ids: string[]) => string[]
type Clock = () => string

export function createSession(sourceLibraryId: LibraryId, eligibleIds: string[], shuffle: Shuffle, now: Clock): StudySession {
  const unique = [...new Set(eligibleIds)]
  if (unique.length === 0) throw new Error('Cannot start a session from an empty library')
  return {
    id: crypto.randomUUID(), sourceLibraryId, cardIds: shuffle([...unique]), currentIndex: 0,
    pendingDecision: null, correctCount: 0, incorrectCount: 0, startedAt: now(), endedAt: null, status: 'active',
  }
}

export function markShown(session: StudySession, state: LibraryState): { session: StudySession; state: LibraryState } {
  const id = session.cardIds[session.currentIndex]
  let next = setMembership(state, 'unreviewed', id, false)
  const review = next.reviews.get(id)
  if (review) next.reviews.set(id, { ...review, isUnreviewed: false })
  return { session, state: next }
}

export function setPendingDecision(session: StudySession, decision: Decision): StudySession {
  return { ...session, pendingDecision: decision }
}

export function settleAndAdvance(session: StudySession, state: LibraryState, now: Clock): { session: StudySession; state: LibraryState } {
  if (!session.pendingDecision) throw new Error('Choose correct or incorrect before continuing')
  const id = session.cardIds[session.currentIndex]
  const prior = state.reviews.get(id) ?? { characterId: id, isUnreviewed: false, reviewCount: 0, correctCount: 0, incorrectCount: 0, lastReviewedAt: null }
  let nextState = setMembership(state, 'wrong', id, session.pendingDecision === 'incorrect')
  nextState.reviews.set(id, {
    ...prior,
    isUnreviewed: false,
    reviewCount: prior.reviewCount + 1,
    correctCount: prior.correctCount + (session.pendingDecision === 'correct' ? 1 : 0),
    incorrectCount: prior.incorrectCount + (session.pendingDecision === 'incorrect' ? 1 : 0),
    lastReviewedAt: now(),
  })
  const nextIndex = session.currentIndex + 1
  const completed = nextIndex >= session.cardIds.length
  return {
    state: nextState,
    session: {
      ...session,
      currentIndex: nextIndex,
      pendingDecision: null,
      correctCount: session.correctCount + (session.pendingDecision === 'correct' ? 1 : 0),
      incorrectCount: session.incorrectCount + (session.pendingDecision === 'incorrect' ? 1 : 0),
      status: completed ? 'completed' : 'active',
      endedAt: completed ? now() : null,
    },
  }
}

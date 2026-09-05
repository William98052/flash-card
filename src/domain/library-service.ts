import type { LibraryId, LibraryState } from './types'

function copy(state: LibraryState): LibraryState {
  return {
    cards: new Map(state.cards),
    memberships: new Map([...state.memberships].map(([id, members]) => [id, new Set(members)])),
    reviews: new Map([...state.reviews].map(([id, review]) => [id, { ...review }])),
  }
}

export function setMembership(state: LibraryState, libraryId: LibraryId, characterId: string, enabled: boolean): LibraryState {
  const next = copy(state)
  const members = next.memberships.get(libraryId) ?? new Set<string>()
  if (enabled) members.add(characterId)
  else members.delete(characterId)
  next.memberships.set(libraryId, members)
  return next
}

export const addMembership = (state: LibraryState, libraryId: LibraryId, characterId: string) =>
  setMembership(state, libraryId, characterId, true)

export function deleteCard(state: LibraryState, characterId: string): LibraryState {
  const next = copy(state)
  next.cards.delete(characterId)
  next.reviews.delete(characterId)
  for (const members of next.memberships.values()) members.delete(characterId)
  return next
}

export function resetUnreviewed(state: LibraryState): LibraryState {
  const next = copy(state)
  const all = next.memberships.get('all') ?? new Set<string>()
  next.memberships.set('unreviewed', new Set(all))
  for (const [id, review] of next.reviews) next.reviews.set(id, { ...review, isUnreviewed: all.has(id) })
  return next
}

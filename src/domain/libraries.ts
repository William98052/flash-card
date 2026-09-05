import type { LibraryId } from './types'

export const LIBRARIES: ReadonlyArray<{ id: LibraryId; name: string; description: string }> = [
  { id: 'all', name: 'All characters', description: 'Every card with complete content' },
  { id: 'unreviewed', name: 'Unreviewed', description: 'Not shown yet in the current round' },
  { id: 'wrong', name: 'Missed', description: 'Characters you most recently marked incorrect' },
  { id: 'new-1', name: 'New words 1', description: 'Your own focus list' },
  { id: 'new-2', name: 'New words 2', description: 'Your own focus list' },
  { id: 'new-3', name: 'New words 3', description: 'Your own focus list' },
  { id: 'familiar', name: 'Familiar', description: 'Characters you already know well' },
]

export const USER_TAG_LIBRARIES: LibraryId[] = ['wrong', 'new-1', 'new-2', 'new-3', 'familiar']

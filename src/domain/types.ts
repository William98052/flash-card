export type LibraryId = 'all' | 'unreviewed' | 'wrong' | 'new-1' | 'new-2' | 'new-3' | 'familiar'
export type Decision = 'correct' | 'incorrect'

export interface Reading {
  pinyin: string
  meaning: string
  acceptedForms: string[]
}

export interface Compound {
  text: string
  pinyin: string
  english: string
}

export interface Example {
  text: string
  pinyin: string
  english: string
}

export interface CharacterCard {
  id: string
  character: string
  readings: Reading[]
  englishMeaning: string
  contentType: 'compounds' | 'examples'
  compounds: Compound[]
  examples: Example[]
  contentStatus: 'complete' | 'needs_content'
  seedVersion: number | null
  userEditedFields: string[]
  createdAt: string
  updatedAt: string
}

export interface ReviewState {
  characterId: string
  isUnreviewed: boolean
  reviewCount: number
  correctCount: number
  incorrectCount: number
  lastReviewedAt: string | null
}

export interface StudySession {
  id: string
  sourceLibraryId: LibraryId
  cardIds: string[]
  currentIndex: number
  pendingDecision: Decision | null
  correctCount: number
  incorrectCount: number
  startedAt: string
  endedAt: string | null
  status: 'active' | 'completed' | 'ended'
}

export interface SessionSummary {
  id: string
  sourceLibraryId: LibraryId
  startedAt: string
  endedAt: string
  completedCount: number
  correctCount: number
  incorrectCount: number
  accuracy: number
}

export interface AppSettings {
  id: 'settings'
  continuousFlipListening: boolean
  /** Recognize locally with the bundled model instead of Chrome's cloud service. */
  useOfflineSpeech?: boolean
  /** voiceURI of the chosen reading voice; unset means the best available. */
  ttsVoiceUri?: string
  /** Use the downloaded neural Mandarin voice instead of a system voice. */
  useNeuralVoice?: boolean
  backupReminderDismissedAt: string | null
  appVersion: number
  schemaVersion: number
}

export interface LibraryState {
  cards: Map<string, CharacterCard>
  memberships: Map<LibraryId, Set<string>>
  reviews: Map<string, ReviewState>
}

export interface LibraryMembership {
  id: string
  libraryId: LibraryId
  characterId: string
}

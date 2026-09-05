import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import seed from '@/content/ap-1000.json'
import { FlashCardDatabase } from '@/data/database'
import { initializeDatabase } from '@/data/initialize'
import { FlashCardRepository } from '@/data/repository'
import { createSession } from '@/domain/study-engine'
import { commitBackup, exportBackup, previewBackup, snapshotDatabase } from '@/portability/json-backup'
import { exportCardsCsv, parseCardsCsv } from '@/portability/csv'
import type { AppSettings, CharacterCard, Decision, LibraryId, StudySession } from '@/domain/types'

interface AppState {
  ready: boolean
  error: string | null
  cards: CharacterCard[]
  counts: Record<LibraryId, number>
  memberships: Map<LibraryId, Set<string>>
  sessions: StudySession[]
  settings: AppSettings
  refresh(): Promise<void>
  startSession(libraryId: LibraryId): Promise<string>
  markShown(sessionId: string): Promise<void>
  setDecision(sessionId: string, decision: Decision): Promise<void>
  advance(sessionId: string): Promise<StudySession>
  setTag(cardId: string, libraryId: LibraryId, enabled: boolean): Promise<void>
  addCharacters(characters: string[]): Promise<void>
  deleteCard(cardId: string): Promise<void>
  saveCard(card: CharacterCard): Promise<void>
  restoreCard(cardId: string): Promise<void>
  exportJson(): Promise<string>
  exportCsv(): string
  importJson(content: string): Promise<{ message: string }>
  importCsv(content: string): Promise<{ message: string }>
  resetRound(): Promise<void>
  updateSettings(changes: Partial<AppSettings>): Promise<void>
  eraseAll(): Promise<void>
}

const emptyCounts = { all: 0, unreviewed: 0, wrong: 0, 'new-1': 0, 'new-2': 0, 'new-3': 0, familiar: 0 }
const defaultSettings: AppSettings = { id: 'settings', continuousFlipListening: false, backupReminderDismissedAt: null, appVersion: 1, schemaVersion: 1 }
const Context = createContext<AppState | null>(null)

export function AppProviders({ children }: { children: ReactNode }) {
  const [db] = useState(() => new FlashCardDatabase())
  const [repository] = useState(() => new FlashCardRepository(db))
  const mounted = useRef(true)
  const [state, setState] = useState({ ready: false, error: null as string | null, cards: [] as CharacterCard[], counts: emptyCounts, memberships: new Map<LibraryId, Set<string>>(), sessions: [] as StudySession[], settings: defaultSettings })

  const refresh = useCallback(async () => {
    const [cards, counts, membershipRows, sessions, settings] = await Promise.all([
      db.cards.toArray(), repository.libraryCounts(), db.memberships.toArray(), db.sessions.toArray(), db.settings.get('settings'),
    ])
    const memberships = new Map<LibraryId, Set<string>>()
    for (const row of membershipRows) {
      const members = memberships.get(row.libraryId) ?? new Set<string>()
      members.add(row.characterId); memberships.set(row.libraryId, members)
    }
    if (mounted.current) setState({ ready: true, error: null, cards, counts, memberships, sessions, settings: settings ?? defaultSettings })
  }, [db, repository])

  useEffect(() => {
    mounted.current = true
    initializeDatabase(db, seed as CharacterCard[]).then(refresh).catch((error) => {
      if (mounted.current) setState((prior) => ({ ...prior, error: error instanceof Error ? error.message : 'Could not open the local database' }))
    })
    return () => { mounted.current = false }
  }, [db, refresh])

  const value = useMemo<AppState>(() => ({
    ...state,
    refresh,
    async startSession(libraryId) {
      const ids = await repository.libraryCardIds(libraryId)
      const eligible: string[] = []
      for (const id of ids) if ((await db.cards.get(id))?.contentStatus === 'complete') eligible.push(id)
      const session = createSession(libraryId, eligible, (values) => values.sort(() => Math.random() - .5), () => new Date().toISOString())
      await db.sessions.add(session); await refresh(); return session.id
    },
    async markShown(sessionId) {
      const session = await db.sessions.get(sessionId); if (!session) return
      const cardId = session.cardIds[session.currentIndex]; if (!cardId) return
      await db.transaction('rw', db.memberships, db.reviews, async () => {
        await db.memberships.delete(`unreviewed:${cardId}`)
        await db.reviews.update(cardId, { isUnreviewed: 0 })
      }); await refresh()
    },
    async setDecision(sessionId, decision) { await db.sessions.update(sessionId, { pendingDecision: decision }); await refresh() },
    async advance(sessionId) {
      const session = await db.sessions.get(sessionId); if (!session?.pendingDecision) throw new Error('Judge the card correct or incorrect first')
      const cardId = session.cardIds[session.currentIndex]
      const review = await db.reviews.get(cardId)
      const nextIndex = session.currentIndex + 1; const completed = nextIndex >= session.cardIds.length
      const next: StudySession = { ...session, currentIndex: nextIndex, pendingDecision: null, correctCount: session.correctCount + (session.pendingDecision === 'correct' ? 1 : 0), incorrectCount: session.incorrectCount + (session.pendingDecision === 'incorrect' ? 1 : 0), status: completed ? 'completed' : 'active', endedAt: completed ? new Date().toISOString() : null }
      await db.transaction('rw', db.sessions, db.reviews, db.memberships, db.summaries, async () => {
        await db.sessions.put(next)
        await db.reviews.put({ characterId: cardId, isUnreviewed: 0, reviewCount: (review?.reviewCount ?? 0) + 1, correctCount: (review?.correctCount ?? 0) + (session.pendingDecision === 'correct' ? 1 : 0), incorrectCount: (review?.incorrectCount ?? 0) + (session.pendingDecision === 'incorrect' ? 1 : 0), lastReviewedAt: new Date().toISOString() })
        if (session.pendingDecision === 'incorrect') await db.memberships.put({ id: `wrong:${cardId}`, libraryId: 'wrong', characterId: cardId }); else await db.memberships.delete(`wrong:${cardId}`)
        if (completed) await db.summaries.put({ id: session.id, sourceLibraryId: session.sourceLibraryId, startedAt: session.startedAt, endedAt: next.endedAt!, completedCount: next.cardIds.length, correctCount: next.correctCount, incorrectCount: next.incorrectCount, accuracy: next.correctCount / next.cardIds.length })
      }); await refresh(); return next
    },
    async setTag(cardId, libraryId, enabled) { await repository.setMembership(libraryId, cardId, enabled); await refresh() },
    async addCharacters(characters) {
      for (const character of characters) { const now = new Date().toISOString(); await repository.addCard({ id: `user-${crypto.randomUUID()}`, character, readings: [], englishMeaning: '', contentType: 'compounds', compounds: [], examples: [], contentStatus: 'needs_content', seedVersion: null, userEditedFields: [], createdAt: now, updatedAt: now }) }
      await refresh()
    },
    async deleteCard(cardId) { await repository.deleteCard(cardId); await refresh() },
    async saveCard(card) {
      const conflict = await db.cards.where('character').equals(card.character).first()
      if (conflict && conflict.id !== card.id) throw new Error(`“${card.character}” already exists`)
      await db.cards.put(card); await refresh()
    },
    async restoreCard(cardId) {
      const original = (seed as CharacterCard[]).find((card) => card.id === cardId)
      if (!original) throw new Error('Only built-in cards can be restored')
      await db.cards.put(structuredClone(original)); await refresh()
    },
    async exportJson() { return JSON.stringify(exportBackup(await snapshotDatabase(db)), null, 2) },
    exportCsv() { return exportCardsCsv(state.cards) },
    async importJson(content) {
      const preview = previewBackup(content)
      if (!preview.valid) throw new Error(preview.error)
      const accepted = window.confirm(`This restores ${preview.counts.cards} cards, ${preview.counts.memberships} library links, and ${preview.counts.reviews} statistics rows. Your current data will be overwritten. Continue?`)
      if (!accepted) return { message: 'Import cancelled; nothing changed.' }
      await commitBackup(db, preview.backup); await refresh(); return { message: 'Full JSON backup restored.' }
    },
    async importCsv(content) {
      const result = parseCardsCsv(content)
      if (result.errors.length) throw new Error(result.errors.join('\n'))
      await db.transaction('rw', db.cards, db.memberships, db.reviews, async () => {
        for (const incoming of result.cards) {
          const current = await db.cards.where('character').equals(incoming.character).first()
          if (current) await db.cards.put({ ...incoming, id: current.id, seedVersion: current.seedVersion, createdAt: current.createdAt })
          else {
            await db.cards.add(incoming)
            await db.memberships.bulkAdd([{ id: `all:${incoming.id}`, libraryId: 'all', characterId: incoming.id }, { id: `unreviewed:${incoming.id}`, libraryId: 'unreviewed', characterId: incoming.id }])
            await db.reviews.add({ characterId: incoming.id, isUnreviewed: 1, reviewCount: 0, correctCount: 0, incorrectCount: 0, lastReviewedAt: null })
          }
        }
      }); await refresh(); return { message: `Imported content for ${result.cards.length} cards.` }
    },
    async resetRound() {
      const ids = await repository.libraryCardIds('all')
      await db.transaction('rw', db.memberships, db.reviews, async () => { for (const id of ids) { await db.memberships.put({ id: `unreviewed:${id}`, libraryId: 'unreviewed', characterId: id }); await db.reviews.update(id, { isUnreviewed: 1 }) } })
      await refresh()
    },
    async updateSettings(changes) { await db.settings.update('settings', changes); await refresh() },
    async eraseAll() { db.close(); await db.delete(); await initializeDatabase(db, seed as CharacterCard[]); await refresh() },
  }), [state, refresh, db, repository])

  return <Context.Provider value={value}>{children}</Context.Provider>
}

export function useAppData() {
  const value = useContext(Context)
  if (!value) throw new Error('useAppData must be used inside AppProviders')
  return value
}

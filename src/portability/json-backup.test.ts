import { expect, it } from 'vitest'
import { exportBackup, previewBackup } from './json-backup'
import seed from '@/content/ap-1000.json'
import type { BackupV1 } from './backup-schema'

const snapshot = {
  cards: [{ ...seed[0], id: 'a', character: '学' }],
  memberships: [{ id: 'all:a', libraryId: 'all', characterId: 'a' }],
  reviews: [{ characterId: 'a', isUnreviewed: 1, reviewCount: 1, correctCount: 1, incorrectCount: 0, lastReviewedAt: 'now' }],
  sessions: [], summaries: [],
  settings: [{ id: 'settings', continuousFlipListening: false, backupReminderDismissedAt: null, appVersion: 1, schemaVersion: 1 }],
  metadata: [{ key: 'seedVersion', value: 1 }],
} as unknown as BackupV1['data']

it('round-trips every local data collection', () => {
  const backup = exportBackup(snapshot)
  expect(previewBackup(JSON.stringify(backup))).toMatchObject({ valid: true, counts: { cards: 1, memberships: 1, reviews: 1 } })
  expect(backup.data).toEqual(snapshot)
})

it('rejects invalid and oversized backups before writing', () => {
  expect(previewBackup('{bad')).toMatchObject({ valid: false })
  expect(previewBackup('x'.repeat(5_000_001))).toMatchObject({ valid: false, error: expect.stringMatching(/too large/i) })
})

it('validates nested records before an import can be committed', () => {
  const valid = exportBackup(snapshot)
  const malformed = { ...valid, data: { ...valid.data, cards: [{ id: 'missing-fields' }] } }
  expect(previewBackup(JSON.stringify(malformed))).toMatchObject({ valid: false })
})

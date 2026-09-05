import { z } from 'zod'

const libraryId = z.enum(['all', 'unreviewed', 'wrong', 'new-1', 'new-2', 'new-3', 'familiar'])
const item = z.object({ text: z.string(), pinyin: z.string(), english: z.string() })
const card = z.object({
  id: z.string().min(1), character: z.string().regex(/^\p{Script=Han}$/u),
  readings: z.array(z.object({ pinyin: z.string(), meaning: z.string(), acceptedForms: z.array(z.string()) })),
  englishMeaning: z.string(), contentType: z.enum(['compounds', 'examples']), compounds: z.array(item).max(6), examples: z.array(item).max(2),
  contentStatus: z.enum(['complete', 'needs_content']), seedVersion: z.number().int().positive().nullable(), userEditedFields: z.array(z.string()), createdAt: z.string(), updatedAt: z.string(),
})
const membership = z.object({ id: z.string(), libraryId, characterId: z.string() })
const review = z.object({ characterId: z.string(), isUnreviewed: z.union([z.literal(0), z.literal(1)]), reviewCount: z.number().int().nonnegative(), correctCount: z.number().int().nonnegative(), incorrectCount: z.number().int().nonnegative(), lastReviewedAt: z.string().nullable() })
const session = z.object({ id: z.string(), sourceLibraryId: libraryId, cardIds: z.array(z.string()), currentIndex: z.number().int().nonnegative(), pendingDecision: z.enum(['correct', 'incorrect']).nullable(), correctCount: z.number().int().nonnegative(), incorrectCount: z.number().int().nonnegative(), startedAt: z.string(), endedAt: z.string().nullable(), status: z.enum(['active', 'completed', 'ended']) })
const summary = z.object({ id: z.string(), sourceLibraryId: libraryId, startedAt: z.string(), endedAt: z.string(), completedCount: z.number().int().nonnegative(), correctCount: z.number().int().nonnegative(), incorrectCount: z.number().int().nonnegative(), accuracy: z.number().min(0).max(1) })
const settings = z.object({ id: z.literal('settings'), continuousFlipListening: z.boolean(), backupReminderDismissedAt: z.string().nullable(), appVersion: z.number().int().positive(), schemaVersion: z.number().int().positive() })
const metadata = z.object({ key: z.string(), value: z.union([z.string(), z.number()]) })

export const backupSchema = z.object({
  schemaVersion: z.literal(1),
  exportedAt: z.string().min(1),
  data: z.object({
    cards: z.array(card),
    memberships: z.array(membership),
    reviews: z.array(review),
    sessions: z.array(session),
    summaries: z.array(summary),
    settings: z.array(settings),
    metadata: z.array(metadata),
  }),
})

export type BackupV1 = z.infer<typeof backupSchema>

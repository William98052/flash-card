import { z } from 'zod'

export const backupSchema = z.object({
  schemaVersion: z.literal(1),
  exportedAt: z.string().min(1),
  data: z.object({
    cards: z.array(z.record(z.string(), z.unknown())),
    memberships: z.array(z.record(z.string(), z.unknown())),
    reviews: z.array(z.record(z.string(), z.unknown())),
    sessions: z.array(z.record(z.string(), z.unknown())),
    summaries: z.array(z.record(z.string(), z.unknown())),
    settings: z.array(z.record(z.string(), z.unknown())),
    metadata: z.array(z.record(z.string(), z.unknown())),
  }),
})

export type BackupV1 = z.infer<typeof backupSchema>

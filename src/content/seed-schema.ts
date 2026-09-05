import { z } from 'zod'

const learningItem = z.object({ text: z.string().min(1), pinyin: z.string().min(1), english: z.string().min(1) })

export const characterCardSchema = z.object({
  id: z.string().regex(/^seed-\d{4}$/),
  character: z.string().regex(/^\p{Script=Han}$/u),
  readings: z.array(z.object({ pinyin: z.string().min(1), meaning: z.string().min(1), acceptedForms: z.array(z.string()) })).min(1),
  englishMeaning: z.string().min(1),
  contentType: z.enum(['compounds', 'examples']),
  compounds: z.array(learningItem),
  examples: z.array(learningItem),
  contentStatus: z.literal('complete'),
  seedVersion: z.number().int().positive(),
  userEditedFields: z.array(z.string()).length(0),
  createdAt: z.string().min(1),
  updatedAt: z.string().min(1),
})

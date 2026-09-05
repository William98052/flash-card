import type { Example } from '@/domain/types'

const examples: Record<string, Example[]> = {
  喔: [
    { text: '喔，我明白了。', pinyin: 'ō，wǒ míng bái le。', english: 'Oh, I understand now.' },
    { text: '记得带课本喔！', pinyin: 'jì dé dài kè běn ō！', english: 'Remember to bring your textbook!' },
  ],
}

export function fallbackExamples(character: string): Example[] {
  const result = examples[character]
  if (!result) throw new Error(`No reviewed fallback examples exist for ${character}`)
  return result.map((example) => ({ ...example }))
}

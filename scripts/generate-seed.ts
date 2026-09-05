import { writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import cedict from 'cedict-json'
import frequency from 'subtlex-ch-chr'
import { pinyin } from 'pinyin-pro'
import { validateSeed } from '../src/content/validate-seed'
import { fallbackExamples } from '../src/content/seed-fallbacks'
import { cleanDefinition } from '../src/content/seed-content'
import type { CharacterCard } from '../src/domain/types'

type CedictEntry = { simplified: string; traditional: string; pinyin: string; english: string[] }

const wordsByCharacter = new Map<string, CedictEntry[]>()
for (const entry of cedict as CedictEntry[]) {
  if (!/^\p{Script=Han}{2,4}$/u.test(entry.simplified)) continue
  for (const character of new Set(entry.simplified)) {
    const values = wordsByCharacter.get(character) ?? []
    values.push(entry)
    wordsByCharacter.set(character, values)
  }
}

const exactByCharacter = new Map<string, CedictEntry[]>()
for (const entry of cedict as CedictEntry[]) {
  if (/^\p{Script=Han}$/u.test(entry.simplified)) {
    const values = exactByCharacter.get(entry.simplified) ?? []
    values.push(entry)
    exactByCharacter.set(entry.simplified, values)
  }
}

const characters = frequency.data
  .map((row) => row.Character)
  .filter((character, index, all) => /^\p{Script=Han}$/u.test(character) && all.indexOf(character) === index)
  .slice(0, 1000)

const timestamp = '2026-09-05T00:00:00.000Z'
const cards: CharacterCard[] = characters.map((character, index) => {
  const entries = exactByCharacter.get(character) ?? []
  const primary = entries.find((entry) => entry.english.some((value) => !/^surname/i.test(value))) ?? entries[0]
  const readingCandidates = [...new Set(entries.slice(0, 3).map((entry) => pinyin(character, { toneType: 'symbol', type: 'array' })[0]))]
  const primaryPinyin = readingCandidates[0] ?? pinyin(character, { toneType: 'symbol', type: 'array' })[0]
  const words = (wordsByCharacter.get(character) ?? [])
    .filter((entry) => !/^[·〇]/u.test(entry.simplified) && entry.english.length > 0)
    .sort((a, b) => a.simplified.length - b.simplified.length || a.english[0].length - b.english[0].length)
    .filter((entry, entryIndex, all) => all.findIndex((candidate) => candidate.simplified === entry.simplified) === entryIndex)
    .slice(0, 3)

  const meaning = cleanDefinition(primary?.english ?? words[0].english)
  const examples = words.length === 0 ? fallbackExamples(character) : []
  return {
    id: `seed-${String(index + 1).padStart(4, '0')}`,
    character,
    readings: [{
      pinyin: primaryPinyin,
      meaning,
      acceptedForms: [character, primaryPinyin.normalize('NFD').replace(/\p{Diacritic}/gu, '').replace(/ü/g, 'v').toLowerCase()],
    }],
    englishMeaning: meaning,
    contentType: words.length > 0 ? 'compounds' : 'examples',
    compounds: words.map((entry) => ({
      text: entry.simplified,
      pinyin: pinyin(entry.simplified, { toneType: 'symbol' }),
      english: cleanDefinition(entry.english),
    })),
    examples,
    contentStatus: 'complete',
    seedVersion: 1,
    userEditedFields: [],
    createdAt: timestamp,
    updatedAt: timestamp,
  }
})

validateSeed(cards)
const destination = fileURLToPath(new URL('../src/content/ap-1000.json', import.meta.url))
await writeFile(destination, `${JSON.stringify(cards, null, 2)}\n`)
console.log(`Generated ${cards.length} complete cards at ${destination}`)

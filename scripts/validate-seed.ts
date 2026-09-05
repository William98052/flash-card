import { readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { validateSeed } from '../src/content/validate-seed'

const source = fileURLToPath(new URL('../src/content/ap-1000.json', import.meta.url))
const cards = validateSeed(JSON.parse(await readFile(source, 'utf8')))
console.log(`Validated ${cards.length} unique, complete AP Chinese study cards.`)

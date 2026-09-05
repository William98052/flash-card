import { useState } from 'react'
import type { CharacterCard, Compound } from '@/domain/types'

interface Props { card: CharacterCard; existingCharacters: Set<string>; onSave(card: CharacterCard): void; onCancel(): void; onRestore(): void }

export function CardEditor({ card, existingCharacters, onSave, onCancel, onRestore }: Props) {
  const [character, setCharacter] = useState(card.character)
  const [pinyin, setPinyin] = useState(card.readings.map((reading) => reading.pinyin).join(' | '))
  const [meaning, setMeaning] = useState(card.englishMeaning)
  const [compounds, setCompounds] = useState(card.compounds.map((item) => `${item.text} | ${item.pinyin} | ${item.english}`).join('\n'))
  const [error, setError] = useState('')

  const save = () => {
    if (!/^\p{Script=Han}$/u.test(character)) { setError('Enter exactly one Chinese character.'); return }
    if (character !== card.character && existingCharacters.has(character)) { setError(`“${character}” already exists; edit that card instead.`); return }
    const parsedCompounds = compounds.split('\n').filter(Boolean).map((line): Compound => { const [text = '', itemPinyin = '', english = ''] = line.split('|').map((value) => value.trim()); return { text, pinyin: itemPinyin, english } })
    const edited = [...card.userEditedFields]
    if (character !== card.character) edited.push('character')
    if (pinyin !== card.readings.map((reading) => reading.pinyin).join(' | ')) edited.push('readings')
    if (meaning !== card.englishMeaning) edited.push('englishMeaning')
    if (compounds !== card.compounds.map((item) => `${item.text} | ${item.pinyin} | ${item.english}`).join('\n')) edited.push('compounds')
    const complete = Boolean(pinyin.trim() && meaning.trim() && parsedCompounds.length && parsedCompounds.every((item) => item.text && item.pinyin && item.english))
    onSave({ ...card, character, readings: pinyin.split('|').filter(Boolean).map((value) => ({ pinyin: value.trim(), meaning: meaning.trim(), acceptedForms: [] })), englishMeaning: meaning.trim(), contentType: 'compounds', compounds: parsedCompounds, examples: [], contentStatus: complete ? 'complete' : 'needs_content', userEditedFields: [...new Set(edited)], updatedAt: new Date().toISOString() })
  }

  return <div role="dialog" aria-modal="true" aria-labelledby="editor-title" className="dialog card-editor"><h2 id="editor-title">Edit card</h2>{error && <p role="alert" className="form-error">{error}</p>}<label>Character<input aria-label="Character" value={character} onChange={(event) => setCharacter(event.target.value)} /></label><label>Pinyin (separate polyphonic readings with |)<input aria-label="Pinyin" value={pinyin} onChange={(event) => setPinyin(event.target.value)} /></label><label>English meaning<input aria-label="English meaning" value={meaning} onChange={(event) => setMeaning(event.target.value)} /></label><label>Compounds (one per line: word | pinyin | English)<textarea aria-label="Compounds" rows={6} value={compounds} onChange={(event) => setCompounds(event.target.value)} /></label><div className="button-row"><button onClick={onCancel}>Cancel</button>{card.seedVersion && <button onClick={onRestore}>Restore built-in content</button>}<button className="primary-button" onClick={save}>Save changes</button></div></div>
}

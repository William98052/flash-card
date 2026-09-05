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
    if (!/^\p{Script=Han}$/u.test(character)) { setError('请输入一个汉字。'); return }
    if (character !== card.character && existingCharacters.has(character)) { setError(`“${character}”已经存在，请编辑现有字卡。`); return }
    const parsedCompounds = compounds.split('\n').filter(Boolean).map((line): Compound => { const [text = '', itemPinyin = '', english = ''] = line.split('|').map((value) => value.trim()); return { text, pinyin: itemPinyin, english } })
    const edited = [...card.userEditedFields]
    if (character !== card.character) edited.push('character')
    if (pinyin !== card.readings.map((reading) => reading.pinyin).join(' | ')) edited.push('readings')
    if (meaning !== card.englishMeaning) edited.push('englishMeaning')
    if (compounds !== card.compounds.map((item) => `${item.text} | ${item.pinyin} | ${item.english}`).join('\n')) edited.push('compounds')
    const complete = Boolean(pinyin.trim() && meaning.trim() && parsedCompounds.length && parsedCompounds.every((item) => item.text && item.pinyin && item.english))
    onSave({ ...card, character, readings: pinyin.split('|').filter(Boolean).map((value) => ({ pinyin: value.trim(), meaning: meaning.trim(), acceptedForms: [] })), englishMeaning: meaning.trim(), contentType: 'compounds', compounds: parsedCompounds, examples: [], contentStatus: complete ? 'complete' : 'needs_content', userEditedFields: [...new Set(edited)], updatedAt: new Date().toISOString() })
  }

  return <div role="dialog" aria-modal="true" aria-labelledby="editor-title" className="dialog card-editor"><h2 id="editor-title">编辑字卡</h2>{error && <p role="alert" className="form-error">{error}</p>}<label>汉字<input aria-label="汉字" value={character} onChange={(event) => setCharacter(event.target.value)} /></label><label>拼音（多音用 | 分隔）<input aria-label="拼音" value={pinyin} onChange={(event) => setPinyin(event.target.value)} /></label><label>英文释义<input aria-label="英文释义" value={meaning} onChange={(event) => setMeaning(event.target.value)} /></label><label>词组（每行：词组 | 拼音 | 英文）<textarea aria-label="词组" rows={6} value={compounds} onChange={(event) => setCompounds(event.target.value)} /></label><div className="button-row"><button onClick={onCancel}>取消</button>{card.seedVersion && <button onClick={onRestore}>恢复内置内容</button>}<button className="primary-button" onClick={save}>保存修改</button></div></div>
}

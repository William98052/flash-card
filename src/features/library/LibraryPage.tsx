import { useMemo, useState } from 'react'
import { extractUniqueHan } from '@/domain/character-extraction'
import { LIBRARIES, USER_TAG_LIBRARIES } from '@/domain/libraries'
import type { CharacterCard, LibraryId } from '@/domain/types'
import { CardEditor } from './CardEditor'
import { ImportExportPanel } from './ImportExportPanel'

interface Props {
  cards: CharacterCard[]
  memberships: Map<LibraryId, Set<string>>
  onAdd(characters: string[]): void
  onDelete(cardId: string): void
  onTag(cardId: string, libraryId: LibraryId, enabled: boolean): void
  onSave?(card: CharacterCard): void
  onRestore?(cardId: string): void
  transfer?: { onExportJson(): Promise<string>; onExportCsv(): string; onImportJson(content: string): Promise<{ message: string }>; onImportCsv(content: string): Promise<{ message: string }> }
}

export function LibraryPage({ cards, memberships, onAdd, onDelete, onTag, onSave, onRestore, transfer }: Props) {
  const [query, setQuery] = useState('')
  const [adding, setAdding] = useState(false)
  const [input, setInput] = useState('')
  const [editing, setEditing] = useState<CharacterCard | null>(null)
  const [filter, setFilter] = useState<LibraryId | 'all-cards'>('all-cards')
  const [selected, setSelected] = useState(new Set<string>())
  const [batchLibrary, setBatchLibrary] = useState<LibraryId>('new-1')
  const existing = useMemo(() => new Set(cards.map((card) => card.character)), [cards])
  const preview = useMemo(() => extractUniqueHan(input, existing), [input, existing])
  const filtered = cards.filter((card) => (filter === 'all-cards' || memberships.get(filter)?.has(card.id)) && `${card.character} ${card.englishMeaning} ${card.readings.map((reading) => reading.pinyin).join(' ')}`.toLowerCase().includes(query.toLowerCase()))
  const toggleSelected = (id: string, enabled: boolean) => setSelected((prior) => { const next = new Set(prior); if (enabled) next.add(id); else next.delete(id); return next })
  const applyBatch = (enabled: boolean) => { for (const id of selected) onTag(id, batchLibrary, enabled); setSelected(new Set()) }
  return <div className="stack-lg">
    <header className="section-heading"><p className="eyebrow">Card management</p><h2>All your characters</h2><p>Search, fill in content, or organize cards into libraries.</p></header>
    <div className="toolbar"><input type="search" aria-label="Search by character, pinyin, or English" placeholder="Search by character, pinyin, or English…" value={query} onChange={(event) => setQuery(event.target.value)} /><select aria-label="Filter by library" value={filter} onChange={(event) => setFilter(event.target.value as LibraryId | 'all-cards')}><option value="all-cards">All cards</option>{LIBRARIES.map((library) => <option key={library.id} value={library.id}>{library.name}</option>)}</select><button className="primary-button" onClick={() => setAdding(true)}>＋ Add characters</button></div>
    {selected.size > 0 && <div className="batch-bar" aria-live="polite"><strong>{selected.size} selected</strong><select aria-label="Bulk library" value={batchLibrary} onChange={(event) => setBatchLibrary(event.target.value as LibraryId)}>{USER_TAG_LIBRARIES.map((id) => <option value={id} key={id}>{LIBRARIES.find((library) => library.id === id)?.name}</option>)}</select><button onClick={() => applyBatch(true)}>Add selected</button><button onClick={() => applyBatch(false)}>Remove selected</button></div>}
    {adding && <section className="editor-panel" aria-label="Add characters">
      <label htmlFor="han-input">Paste text</label><textarea id="han-input" rows={4} value={input} onChange={(event) => setInput(event.target.value)} placeholder="Paste one or more lines of text" />
      <div className="preview-stats"><span>To add {preview.toAdd.length}</span><span>Already there {preview.existing.length}</span><span>Ignored {preview.ignoredCount}</span></div>
      <div className="character-preview">{preview.toAdd.join(' ') || 'No new characters yet'}</div>
      <div className="button-row"><button onClick={() => setAdding(false)}>Cancel</button><button className="primary-button" disabled={!preview.toAdd.length} onClick={() => { onAdd(preview.toAdd); setInput(''); setAdding(false) }}>Add them</button></div>
    </section>}
    <div className="card-table" role="list">{filtered.map((card) => <article key={card.id} className="manage-card" role="listitem"><input type="checkbox" aria-label={`Select ${card.character}`} checked={selected.has(card.id)} onChange={(event) => toggleSelected(card.id, event.target.checked)} /><span className="manage-character">{card.character}</span><div><strong>{card.readings.map((reading) => reading.pinyin).join(' · ') || 'Needs content'}</strong><p>{card.englishMeaning || 'Add pinyin, a meaning, and study content before reviewing this card.'}</p></div><span className={`status ${card.contentStatus}`}>{card.contentStatus === 'complete' ? 'Complete' : 'Needs content'}</span><div className="button-row"><button onClick={() => setEditing(card)}>Edit</button><button onClick={() => { if (confirm(`Delete “${card.character}”?`)) onDelete(card.id) }}>Delete</button></div></article>)}</div>
    {transfer && <ImportExportPanel {...transfer} />}
    {editing && <div className="modal-backdrop"><CardEditor card={editing} existingCharacters={existing} onCancel={() => setEditing(null)} onSave={(card) => { onSave?.(card); setEditing(null) }} onRestore={() => { if (confirm('Restoring built-in content overwrites your edits to this card. Continue?')) { onRestore?.(editing.id); setEditing(null) } }} /></div>}
  </div>
}

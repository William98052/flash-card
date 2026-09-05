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
    <header className="section-heading"><p className="eyebrow">字卡管理</p><h2>你的全部汉字</h2><p>搜索、补充内容，或整理到多个字库。</p></header>
    <div className="toolbar"><input type="search" aria-label="搜索汉字、拼音或英文" placeholder="搜索汉字、拼音或英文…" value={query} onChange={(event) => setQuery(event.target.value)} /><select aria-label="按字库筛选" value={filter} onChange={(event) => setFilter(event.target.value as LibraryId | 'all-cards')}><option value="all-cards">全部字卡</option>{LIBRARIES.map((library) => <option key={library.id} value={library.id}>{library.name}</option>)}</select><button className="primary-button" onClick={() => setAdding(true)}>＋ 添加汉字</button></div>
    {selected.size > 0 && <div className="batch-bar" aria-live="polite"><strong>已选择 {selected.size} 张</strong><select aria-label="批量字库" value={batchLibrary} onChange={(event) => setBatchLibrary(event.target.value as LibraryId)}>{USER_TAG_LIBRARIES.map((id) => <option value={id} key={id}>{LIBRARIES.find((library) => library.id === id)?.name}</option>)}</select><button onClick={() => applyBatch(true)}>批量加入</button><button onClick={() => applyBatch(false)}>批量移除</button></div>}
    {adding && <section className="editor-panel" aria-label="添加汉字">
      <label htmlFor="han-input">粘贴文本</label><textarea id="han-input" rows={4} value={input} onChange={(event) => setInput(event.target.value)} placeholder="可粘贴一行或多行文本" />
      <div className="preview-stats"><span>将添加 {preview.toAdd.length}</span><span>已存在 {preview.existing.length}</span><span>忽略 {preview.ignoredCount}</span></div>
      <div className="character-preview">{preview.toAdd.join(' ') || '暂无可添加汉字'}</div>
      <div className="button-row"><button onClick={() => setAdding(false)}>取消</button><button className="primary-button" disabled={!preview.toAdd.length} onClick={() => { onAdd(preview.toAdd); setInput(''); setAdding(false) }}>确认添加</button></div>
    </section>}
    <div className="card-table" role="list">{filtered.map((card) => <article key={card.id} className="manage-card" role="listitem"><input type="checkbox" aria-label={`选择 ${card.character}`} checked={selected.has(card.id)} onChange={(event) => toggleSelected(card.id, event.target.checked)} /><span className="manage-character">{card.character}</span><div><strong>{card.readings.map((reading) => reading.pinyin).join(' · ') || '内容待完善'}</strong><p>{card.englishMeaning || '请添加拼音、释义和学习内容后再复习。'}</p></div><span className={`status ${card.contentStatus}`}>{card.contentStatus === 'complete' ? '内容完整' : '内容待完善'}</span><div className="button-row"><button onClick={() => setEditing(card)}>编辑</button><button onClick={() => { if (confirm(`确定删除“${card.character}”吗？`)) onDelete(card.id) }}>删除</button></div></article>)}</div>
    {transfer && <ImportExportPanel {...transfer} />}
    {editing && <div className="modal-backdrop"><CardEditor card={editing} existingCharacters={existing} onCancel={() => setEditing(null)} onSave={(card) => { onSave?.(card); setEditing(null) }} onRestore={() => { if (confirm('恢复内置内容会覆盖这张字卡的用户修改。继续吗？')) { onRestore?.(editing.id); setEditing(null) } }} /></div>}
  </div>
}

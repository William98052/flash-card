import { useState, type FormEvent } from 'react'
import { LIBRARIES } from '@/domain/libraries'
import type { CharacterCard, LibraryId } from '@/domain/types'

interface Props {
  counts: Record<LibraryId, number>
  cards: CharacterCard[]
  activeSessionId?: string | null
  onStart(libraryId: LibraryId): void
  onOpenCard(cardId: string): void
}

export function HomePage({ counts, cards, activeSessionId, onStart, onOpenCard }: Props) {
  const [query, setQuery] = useState('')
  const [searchError, setSearchError] = useState('')
  const reviewed = Math.max(0, counts.all - counts.unreviewed)
  const submitSearch = (event: FormEvent) => {
    event.preventDefault()
    const character = query.trim()
    const match = cards.find((card) => card.contentStatus === 'complete' && card.character === character)
    if (match) {
      setSearchError('')
      onOpenCard(match.id)
      return
    }
    setSearchError(`No flash card found for “${character}”.`)
  }
  return (
    <div className="stack-lg">
      <section className="hero-panel">
        <div>
          <p className="eyebrow">Today’s progress</p>
          <h2>Pick a library and start drilling.</h2>
          <p>Reviewed {reviewed} characters this round</p>
        </div>
        <div className="progress-number" aria-label="Unreviewed progress"><strong>{counts.unreviewed} / {counts.all}</strong><span>not reviewed yet</span></div>
      </section>
      {activeSessionId && <a className="primary-link" href={`/study/${activeSessionId}`}>Resume last session →</a>}
      <form className="character-search" role="search" onSubmit={submitSearch}>
        <label htmlFor="character-search">Search a character</label>
        <div>
          <input id="character-search" value={query} onChange={(event) => { setQuery(event.target.value); setSearchError('') }} autoComplete="off" />
          <button type="submit">Study</button>
        </div>
        {searchError && <p role="alert">{searchError}</p>}
      </form>
      <section aria-labelledby="libraries-title">
        <div className="section-heading"><p className="eyebrow">Seven libraries</p><h2 id="libraries-title">What do you want to practice?</h2></div>
        <div className="library-grid">
          {LIBRARIES.map((library, index) => (
            <article className="library-card" key={library.id}>
              <span className="library-index">0{index + 1}</span>
              <h3>{library.name}</h3>
              <p>{library.description}</p>
              <div className="library-card-footer"><strong>{counts[library.id]} cards</strong><button disabled={counts[library.id] === 0} onClick={() => onStart(library.id)} aria-label={`Start ${library.name}`}>Start</button></div>
            </article>
          ))}
        </div>
      </section>
    </div>
  )
}

import { LIBRARIES } from '@/domain/libraries'
import type { LibraryId } from '@/domain/types'

interface Props {
  counts: Record<LibraryId, number>
  activeSessionId?: string | null
  onStart(libraryId: LibraryId): void
}

export function HomePage({ counts, activeSessionId, onStart }: Props) {
  const reviewed = Math.max(0, counts.all - counts.unreviewed)
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

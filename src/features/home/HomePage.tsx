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
          <p className="eyebrow">今日进度</p>
          <h2>选一个字库，开始闪练。</h2>
          <p>当前大轮次已复习 {reviewed} 个字</p>
        </div>
        <div className="progress-number" aria-label="未复习进度"><strong>{counts.unreviewed} / {counts.all}</strong><span>尚未复习</span></div>
      </section>
      {activeSessionId && <a className="primary-link" href={`/study/${activeSessionId}`}>继续上次学习 →</a>}
      <section aria-labelledby="libraries-title">
        <div className="section-heading"><p className="eyebrow">七个字库</p><h2 id="libraries-title">今天想练什么？</h2></div>
        <div className="library-grid">
          {LIBRARIES.map((library, index) => (
            <article className="library-card" key={library.id}>
              <span className="library-index">0{index + 1}</span>
              <h3>{library.name}</h3>
              <p>{library.description}</p>
              <div className="library-card-footer"><strong>{counts[library.id]} 字</strong><button disabled={counts[library.id] === 0} onClick={() => onStart(library.id)} aria-label={`${library.name} 开始`}>开始</button></div>
            </article>
          ))}
        </div>
      </section>
    </div>
  )
}

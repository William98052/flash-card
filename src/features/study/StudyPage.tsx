import { useEffect, useState } from 'react'
import type { CharacterCard, Decision, LibraryId, StudySession } from '@/domain/types'

interface Props {
  card: CharacterCard
  session: StudySession
  speechAvailable: boolean
  transcript?: string
  assessmentReason?: string
  speechStatus?: string
  voiceFlipToken?: number
  toneStatus?: 'idle' | 'recording' | 'analyzing'
  toneResult?: { status: 'match' | 'mismatch' | 'unclear'; message: string }
  onSpeak?(): void
  onSpeakText?(text: string): void
  onCheckTone?(): void
  onDecision(decision: Decision): void
  onNext(): void
  onTag(libraryId: LibraryId, enabled: boolean): void
  onListen?(): void
}

export function StudyPage({ card, session, speechAvailable, transcript, assessmentReason, speechStatus, voiceFlipToken = 0, toneStatus = 'idle', toneResult, onSpeak, onSpeakText, onCheckTone, onDecision, onNext, onTag, onListen }: Props) {
  const [flipped, setFlipped] = useState(false)
  const [decision, setDecision] = useState<Decision | null>(session.pendingDecision)
  useEffect(() => { setFlipped(false); setDecision(session.pendingDecision) }, [card.id])
  useEffect(() => {
    // A matching pronunciation settles the card without a click; show the answer
    // alongside the verdict so it is never marked behind a hidden card.
    if (!session.pendingDecision) return
    setDecision(session.pendingDecision)
    setFlipped(true)
  }, [session.pendingDecision])
  useEffect(() => { if (voiceFlipToken > 0) setFlipped(true) }, [voiceFlipToken])
  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null
      if (event.code === 'Space' && !flipped && !['INPUT', 'TEXTAREA', 'SELECT', 'BUTTON'].includes(target?.tagName ?? '')) {
        event.preventDefault(); setFlipped(true)
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [flipped])
  const choose = (value: Decision) => { setDecision(value); onDecision(value) }
  const progress = Math.min(session.currentIndex + 1, session.cardIds.length)

  return (
    <div className="study-layout">
      <header className="study-meta"><a href="/">← Home</a><strong>{progress} / {session.cardIds.length}</strong><span>Correct this round {session.correctCount}</span></header>
      {/* Once flipped the card is no longer a button: its rows contain their own
          buttons for reading each phrase, and buttons cannot nest. */}
      {!flipped ? (
        <button className="flash-card" aria-label="Flip card" onClick={() => setFlipped(true)}>
          <span className="character-face">{card.character}</span>
        </button>
      ) : (
        <div className="flash-card is-flipped" aria-label="Card back">
          <span className="card-back">
            <span className="card-character-small">{card.character}</span>
            <strong className="pinyin">{card.readings.map((reading) => reading.pinyin).join(' · ')}</strong>
            <span className="meaning">{card.englishMeaning}</span>
            <span className="content-list">
              {(card.contentType === 'compounds' ? card.compounds : card.examples).map((item) => (
                <span className="content-item" key={item.text}>
                  <b>{item.text}</b>
                  <button type="button" className="pinyin-button" aria-label={`Read ${item.text}`} onClick={() => onSpeakText?.(item.text)}>{item.pinyin}</button>
                  <small>{item.english}</small>
                </span>
              ))}
            </span>
          </span>
        </div>
      )}
      <p className="flip-hint">{flipped ? 'Check the answer, then judge yourself' : 'Click the card, press Space, or say “翻”'}</p>
      {!speechAvailable ? <p className="notice">Speech input is unavailable in this browser; you can still study manually.</p> : <button className="secondary-button" onClick={onListen}>{speechStatus === 'listening' ? 'Listening…' : 'Speak and check'}</button>}
      {speechAvailable && <p className="speech-tip">Tip: say it twice, e.g. “bì bì”. Chrome often returns nothing for a single short syllable.</p>}
      <div className="practice-row">
        <button className="secondary-button" onClick={onSpeak}>🔊 Hear it</button>
        <button className="secondary-button" onClick={onCheckTone} disabled={toneStatus !== 'idle'}>
          {toneStatus === 'recording' ? '● Recording…' : toneStatus === 'analyzing' ? 'Checking…' : '♪ Check my tone'}
        </button>
      </div>
      {(transcript || assessmentReason) && <div className="speech-result" aria-live="polite"><b>Heard: {transcript || 'nothing'}</b><span>{assessmentReason}</span></div>}
      {toneResult && <div className={`tone-result ${toneResult.status}`} aria-live="polite">{toneResult.message}</div>}
      {flipped && <>
        <div className="decision-row" aria-label="Your judgment">
          <button aria-pressed={decision === 'incorrect'} className={decision === 'incorrect' ? 'selected wrong' : ''} onClick={() => choose('incorrect')}>✕ Incorrect</button>
          <button aria-pressed={decision === 'correct'} className={decision === 'correct' ? 'selected correct' : ''} onClick={() => choose('correct')}>✓ Correct</button>
        </div>
        <fieldset className="tag-row"><legend>Add to a library</legend>{(['wrong', 'new-1', 'new-2', 'new-3', 'familiar'] as LibraryId[]).map((id) => <label key={id}><input type="checkbox" onChange={(event) => onTag(id, event.target.checked)} />{id === 'familiar' ? 'Familiar' : id === 'wrong' ? 'Missed' : `New ${id.at(-1)}`}</label>)}</fieldset>
        <button className="next-button" disabled={!decision} onClick={onNext}>Next →</button>
      </>}
    </div>
  )
}

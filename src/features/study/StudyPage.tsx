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
  onDecision(decision: Decision): void
  onNext(): void
  onTag(libraryId: LibraryId, enabled: boolean): void
  onListen?(): void
}

export function StudyPage({ card, session, speechAvailable, transcript, assessmentReason, speechStatus, voiceFlipToken = 0, onDecision, onNext, onTag, onListen }: Props) {
  const [flipped, setFlipped] = useState(false)
  const [decision, setDecision] = useState<Decision | null>(session.pendingDecision)
  useEffect(() => { setFlipped(false); setDecision(null) }, [card.id])
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
      <header className="study-meta"><a href="/">← 首页</a><strong>{progress} / {session.cardIds.length}</strong><span>本轮正确 {session.correctCount}</span></header>
      <button className={`flash-card ${flipped ? 'is-flipped' : ''}`} aria-label={flipped ? '字卡背面' : '翻开字卡'} onClick={() => !flipped && setFlipped(true)}>
        {!flipped ? <span className="character-face">{card.character}</span> : (
          <span className="card-back">
            <span className="card-character-small">{card.character}</span>
            <strong className="pinyin">{card.readings.map((reading) => reading.pinyin).join(' · ')}</strong>
            <span className="meaning">{card.englishMeaning}</span>
            <span className="content-list">
              {(card.contentType === 'compounds' ? card.compounds : card.examples).map((item) => <span className="content-item" key={item.text}><b>{item.text}</b><i>{item.pinyin}</i><small>{item.english}</small></span>)}
            </span>
          </span>
        )}
      </button>
      <p className="flip-hint">{flipped ? '检查答案，然后作出判断' : '点击字卡、按空格键，或说“翻”'}</p>
      {!speechAvailable ? <p className="notice">浏览器不支持语音或麦克风不可用；你仍可完整手动学习。</p> : <button className="secondary-button" onClick={onListen}>{speechStatus === 'listening' ? '正在聆听…' : '朗读并识别'}</button>}
      {(transcript || assessmentReason) && <div className="speech-result" aria-live="polite"><b>识别到：{transcript || '无结果'}</b><span>{assessmentReason}</span></div>}
      {flipped && <>
        <div className="decision-row" aria-label="本题判断">
          <button className={decision === 'incorrect' ? 'selected wrong' : ''} onClick={() => choose('incorrect')}>✕ 错误</button>
          <button className={decision === 'correct' ? 'selected correct' : ''} onClick={() => choose('correct')}>✓ 正确</button>
        </div>
        <fieldset className="tag-row"><legend>加入字库</legend>{(['wrong', 'new-1', 'new-2', 'new-3', 'familiar'] as LibraryId[]).map((id) => <label key={id}><input type="checkbox" onChange={(event) => onTag(id, event.target.checked)} />{id === 'familiar' ? '熟词' : id === 'wrong' ? '错字' : `生词 ${id.at(-1)}`}</label>)}</fieldset>
        <button className="next-button" disabled={!decision} onClick={onNext}>下一张 →</button>
      </>}
    </div>
  )
}

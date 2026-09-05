import { useEffect, useMemo, useRef, useState } from 'react'
import { Navigate, Route, Routes, useNavigate, useParams } from 'react-router-dom'
import { HomePage } from '@/features/home/HomePage'
import { StudyPage } from '@/features/study/StudyPage'
import { SummaryPage } from '@/features/study/SummaryPage'
import { LibraryPage } from '@/features/library/LibraryPage'
import { SettingsPage } from '@/features/settings/SettingsPage'
import { useAppData } from './AppProviders'
import { describeEnvironment, describeSpeechError, getSharedSpeechAdapter, requestMicrophoneAccess, shouldRestartContinuous } from '@/speech/speech-adapter'
import { assessPronunciation, buildHomophoneIndex, isFlipCommand } from '@/speech/normalize'
import { listChineseVoices, loadVoices, speakWhenReady } from '@/speech/speak'
import { recordClip } from '@/speech/recorder'
import type { VoskTranscriber } from '@/speech/vosk-engine'
import { assessTone, expectedToneFromPinyin, extractContour } from '@/speech/tone'

function HomeRoute() {
  const app = useAppData(); const navigate = useNavigate()
  const active = app.sessions.find((session) => session.status === 'active')
  return <HomePage counts={app.counts} activeSessionId={active?.id} onStart={async (id) => navigate(`/study/${await app.startSession(id)}`)} />
}

function StudyRoute() {
  const { sessionId = '' } = useParams(); const app = useAppData(); const navigate = useNavigate()
  const [adapter] = useState(() => getSharedSpeechAdapter(window))
  const [speech, setSpeech] = useState({ transcript: '', reason: '', status: 'idle', flipToken: 0 })
  const microphoneReady = useRef(false)
  const offlineEngine = useRef<Promise<VoskTranscriber> | null>(null)
  const homophones = useMemo(() => buildHomophoneIndex(app.cards), [app.cards])
  const [tone, setTone] = useState<{ status: 'idle' | 'recording' | 'analyzing'; result?: { status: 'match' | 'mismatch' | 'unclear'; message: string } }>({ status: 'idle' })
  const session = app.sessions.find((item) => item.id === sessionId)
  const card = session ? app.cards.find((item) => item.id === session.cardIds[session.currentIndex]) : undefined
  useEffect(() => { if (session?.status === 'active' && card) void app.markShown(session.id) }, [session?.id, session?.currentIndex, card?.id])
  useEffect(() => setTone({ status: 'idle' }), [card?.id])
  useEffect(() => {
    let restartAllowed = true
    return adapter.subscribe((event) => {
    if (event.type === 'listening') setSpeech((prior) => ({ ...prior, status: 'listening' }))
    if (event.type === 'stopped') { setSpeech((prior) => ({ ...prior, status: 'idle' })); if (restartAllowed && shouldRestartContinuous(app.settings.continuousFlipListening, event)) window.setTimeout(() => adapter.start(), 250) }
    if (event.type === 'error') {
      restartAllowed = false
      const mapped = describeSpeechError(event.code ?? 'unknown')
      const env = describeEnvironment(window)
      const serviceBlocked = event.code === 'service-not-allowed' || event.code === 'network'
      const hint = serviceBlocked && env.speechServiceLikelyMissing
        ? ` ${env.browser} is a Chromium build without Google's speech service, so recognition cannot work here no matter which permissions you grant. Use Google Chrome or Microsoft Edge.`
        : ''
      const base = `${mapped.message}${hint}`
      setSpeech((prior) => ({ ...prior, status: 'idle', reason: `${base} (diagnostic code: ${event.code ?? 'unknown'} · ${env.browser}${event.detail ? ` · ${event.detail}` : ''})` }))
    }
    if (event.type === 'partial') setSpeech((prior) => ({ ...prior, transcript: event.transcript, reason: 'Listening…' }))
    if (event.type === 'result' && card && session) {
      if (isFlipCommand(event.transcript)) { setSpeech((prior) => ({ ...prior, transcript: event.transcript, reason: 'Heard “翻”.', flipToken: prior.flipToken + 1 })); return }
      const result = assessPronunciation(event, card, { index: homophones })
      // A match settles the card on its own. A non-match never does: speech
      // recognition is wrong often enough that auto-failing a learner who said
      // it correctly is the worse error, so that stays a human decision.
      const settled = result.status === 'correct'
      setSpeech((prior) => ({ ...prior, transcript: result.transcript, reason: settled ? `${result.reason} Marked correct.` : result.reason }))
      if (settled) void app.setDecision(session.id, 'correct')
    }
    })
  }, [adapter, card?.id, session?.id, app.settings.continuousFlipListening, homophones])
  useEffect(() => {
    if (app.settings.continuousFlipListening && adapter.capability === 'available') adapter.start()
    return () => adapter.stop()
  }, [adapter, app.settings.continuousFlipListening])
  if (!session) return <Navigate to="/" replace />
  if (session.status !== 'active' || !card) return <Navigate to={`/summary/${session.id}`} replace />
  return <StudyPage card={card} session={session} speechAvailable={adapter.capability === 'available'} transcript={speech.transcript} assessmentReason={speech.reason} speechStatus={speech.status} voiceFlipToken={speech.flipToken} onSpeak={async () => {
    const spoken = await speakWhenReady(card.character, window.speechSynthesis, (text) => new SpeechSynthesisUtterance(text), app.settings.ttsVoiceUri)
    if (!spoken) setTone({ status: 'idle', result: { status: 'unclear', message: 'This browser has no Chinese voice installed, so playback is unavailable.' } })
  }}
  onCheckTone={async () => {
    const expected = expectedToneFromPinyin(card.readings[0]?.pinyin ?? '')
    setTone({ status: 'recording' })
    try {
      const clip = await recordClip(window)
      setTone({ status: 'analyzing' })
      setTone({ status: 'idle', result: assessTone(extractContour(clip.samples, clip.sampleRate), expected) })
    } catch (error) {
      setTone({ status: 'idle', result: { status: 'unclear', message: `Could not record: ${(error as Error)?.name ?? 'unknown error'}.` } })
    }
  }}
  toneStatus={tone.status}
  toneResult={tone.result}
  onListen={async () => {
    if (app.settings.useOfflineSpeech ?? false) {
      // A fixed recording window, so a short syllable is never cut off, and the
      // same clip answers both questions: which syllable, and which tone.
      setSpeech((prior) => ({ ...prior, status: 'listening', transcript: '', reason: 'Recording… say it now.' }))
      try {
        const clip = await recordClip(window, 2500)
        setSpeech((prior) => ({ ...prior, status: 'idle', reason: 'Recognizing…' }))
        offlineEngine.current ??= import('@/speech/vosk-engine').then((module) => module.loadVoskTranscriber())
        const engine = await offlineEngine.current
        const text = await engine.transcribe(clip.samples, clip.sampleRate)
        const spoken = assessPronunciation({ transcript: text, confidence: 1 }, card, { index: homophones })
        const settledHere = spoken.status === 'correct'
        setSpeech((prior) => ({ ...prior, transcript: text, reason: settledHere ? `${spoken.reason} Marked correct.` : spoken.reason }))
        setTone({ status: 'idle', result: assessTone(extractContour(clip.samples, clip.sampleRate), expectedToneFromPinyin(card.readings[0]?.pinyin ?? '')) })
        if (settledHere) void app.setDecision(session.id, 'correct')
      } catch (error) {
        setSpeech((prior) => ({ ...prior, status: 'idle', reason: `Offline recognition failed: ${(error as Error)?.message ?? 'unknown error'}. You can switch it off in Settings.` }))
      }
      return
    }
    if (!microphoneReady.current) {
      const check = await requestMicrophoneAccess(navigator)
      if (check.state !== 'granted') { setSpeech((prior) => ({ ...prior, status: 'idle', reason: `${check.message}${check.code ? ` (diagnostic code: ${check.code})` : ''}` })); return }
      microphoneReady.current = true
    }
    adapter.start()
  }} onDecision={(decision) => void app.setDecision(session.id, decision)} onNext={async () => { const next = await app.advance(session.id); if (next.status === 'completed') navigate(`/summary/${session.id}`) }} onTag={(id, enabled) => void app.setTag(card.id, id, enabled)} />
}

function SummaryRoute() {
  const { sessionId = '' } = useParams(); const app = useAppData()
  const session = app.sessions.find((item) => item.id === sessionId)
  if (!session) return <Navigate to="/" replace />
  return <SummaryPage completed={session.correctCount + session.incorrectCount} correct={session.correctCount} incorrect={session.incorrectCount} unreviewedEmpty={app.counts.unreviewed === 0} onNewRound={() => void app.resetRound()} />
}

function LibraryRoute() {
  const app = useAppData()
  return <LibraryPage cards={app.cards} memberships={app.memberships} onAdd={(characters) => void app.addCharacters(characters)} onDelete={(id) => void app.deleteCard(id)} onTag={(id, libraryId, enabled) => void app.setTag(id, libraryId, enabled)} onSave={(card) => void app.saveCard(card)} onRestore={(id) => void app.restoreCard(id)} transfer={{ onExportJson: app.exportJson, onExportCsv: app.exportCsv, onImportJson: app.importJson, onImportCsv: app.importCsv }} />
}

function SettingsRoute() {
  const app = useAppData()
  const [voices, setVoices] = useState<{ name: string; uri: string }[]>([])
  useEffect(() => {
    void loadVoices(window.speechSynthesis).then((all) =>
      setVoices(listChineseVoices(all).map((item) => ({ name: `${item.name} (${item.lang})`, uri: item.voiceURI }))))
  }, [])
  return <SettingsPage
    voices={voices}
    voiceUri={app.settings.ttsVoiceUri ?? voices[0]?.uri}
    onVoiceChange={(uri) => void app.updateSettings({ ttsVoiceUri: uri })}
    onPreviewVoice={() => void speakWhenReady('你好，这是朗读示例。', window.speechSynthesis, (text) => new SpeechSynthesisUtterance(text), app.settings.ttsVoiceUri ?? voices[0]?.uri)}
    continuousListening={app.settings.continuousFlipListening} offlineSpeech={app.settings.useOfflineSpeech ?? false} onOfflineSpeechChange={(value) => void app.updateSettings({ useOfflineSpeech: value })} speechAvailable={'webkitSpeechRecognition' in window || 'SpeechRecognition' in window} onListeningChange={(value) => void app.updateSettings({ continuousFlipListening: value })} onResetDefaults={() => void app.updateSettings({ continuousFlipListening: false, backupReminderDismissedAt: null })} onEraseAll={() => void app.eraseAll()} />
}

export function AppRoutes() {
  const app = useAppData()
  if (app.error) return <section className="error-panel"><h2>Can’t open local data</h2><p>{app.error}</p><p>Check your browser storage, then reload the page.</p></section>
  if (!app.ready) return <div className="loading" role="status">Preparing 1,000 cards…</div>
  return <Routes><Route path="/" element={<HomeRoute />} /><Route path="/study/:sessionId" element={<StudyRoute />} /><Route path="/summary/:sessionId" element={<SummaryRoute />} /><Route path="/library" element={<LibraryRoute />} /><Route path="/settings" element={<SettingsRoute />} /><Route path="*" element={<Navigate to="/" replace />} /></Routes>
}

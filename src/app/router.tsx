import { useEffect } from 'react'
import { Navigate, Route, Routes, useNavigate, useParams } from 'react-router-dom'
import { HomePage } from '@/features/home/HomePage'
import { StudyPage } from '@/features/study/StudyPage'
import { SummaryPage } from '@/features/study/SummaryPage'
import { LibraryPage } from '@/features/library/LibraryPage'
import { SettingsPage } from '@/features/settings/SettingsPage'
import { useAppData } from './AppProviders'

function HomeRoute() {
  const app = useAppData(); const navigate = useNavigate()
  const active = app.sessions.find((session) => session.status === 'active')
  return <HomePage counts={app.counts} activeSessionId={active?.id} onStart={async (id) => navigate(`/study/${await app.startSession(id)}`)} />
}

function StudyRoute() {
  const { sessionId = '' } = useParams(); const app = useAppData(); const navigate = useNavigate()
  const session = app.sessions.find((item) => item.id === sessionId)
  const card = session ? app.cards.find((item) => item.id === session.cardIds[session.currentIndex]) : undefined
  useEffect(() => { if (session?.status === 'active' && card) void app.markShown(session.id) }, [session?.id, session?.currentIndex, card?.id])
  if (!session) return <Navigate to="/" replace />
  if (session.status !== 'active' || !card) return <Navigate to={`/summary/${session.id}`} replace />
  return <StudyPage card={card} session={session} speechAvailable={'webkitSpeechRecognition' in window || 'SpeechRecognition' in window} onDecision={(decision) => void app.setDecision(session.id, decision)} onNext={async () => { const next = await app.advance(session.id); if (next.status === 'completed') navigate(`/summary/${session.id}`) }} onTag={(id, enabled) => void app.setTag(card.id, id, enabled)} />
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
  return <SettingsPage continuousListening={app.settings.continuousFlipListening} speechAvailable={'webkitSpeechRecognition' in window || 'SpeechRecognition' in window} onListeningChange={(value) => void app.updateSettings({ continuousFlipListening: value })} onResetDefaults={() => void app.updateSettings({ continuousFlipListening: false, backupReminderDismissedAt: null })} onEraseAll={() => void app.eraseAll()} />
}

export function AppRoutes() {
  const app = useAppData()
  if (app.error) return <section className="error-panel"><h2>无法打开本地数据</h2><p>{app.error}</p><p>请检查浏览器存储空间，然后刷新页面。</p></section>
  if (!app.ready) return <div className="loading" role="status">正在准备 1000 张字卡…</div>
  return <Routes><Route path="/" element={<HomeRoute />} /><Route path="/study/:sessionId" element={<StudyRoute />} /><Route path="/summary/:sessionId" element={<SummaryRoute />} /><Route path="/library" element={<LibraryRoute />} /><Route path="/settings" element={<SettingsRoute />} /><Route path="*" element={<Navigate to="/" replace />} /></Routes>
}

import { useState } from 'react'

interface Props { continuousListening: boolean; speechAvailable: boolean; onListeningChange(value: boolean): void; onResetDefaults(): void; onEraseAll(): void }

export function SettingsPage({ continuousListening, speechAvailable, onListeningChange, onResetDefaults, onEraseAll }: Props) {
  const [confirming, setConfirming] = useState(false)
  return <div className="settings-grid">
    <section className="settings-card"><p className="eyebrow">Speech</p><h2>Reading aloud and the “翻” command</h2><label className="toggle"><input type="checkbox" checked={continuousListening} disabled={!speechAvailable} onChange={(event) => onListeningChange(event.target.checked)} />Keep listening for “翻”</label><p>{speechAvailable ? 'Browser speech recognition is available.' : 'This browser has no speech recognition; use manual mode.'}</p><p className="notice">Speech recognition cannot reliably judge tone pitch. Audio may be sent to your browser vendor for processing, but this app never stores recordings or transcripts.</p></section>
    <section className="settings-card"><p className="eyebrow">Local data</p><h2>Backup and reset</h2><p>Clearing this site’s browser data deletes your study history. Export a full JSON backup regularly.</p><button onClick={onResetDefaults}>Restore default settings</button><button className="danger-button" onClick={() => setConfirming(true)}>Delete all study data</button></section>
    {confirming && <div className="modal-backdrop"><div role="dialog" aria-modal="true" aria-labelledby="erase-title" className="dialog"><h2 id="erase-title">Permanently delete all data?</h2><p>This cannot be undone inside the app. An existing JSON backup can still be restored.</p><div className="button-row"><button onClick={() => setConfirming(false)}>Cancel</button><button className="danger-button" onClick={() => { setConfirming(false); onEraseAll() }}>Yes, delete everything</button></div></div></div>}
  </div>
}

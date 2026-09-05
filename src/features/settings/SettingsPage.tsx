import { useState } from 'react'

export interface VoiceChoice { name: string; uri: string }

interface Props { continuousListening: boolean; speechAvailable: boolean; offlineSpeech: boolean; voices?: VoiceChoice[]; voiceUri?: string; onVoiceChange?(uri: string): void; onPreviewVoice?(): void; neuralVoice?: { enabled: boolean; installed: boolean; progress: number | null }; onNeuralVoiceChange?(value: boolean): void; onInstallNeuralVoice?(): void; onListeningChange(value: boolean): void; onOfflineSpeechChange(value: boolean): void; onResetDefaults(): void; onEraseAll(): void }

export function SettingsPage({ continuousListening, speechAvailable, offlineSpeech, voices = [], voiceUri, onVoiceChange, onPreviewVoice, neuralVoice, onNeuralVoiceChange, onInstallNeuralVoice, onListeningChange, onOfflineSpeechChange, onResetDefaults, onEraseAll }: Props) {
  const [confirming, setConfirming] = useState(false)
  return <div className="settings-grid">
    <section className="settings-card"><p className="eyebrow">Speech</p><h2>Reading aloud and the “翻” command</h2><label className="toggle"><input type="checkbox" checked={continuousListening} disabled={!speechAvailable} onChange={(event) => onListeningChange(event.target.checked)} />Keep listening for “翻”</label><p>{speechAvailable ? 'Browser speech recognition is available.' : 'This browser has no speech recognition; use manual mode.'}</p><label className="toggle"><input type="checkbox" checked={offlineSpeech} onChange={(event) => onOfflineSpeechChange(event.target.checked)} />Recognize on this device (offline)</label><p>{offlineSpeech ? 'Your voice is recognized locally with a bundled model. Nothing is sent to a server, and a fixed recording window avoids the browser cutting a short syllable off.' : 'Your voice is sent to the browser vendor’s speech service.'}</p>{neuralVoice && <div className="neural-voice">
      {neuralVoice.installed
        ? <label className="toggle"><input type="checkbox" checked={neuralVoice.enabled} onChange={(event) => onNeuralVoiceChange?.(event.target.checked)} />Use the high-quality Mandarin voice</label>
        : <><p>A downloadable neural Mandarin voice sounds considerably more natural than the built-in system voices. It is about 60 MB, stored on this device, and works offline afterwards.</p>
            <button className="secondary-button" disabled={neuralVoice.progress !== null} onClick={() => onInstallNeuralVoice?.()}>
              {neuralVoice.progress === null ? 'Download high-quality voice (60 MB)' : `Downloading… ${Math.round(neuralVoice.progress * 100)}%`}
            </button></>}
    </div>}
    {neuralVoice?.enabled && neuralVoice.installed && <p className="notice">The high-quality voice is in use, so the reading voice below is only a fallback. Untick it above to use a system voice.</p>}
    <label className="field"><span>Reading voice</span><select aria-label="Reading voice" value={voiceUri ?? ''} onChange={(event) => onVoiceChange?.(event.target.value)}>{voices.map((item) => <option key={item.uri} value={item.uri}>{item.name}</option>)}</select></label><button className="secondary-button" onClick={() => onPreviewVoice?.()}>🔊 Preview</button><p>Listed best first. Eddy, Flo, Grandma, Grandpa, Reed, Rocko, Sandy and Shelley are macOS character voices and sound artificial; Tingting is the natural Mandarin voice. For better quality, install an enhanced voice in System Settings → Accessibility → Spoken Content → System Voice → Manage Voices.</p><p className="notice">Speech recognition cannot reliably judge tone pitch. Audio may be sent to your browser vendor for processing, but this app never stores recordings or transcripts.</p></section>
    <section className="settings-card"><p className="eyebrow">Local data</p><h2>Backup and reset</h2><p>Clearing this site’s browser data deletes your study history. Export a full JSON backup regularly.</p><button onClick={onResetDefaults}>Restore default settings</button><button className="danger-button" onClick={() => setConfirming(true)}>Delete all study data</button></section>
    {confirming && <div className="modal-backdrop"><div role="dialog" aria-modal="true" aria-labelledby="erase-title" className="dialog"><h2 id="erase-title">Permanently delete all data?</h2><p>This cannot be undone inside the app. An existing JSON backup can still be restored.</p><div className="button-row"><button onClick={() => setConfirming(false)}>Cancel</button><button className="danger-button" onClick={() => { setConfirming(false); onEraseAll() }}>Yes, delete everything</button></div></div></div>}
  </div>
}

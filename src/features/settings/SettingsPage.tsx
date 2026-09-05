import { useState } from 'react'

interface Props { continuousListening: boolean; speechAvailable: boolean; onListeningChange(value: boolean): void; onResetDefaults(): void; onEraseAll(): void }

export function SettingsPage({ continuousListening, speechAvailable, onListeningChange, onResetDefaults, onEraseAll }: Props) {
  const [confirming, setConfirming] = useState(false)
  return <div className="settings-grid">
    <section className="settings-card"><p className="eyebrow">语音</p><h2>朗读与“翻”命令</h2><label className="toggle"><input type="checkbox" checked={continuousListening} disabled={!speechAvailable} onChange={(event) => onListeningChange(event.target.checked)} />持续监听“翻”</label><p>{speechAvailable ? '浏览器语音识别已可用。' : '此浏览器不支持语音识别，请使用手动模式。'}</p><p className="notice">语音识别不能可靠测量声调音高。音频可能会发送给浏览器供应商处理，但本应用不会保存录音或识别文本。</p></section>
    <section className="settings-card"><p className="eyebrow">本地数据</p><h2>备份与重置</h2><p>清除浏览器站点数据会删除学习记录。请定期导出 JSON 完整备份。</p><button onClick={onResetDefaults}>恢复默认设置</button><button className="danger-button" onClick={() => setConfirming(true)}>删除全部学习数据</button></section>
    {confirming && <div className="modal-backdrop"><div role="dialog" aria-modal="true" aria-labelledby="erase-title" className="dialog"><h2 id="erase-title">永久删除全部数据？</h2><p>此操作无法在应用内撤销。已有 JSON 备份仍可恢复。</p><div className="button-row"><button onClick={() => setConfirming(false)}>取消</button><button className="danger-button" onClick={() => { setConfirming(false); onEraseAll() }}>确认永久删除</button></div></div></div>}
  </div>
}

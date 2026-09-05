import { useRef, useState } from 'react'

interface Props {
  onExportJson(): Promise<string>
  onExportCsv(): string
  onImportJson(content: string): Promise<{ message: string }>
  onImportCsv(content: string): Promise<{ message: string }>
}

const download = (content: string, filename: string, type: string) => {
  if (!URL.createObjectURL) return
  const url = URL.createObjectURL(new Blob([content], { type }))
  const anchor = document.createElement('a'); anchor.href = url; anchor.download = filename; anchor.click(); URL.revokeObjectURL(url)
}

export function ImportExportPanel({ onExportJson, onExportCsv, onImportJson, onImportCsv }: Props) {
  const jsonInput = useRef<HTMLInputElement>(null); const csvInput = useRef<HTMLInputElement>(null); const [status, setStatus] = useState('')
  const importFile = async (file: File | undefined, kind: 'json' | 'csv') => {
    if (!file) return
    const limit = kind === 'json' ? 5_000_000 : 2_000_000
    if (file.size > limit) { setStatus(`File too large. The ${kind.toUpperCase()} limit is ${limit / 1_000_000} MB.`); return }
    try { const result = await (kind === 'json' ? onImportJson : onImportCsv)(await file.text()); setStatus(result.message) } catch (error) { setStatus(error instanceof Error ? error.message : 'Import failed; your existing data is unchanged.') }
  }
  return <section className="editor-panel"><div><p className="eyebrow">Import and export</p><h2>Take your study data with you</h2><p>JSON is a full backup. CSV does not include progress, library tags, or settings.</p></div><div className="button-row"><button onClick={async () => download(await onExportJson(), `hanzi-backup-${new Date().toISOString().slice(0, 10)}.json`, 'application/json')}>Export full JSON backup</button><button onClick={() => download(onExportCsv(), 'hanzi-cards.csv', 'text/csv')}>Export card content as CSV</button><button onClick={() => jsonInput.current?.click()}>Import JSON</button><button onClick={() => csvInput.current?.click()}>Import CSV</button></div><input ref={jsonInput} hidden type="file" accept="application/json,.json" onChange={(event) => void importFile(event.target.files?.[0], 'json')} /><input ref={csvInput} hidden type="file" accept="text/csv,.csv" onChange={(event) => void importFile(event.target.files?.[0], 'csv')} />{status && <p role="status" className="notice">{status}</p>}</section>
}

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
    if (file.size > limit) { setStatus(`文件过大，${kind.toUpperCase()} 上限为 ${limit / 1_000_000} MB。`); return }
    try { const result = await (kind === 'json' ? onImportJson : onImportCsv)(await file.text()); setStatus(result.message) } catch (error) { setStatus(error instanceof Error ? error.message : '导入失败，原有数据未更改。') }
  }
  return <section className="editor-panel"><div><p className="eyebrow">导入与导出</p><h2>带走你的学习资料</h2><p>JSON 是完整备份。CSV 不包含学习进度、字库标签或设置。</p></div><div className="button-row"><button onClick={async () => download(await onExportJson(), `hanzi-backup-${new Date().toISOString().slice(0, 10)}.json`, 'application/json')}>导出 JSON 完整备份</button><button onClick={() => download(onExportCsv(), 'hanzi-cards.csv', 'text/csv')}>导出 CSV 字卡内容</button><button onClick={() => jsonInput.current?.click()}>导入 JSON</button><button onClick={() => csvInput.current?.click()}>导入 CSV</button></div><input ref={jsonInput} hidden type="file" accept="application/json,.json" onChange={(event) => void importFile(event.target.files?.[0], 'json')} /><input ref={csvInput} hidden type="file" accept="text/csv,.csv" onChange={(event) => void importFile(event.target.files?.[0], 'csv')} />{status && <p role="status" className="notice">{status}</p>}</section>
}

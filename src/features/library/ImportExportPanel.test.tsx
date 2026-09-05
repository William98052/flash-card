import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ImportExportPanel } from './ImportExportPanel'

it('offers full JSON backup and content-only CSV actions', async () => {
  const user = userEvent.setup(); const onExportJson = vi.fn(async () => '{}'); const onExportCsv = vi.fn(() => 'character,pinyin')
  render(<ImportExportPanel onExportJson={onExportJson} onExportCsv={onExportCsv} onImportJson={() => Promise.resolve({ message: 'ok' })} onImportCsv={() => Promise.resolve({ message: 'ok' })} />)
  await user.click(screen.getByRole('button', { name: /导出 JSON 完整备份/ }))
  await user.click(screen.getByRole('button', { name: /导出 CSV 字卡内容/ }))
  expect(onExportJson).toHaveBeenCalledOnce()
  expect(onExportCsv).toHaveBeenCalledOnce()
  expect(screen.getByText(/CSV 不包含学习进度/)).toBeVisible()
})

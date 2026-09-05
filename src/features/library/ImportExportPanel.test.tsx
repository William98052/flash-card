import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ImportExportPanel } from './ImportExportPanel'

it('offers full JSON backup and content-only CSV actions', async () => {
  const user = userEvent.setup(); const onExportJson = vi.fn(async () => '{}'); const onExportCsv = vi.fn(() => 'character,pinyin')
  render(<ImportExportPanel onExportJson={onExportJson} onExportCsv={onExportCsv} onImportJson={() => Promise.resolve({ message: 'ok' })} onImportCsv={() => Promise.resolve({ message: 'ok' })} />)
  await user.click(screen.getByRole('button', { name: /Export full JSON backup/ }))
  await user.click(screen.getByRole('button', { name: /Export card content as CSV/ }))
  expect(onExportJson).toHaveBeenCalledOnce()
  expect(onExportCsv).toHaveBeenCalledOnce()
  expect(screen.getByText(/CSV does not include progress/)).toBeVisible()
})

import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { SettingsPage } from './SettingsPage'

it('separates default settings from erasing study data', async () => {
  const user = userEvent.setup()
  const reset = vi.fn()
  const erase = vi.fn()
  render(<SettingsPage continuousListening={false} speechAvailable={false} onListeningChange={() => {}} onResetDefaults={reset} onEraseAll={erase} />)
  expect(screen.getByText(/音频可能会发送给浏览器供应商/)).toBeVisible()
  await user.click(screen.getByRole('button', { name: /恢复默认设置/ }))
  expect(reset).toHaveBeenCalledOnce()
  expect(erase).not.toHaveBeenCalled()
  await user.click(screen.getByRole('button', { name: /删除全部学习数据/ }))
  expect(screen.getByRole('dialog')).toBeVisible()
  await user.click(screen.getByRole('button', { name: /确认永久删除/ }))
  expect(erase).toHaveBeenCalledOnce()
})

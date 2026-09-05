import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { HomePage } from './HomePage'

it('shows all seven libraries, counts, progress, and continuation', async () => {
  const onStart = vi.fn()
  render(<HomePage counts={{ all: 1000, unreviewed: 640, wrong: 12, 'new-1': 0, 'new-2': 0, 'new-3': 0, familiar: 55 }} activeSessionId="session-1" onStart={onStart} />)
  expect(screen.getAllByRole('button', { name: /开始/ })).toHaveLength(7)
  expect(screen.getByText('640 / 1000')).toBeVisible()
  expect(screen.getByRole('link', { name: /继续上次学习/ })).toHaveAttribute('href', '/study/session-1')
  expect(screen.getByRole('button', { name: /生词库 1.*开始/ })).toBeDisabled()
  await userEvent.click(screen.getByRole('button', { name: /全部字库.*开始/ }))
  expect(onStart).toHaveBeenCalledWith('all')
})

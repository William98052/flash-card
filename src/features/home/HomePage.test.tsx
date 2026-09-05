import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { HomePage } from './HomePage'
import type { CharacterCard } from '@/domain/types'

const searchableCard = {
  id: 'card-heavy',
  character: '重',
  contentStatus: 'complete',
} as CharacterCard

it('shows all seven libraries, counts, progress, and continuation', async () => {
  const onStart = vi.fn()
  render(<HomePage counts={{ all: 1000, unreviewed: 640, wrong: 12, 'new-1': 0, 'new-2': 0, 'new-3': 0, familiar: 55 }} cards={[]} activeSessionId="session-1" onStart={onStart} onOpenCard={vi.fn()} />)
  expect(screen.getAllByRole('button', { name: /Start/ })).toHaveLength(7)
  expect(screen.getByText('640 / 1000')).toBeVisible()
  expect(screen.getByRole('link', { name: /Resume last session/ })).toHaveAttribute('href', '/study/session-1')
  expect(screen.getByRole('button', { name: /Start New words 1/ })).toBeDisabled()
  await userEvent.click(screen.getByRole('button', { name: /Start All characters/ }))
  expect(onStart).toHaveBeenCalledWith('all')
})

it('opens the matching flash card when a character search is submitted', async () => {
  const onOpenCard = vi.fn()
  render(
    <HomePage
      counts={{ all: 1, unreviewed: 1, wrong: 0, 'new-1': 0, 'new-2': 0, 'new-3': 0, familiar: 0 }}
      cards={[searchableCard]}
      onStart={vi.fn()}
      onOpenCard={onOpenCard}
    />,
  )

  await userEvent.type(screen.getByRole('textbox', { name: /search a character/i }), '重{Enter}')

  expect(onOpenCard).toHaveBeenCalledWith('card-heavy')
})

it('starts with a genuinely empty search field', () => {
  render(
    <HomePage
      counts={{ all: 1, unreviewed: 1, wrong: 0, 'new-1': 0, 'new-2': 0, 'new-3': 0, familiar: 0 }}
      cards={[searchableCard]}
      onStart={vi.fn()}
      onOpenCard={vi.fn()}
    />,
  )

  const search = screen.getByRole('textbox', { name: /search a character/i })
  expect(search).toHaveValue('')
  expect(search).not.toHaveAttribute('placeholder')
})

it('explains when a character has no flash card', async () => {
  render(
    <HomePage
      counts={{ all: 1, unreviewed: 1, wrong: 0, 'new-1': 0, 'new-2': 0, 'new-3': 0, familiar: 0 }}
      cards={[searchableCard]}
      onStart={vi.fn()}
      onOpenCard={vi.fn()}
    />,
  )

  await userEvent.type(screen.getByRole('textbox', { name: /search a character/i }), '龘{Enter}')

  expect(screen.getByRole('alert')).toHaveTextContent('No flash card found for “龘”.')
})

import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { LibraryPage } from './LibraryPage'
import seed from '@/content/ap-1000.json'
import type { CharacterCard } from '@/domain/types'

it('searches content and previews unique Han characters before adding', async () => {
  const user = userEvent.setup()
  const onAdd = vi.fn()
  render(<LibraryPage cards={seed.slice(0, 3) as CharacterCard[]} memberships={new Map()} onAdd={onAdd} onDelete={() => {}} onTag={() => {}} />)
  await user.type(screen.getByRole('searchbox'), seed[0].englishMeaning)
  expect(screen.getByText(seed[0].character)).toBeVisible()
  await user.click(screen.getByRole('button', { name: /Add characters/ }))
  await user.type(screen.getByRole('textbox', { name: /Paste text/ }), `新A新${seed[0].character}`)
  expect(screen.getByText(/To add 1/)).toBeVisible()
  expect(screen.getByText(/Already there 1/)).toBeVisible()
  await user.click(screen.getByRole('button', { name: /Add them/ }))
  expect(onAdd).toHaveBeenCalledWith(['新'])
})

it('filters by library and applies a tag to selected cards in one action', async () => {
  const user = userEvent.setup(); const onTag = vi.fn(); const cards = seed.slice(0, 3) as CharacterCard[]
  const memberships = new Map([['familiar', new Set([cards[0].id])]]) as never
  render(<LibraryPage cards={cards} memberships={memberships} onAdd={() => {}} onDelete={() => {}} onTag={onTag} />)
  await user.selectOptions(screen.getByRole('combobox', { name: 'Filter by library' }), 'familiar')
  expect(screen.getByText(cards[0].character)).toBeVisible()
  expect(screen.queryByText(cards[1].character)).not.toBeInTheDocument()
  await user.selectOptions(screen.getByRole('combobox', { name: 'Filter by library' }), 'all-cards')
  await user.click(screen.getByRole('checkbox', { name: `Select ${cards[0].character}` }))
  await user.click(screen.getByRole('checkbox', { name: `Select ${cards[1].character}` }))
  await user.selectOptions(screen.getByRole('combobox', { name: 'Bulk library' }), 'new-1')
  await user.click(screen.getByRole('button', { name: 'Add selected' }))
  expect(onTag).toHaveBeenCalledWith(cards[0].id, 'new-1', true)
  expect(onTag).toHaveBeenCalledWith(cards[1].id, 'new-1', true)
})

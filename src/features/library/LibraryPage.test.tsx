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
  await user.click(screen.getByRole('button', { name: /添加汉字/ }))
  await user.type(screen.getByRole('textbox', { name: /粘贴文本/ }), `新A新${seed[0].character}`)
  expect(screen.getByText(/将添加 1/)).toBeVisible()
  expect(screen.getByText(/已存在 1/)).toBeVisible()
  await user.click(screen.getByRole('button', { name: /确认添加/ }))
  expect(onAdd).toHaveBeenCalledWith(['新'])
})

it('filters by library and applies a tag to selected cards in one action', async () => {
  const user = userEvent.setup(); const onTag = vi.fn(); const cards = seed.slice(0, 3) as CharacterCard[]
  const memberships = new Map([['familiar', new Set([cards[0].id])]]) as never
  render(<LibraryPage cards={cards} memberships={memberships} onAdd={() => {}} onDelete={() => {}} onTag={onTag} />)
  await user.selectOptions(screen.getByRole('combobox', { name: '按字库筛选' }), 'familiar')
  expect(screen.getByText(cards[0].character)).toBeVisible()
  expect(screen.queryByText(cards[1].character)).not.toBeInTheDocument()
  await user.selectOptions(screen.getByRole('combobox', { name: '按字库筛选' }), 'all-cards')
  await user.click(screen.getByRole('checkbox', { name: `选择 ${cards[0].character}` }))
  await user.click(screen.getByRole('checkbox', { name: `选择 ${cards[1].character}` }))
  await user.selectOptions(screen.getByRole('combobox', { name: '批量字库' }), 'new-1')
  await user.click(screen.getByRole('button', { name: '批量加入' }))
  expect(onTag).toHaveBeenCalledWith(cards[0].id, 'new-1', true)
  expect(onTag).toHaveBeenCalledWith(cards[1].id, 'new-1', true)
})

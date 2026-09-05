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

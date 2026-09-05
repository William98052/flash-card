import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { CardEditor } from './CardEditor'
import seed from '@/content/ap-1000.json'
import type { CharacterCard } from '@/domain/types'

it('blocks character collisions and saves user-edited fields', async () => {
  const user = userEvent.setup(); const onSave = vi.fn()
  render(<CardEditor card={seed[0] as CharacterCard} existingCharacters={new Set([seed[0].character, seed[1].character])} onSave={onSave} onCancel={() => {}} onRestore={() => {}} />)
  const character = screen.getByRole('textbox', { name: '汉字' })
  await user.clear(character); await user.type(character, seed[1].character)
  await user.click(screen.getByRole('button', { name: '保存修改' }))
  expect(screen.getByText(/已经存在/)).toBeVisible()
  expect(onSave).not.toHaveBeenCalled()
  await user.clear(character); await user.type(character, seed[0].character)
  const meaning = screen.getByRole('textbox', { name: '英文释义' })
  await user.clear(meaning); await user.type(meaning, 'custom meaning')
  await user.click(screen.getByRole('button', { name: '保存修改' }))
  expect(onSave.mock.calls[0][0]).toMatchObject({ englishMeaning: 'custom meaning', userEditedFields: expect.arrayContaining(['englishMeaning']) })
})

import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { StudyPage } from './StudyPage'
import seed from '@/content/ap-1000.json'
import type { CharacterCard, StudySession } from '@/domain/types'

const session = { id: 's', sourceLibraryId: 'all', cardIds: ['seed-0001'], currentIndex: 0, pendingDecision: null, correctCount: 0, incorrectCount: 0, startedAt: 'now', endedAt: null, status: 'active' } satisfies StudySession

it('keeps the front minimal and flips by click or eligible Space', async () => {
  const user = userEvent.setup()
  const { rerender } = render(<StudyPage card={seed[0] as CharacterCard} session={session} speechAvailable={false} onDecision={() => {}} onNext={() => {}} onTag={() => {}} />)
  expect(screen.getByRole('button', { name: /翻开字卡/ })).toHaveTextContent(seed[0].character)
  expect(screen.queryByText(seed[0].englishMeaning)).not.toBeInTheDocument()
  await user.click(screen.getByRole('button', { name: /翻开字卡/ }))
  expect(screen.getByText(seed[0].englishMeaning)).toBeVisible()
  rerender(<StudyPage card={seed[1] as CharacterCard} session={session} speechAvailable={false} onDecision={() => {}} onNext={() => {}} onTag={() => {}} />)
  await user.keyboard(' ')
  expect(screen.getByText(seed[1].englishMeaning)).toBeVisible()
})

it('allows manual override and settles only when Next is clicked', async () => {
  const user = userEvent.setup()
  const onDecision = vi.fn()
  const onNext = vi.fn()
  render(<StudyPage card={seed[0] as CharacterCard} session={session} speechAvailable={false} onDecision={onDecision} onNext={onNext} onTag={() => {}} />)
  await user.click(screen.getByRole('button', { name: /翻开字卡/ }))
  await user.click(screen.getByRole('button', { name: /错误/ }))
  await user.click(screen.getByRole('button', { name: /正确/ }))
  expect(onDecision).toHaveBeenLastCalledWith('correct')
  expect(onNext).not.toHaveBeenCalled()
  await user.click(screen.getByRole('button', { name: /下一张/ }))
  expect(onNext).toHaveBeenCalledOnce()
  expect(screen.getByText(/浏览器不支持语音/)).toBeVisible()
})

it('flips the front when the speech controller hears the isolated command', () => {
  const { rerender } = render(<StudyPage card={seed[0] as CharacterCard} session={session} speechAvailable voiceFlipToken={0} onDecision={() => {}} onNext={() => {}} onTag={() => {}} />)
  rerender(<StudyPage card={seed[0] as CharacterCard} session={session} speechAvailable voiceFlipToken={1} onDecision={() => {}} onNext={() => {}} onTag={() => {}} />)
  expect(screen.getByText(seed[0].englishMeaning)).toBeVisible()
})

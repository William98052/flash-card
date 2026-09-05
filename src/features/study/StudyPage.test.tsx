import { render, screen } from '@testing-library/react'
import { vi } from 'vitest'
import userEvent from '@testing-library/user-event'
import { StudyPage } from './StudyPage'
import seed from '@/content/ap-1000.json'
import type { CharacterCard, StudySession } from '@/domain/types'

const session = { id: 's', sourceLibraryId: 'all', cardIds: ['seed-0001'], currentIndex: 0, pendingDecision: null, correctCount: 0, incorrectCount: 0, startedAt: 'now', endedAt: null, status: 'active' } satisfies StudySession

it('keeps the front minimal and flips by click or eligible Space', async () => {
  const user = userEvent.setup()
  const { rerender } = render(<StudyPage card={seed[0] as CharacterCard} session={session} speechAvailable={false} onDecision={() => {}} onNext={() => {}} onTag={() => {}} />)
  expect(screen.getByRole('button', { name: /Flip card/ })).toHaveTextContent(seed[0].character)
  expect(screen.queryByText(seed[0].englishMeaning)).not.toBeInTheDocument()
  await user.click(screen.getByRole('button', { name: /Flip card/ }))
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
  await user.click(screen.getByRole('button', { name: /Flip card/ }))
  await user.click(screen.getByRole('button', { name: /Incorrect/ }))
  await user.click(screen.getByRole('button', { name: /Correct/ }))
  expect(onDecision).toHaveBeenLastCalledWith('correct')
  expect(onNext).not.toHaveBeenCalled()
  await user.click(screen.getByRole('button', { name: /Next/ }))
  expect(onNext).toHaveBeenCalledOnce()
  expect(screen.getByText(/Speech input is unavailable in this browser/)).toBeVisible()
})

it('flips the front when the speech controller hears the isolated command', () => {
  const { rerender } = render(<StudyPage card={seed[0] as CharacterCard} session={session} speechAvailable voiceFlipToken={0} onDecision={() => {}} onNext={() => {}} onTag={() => {}} />)
  rerender(<StudyPage card={seed[0] as CharacterCard} session={session} speechAvailable voiceFlipToken={1} onDecision={() => {}} onNext={() => {}} onTag={() => {}} />)
  expect(screen.getByText(seed[0].englishMeaning)).toBeVisible()
})

it('offers playback of the expected pronunciation and a tone check', async () => {
  const user = userEvent.setup()
  const onSpeak = vi.fn()
  const onCheckTone = vi.fn()
  render(<StudyPage card={seed[0] as CharacterCard} session={session} speechAvailable onSpeak={onSpeak} onCheckTone={onCheckTone} onDecision={() => {}} onNext={() => {}} onTag={() => {}} />)
  await user.click(screen.getByRole('button', { name: /Hear it/ }))
  expect(onSpeak).toHaveBeenCalled()
  await user.click(screen.getByRole('button', { name: /Check my tone/ }))
  expect(onCheckTone).toHaveBeenCalled()
})

it('shows the tone verdict, and says when it is recording', () => {
  const { rerender } = render(<StudyPage card={seed[0] as CharacterCard} session={session} speechAvailable toneStatus="recording" onDecision={() => {}} onNext={() => {}} onTag={() => {}} />)
  expect(screen.getByRole('button', { name: /Recording/ })).toBeVisible()
  rerender(<StudyPage card={seed[0] as CharacterCard} session={session} speechAvailable toneResult={{ status: 'mismatch', message: 'Your tone sounded falling (4th), but this card is rising (2nd).' }} onDecision={() => {}} onNext={() => {}} onTag={() => {}} />)
  expect(screen.getByText(/but this card is rising/)).toBeVisible()
})

it('marks the card correct on its own when the spoken reading matched', async () => {
  const card = seed[0] as CharacterCard
  const { rerender } = render(<StudyPage card={card} session={session} speechAvailable onDecision={() => {}} onNext={() => {}} onTag={() => {}} />)
  // Nothing decided yet: the answer is still hidden.
  expect(screen.queryByText(card.englishMeaning)).not.toBeInTheDocument()

  rerender(<StudyPage card={card} session={{ ...session, pendingDecision: 'correct' }} speechAvailable onDecision={() => {}} onNext={() => {}} onTag={() => {}} />)
  // The answer is revealed, Correct is already chosen, and Next is ready.
  expect(screen.getByText(card.englishMeaning)).toBeVisible()
  expect(screen.getByRole('button', { name: /Correct/ })).toHaveAttribute('aria-pressed', 'true')
  expect(screen.getByRole('button', { name: /Next/ })).toBeEnabled()
})

it('still lets me overrule the automatic judgment', async () => {
  const user = userEvent.setup()
  const onDecision = vi.fn()
  const card = seed[0] as CharacterCard
  render(<StudyPage card={card} session={{ ...session, pendingDecision: 'correct' }} speechAvailable onDecision={onDecision} onNext={() => {}} onTag={() => {}} />)
  await user.click(screen.getByRole('button', { name: /Incorrect/ }))
  expect(onDecision).toHaveBeenCalledWith('incorrect')
  expect(screen.getByRole('button', { name: /Incorrect/ })).toHaveAttribute('aria-pressed', 'true')
  expect(screen.getByRole('button', { name: /✓ Correct/ })).toHaveAttribute('aria-pressed', 'false')
})

it('tells me to repeat the syllable, which is what Chrome needs to return a result', () => {
  render(<StudyPage card={seed[0] as CharacterCard} session={session} speechAvailable onDecision={() => {}} onNext={() => {}} onTag={() => {}} />)
  expect(screen.getByText(/say it twice/i)).toBeVisible()
})

it('reads the whole phrase aloud when its pinyin is clicked', async () => {
  const user = userEvent.setup()
  const onSpeakText = vi.fn()
  const card = seed[0] as CharacterCard
  const items = card.contentType === 'compounds' ? card.compounds : card.examples
  render(<StudyPage card={card} session={session} speechAvailable onSpeakText={onSpeakText} onDecision={() => {}} onNext={() => {}} onTag={() => {}} />)
  await user.click(screen.getByRole('button', { name: /Flip card/ }))
  await user.click(screen.getByRole('button', { name: `Read ${items[0].text}` }))
  // The whole phrase, e.g. 载重 - not just the card's character.
  expect(onSpeakText).toHaveBeenCalledWith(items[0].text)
  expect(items[0].text.length).toBeGreaterThan(1)
})

it('keeps the flipped card free of nested buttons', async () => {
  const user = userEvent.setup()
  render(<StudyPage card={seed[0] as CharacterCard} session={session} speechAvailable onSpeakText={() => {}} onDecision={() => {}} onNext={() => {}} onTag={() => {}} />)
  await user.click(screen.getByRole('button', { name: /Flip card/ }))
  expect(document.querySelector('button button')).toBeNull()
})

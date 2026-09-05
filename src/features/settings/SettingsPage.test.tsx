import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { SettingsPage } from './SettingsPage'

it('separates default settings from erasing study data', async () => {
  const user = userEvent.setup()
  const reset = vi.fn()
  const erase = vi.fn()
  render(<SettingsPage continuousListening={false} speechAvailable={false} offlineSpeech onOfflineSpeechChange={() => {}} onListeningChange={() => {}} onResetDefaults={reset} onEraseAll={erase} />)
  expect(screen.getByText(/Audio may be sent to your browser vendor/)).toBeVisible()
  await user.click(screen.getByRole('button', { name: /Restore default settings/ }))
  expect(reset).toHaveBeenCalledOnce()
  expect(erase).not.toHaveBeenCalled()
  await user.click(screen.getByRole('button', { name: /Delete all study data/ }))
  expect(screen.getByRole('dialog')).toBeVisible()
  await user.click(screen.getByRole('button', { name: /Yes, delete everything/ }))
  expect(erase).toHaveBeenCalledOnce()
})

it('lets me choose and preview the reading voice', async () => {
  const user = userEvent.setup()
  const onVoiceChange = vi.fn()
  const onPreviewVoice = vi.fn()
  render(<SettingsPage continuousListening={false} speechAvailable offlineSpeech={false}
    voices={[{ name: 'Tingting', uri: 'tingting' }, { name: 'Eddy', uri: 'eddy' }]}
    voiceUri="tingting" onVoiceChange={onVoiceChange} onPreviewVoice={onPreviewVoice}
    onOfflineSpeechChange={() => {}} onListeningChange={() => {}} onResetDefaults={() => {}} onEraseAll={() => {}} />)
  await user.selectOptions(screen.getByRole('combobox', { name: /reading voice/i }), 'eddy')
  expect(onVoiceChange).toHaveBeenCalledWith('eddy')
  await user.click(screen.getByRole('button', { name: /preview/i }))
  expect(onPreviewVoice).toHaveBeenCalled()
})

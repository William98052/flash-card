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

it('disables the system voice picker while the high-quality voice is in charge', () => {
  const props = {
    continuousListening: false, speechAvailable: true, offlineSpeech: false,
    voices: [{ name: 'Tingting', uri: 'tingting' }], voiceUri: 'tingting',
    onVoiceChange: () => {}, onPreviewVoice: () => {}, onOfflineSpeechChange: () => {},
    onListeningChange: () => {}, onResetDefaults: () => {}, onEraseAll: () => {},
  }
  const { rerender } = render(<SettingsPage {...props} neuralVoice={{ enabled: true, installed: true, progress: null }} />)
  expect(screen.getByRole('combobox', { name: /reading voice/i })).toBeDisabled()
  // Preview stays usable: it plays whichever voice is actually in use.
  expect(screen.getByRole('button', { name: /preview/i })).toBeEnabled()

  rerender(<SettingsPage {...props} neuralVoice={{ enabled: false, installed: true, progress: null }} />)
  expect(screen.getByRole('combobox', { name: /reading voice/i })).toBeEnabled()
})

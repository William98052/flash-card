import { expect, it, vi } from 'vitest'
import { createSpeechAdapter } from './speech-adapter'

it('reports unsupported browsers without throwing', () => {
  const adapter = createSpeechAdapter({} as Window)
  expect(adapter.capability).toBe('unsupported')
  expect(() => adapter.start()).not.toThrow()
})

it('emits listening, result, and stopped states from browser recognition', () => {
  class FakeRecognition {
    continuous = false
    interimResults = false
    lang = ''
    onstart?: () => void
    onend?: () => void
    onresult?: (event: unknown) => void
    start = vi.fn(() => this.onstart?.())
    stop = vi.fn(() => this.onend?.())
  }
  const fakeWindow = { webkitSpeechRecognition: FakeRecognition } as unknown as Window
  const adapter = createSpeechAdapter(fakeWindow)
  const listener = vi.fn()
  adapter.subscribe(listener)
  adapter.start()
  expect(listener).toHaveBeenCalledWith({ type: 'listening' })
  adapter.stop()
  expect(listener).toHaveBeenCalledWith({ type: 'stopped' })
})

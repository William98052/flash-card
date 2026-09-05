import { describe, expect, it, vi } from 'vitest'
import { canProbeOnDevice, createSpeechAdapter, describeEnvironment, describeSpeechError, getSharedSpeechAdapter,  requestMicrophoneAccess, shouldRestartContinuous, type SpeechEvent } from './speech-adapter'

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

it('restarts continuous listening only after a normal stop', () => {
  expect(shouldRestartContinuous(true, { type: 'stopped' })).toBe(true)
  expect(shouldRestartContinuous(true, { type: 'error', reason: 'denied' })).toBe(false)
  expect(shouldRestartContinuous(false, { type: 'stopped' })).toBe(false)
})

it('maps every browser error code to a distinct, actionable reason', () => {
  expect(describeSpeechError('not-allowed').reason).toBe('denied')
  expect(describeSpeechError('service-not-allowed').reason).toBe('denied')
  expect(describeSpeechError('no-speech').reason).toBe('timeout')
  expect(describeSpeechError('audio-capture').message).toMatch(/no microphone/i)
  expect(describeSpeechError('network').message).toMatch(/network/i)
  expect(describeSpeechError('aborted').message).toMatch(/interrupted/i)
  expect(describeSpeechError('language-not-supported').message).toMatch(/chinese/i)
  expect(describeSpeechError('InvalidStateError').message).toMatch(/already running/i)
  expect(describeSpeechError('weird-code').message).toContain('weird-code')
})

describe('microphone pre-flight', () => {
  const withMedia = (impl: () => Promise<unknown>) => ({ mediaDevices: { getUserMedia: impl } }) as unknown as Navigator

  it('reports granted when the stream opens, and stops the tracks it opened', async () => {
    const stop = vi.fn()
    const result = await requestMicrophoneAccess(withMedia(async () => ({ getTracks: () => [{ stop }] })))
    expect(result.state).toBe('granted')
    expect(stop).toHaveBeenCalled()
  })

  it('distinguishes an OS/browser block from a missing device', async () => {
    const denied = await requestMicrophoneAccess(withMedia(() => Promise.reject(Object.assign(new Error('x'), { name: 'NotAllowedError' }))))
    expect(denied.state).toBe('blocked')
    expect(denied.message).toMatch(/allow the microphone/i)

    const missing = await requestMicrophoneAccess(withMedia(() => Promise.reject(Object.assign(new Error('x'), { name: 'NotFoundError' }))))
    expect(missing.state).toBe('no-device')
    expect(missing.message).toMatch(/no microphone/i)
  })

  it('reports unavailable when the browser exposes no capture API', async () => {
    const result = await requestMicrophoneAccess({} as Navigator)
    expect(result.state).toBe('unavailable')
  })
})

describe('environment report', () => {
  const win = (userAgent: string, brands?: { brand: string }[]) => ({
    isSecureContext: true,
    SpeechRecognition: function () {},
    navigator: { userAgent, ...(brands ? { userAgentData: { brands } } : {}) },
  }) as unknown as Window

  it('recognizes genuine Google Chrome as carrying the speech service', () => {
    const report = describeEnvironment(win('Mozilla/5.0 Chrome/148.0.0.0 Safari/537.36', [{ brand: 'Google Chrome' }, { brand: 'Chromium' }]))
    expect(report.browser).toBe('Google Chrome')
    expect(report.speechServiceLikelyMissing).toBe(false)
  })

  it('flags a Chromium shell that has no Google speech service', () => {
    const report = describeEnvironment(win('Mozilla/5.0 Claude/1.4 Chrome/148.0.0.0 Safari/537.36'))
    expect(report.speechServiceLikelyMissing).toBe(true)

    const brave = describeEnvironment(win('Mozilla/5.0 Chrome/148.0.0.0 Safari/537.36', [{ brand: 'Brave' }, { brand: 'Chromium' }]))
    expect(brave.browser).toBe('Brave')
    expect(brave.speechServiceLikelyMissing).toBe(true)
  })
})

it('shares one recognition object per window instead of building a new one per mount', () => {
  let constructed = 0
  class FakeRecognition {
    continuous = false; interimResults = false; lang = ''
    onstart = null; onend = null; onerror = null; onresult = null
    constructor() { constructed += 1 }
    start = vi.fn(); stop = vi.fn(); abort = vi.fn()
  }
  const fakeWindow = { SpeechRecognition: FakeRecognition } as unknown as Window
  const first = getSharedSpeechAdapter(fakeWindow)
  const second = getSharedSpeechAdapter(fakeWindow)
  expect(second).toBe(first)
  expect(constructed).toBe(1)
})

describe('responsiveness', () => {
  class Rec {
    static instances: Rec[] = []
    continuous = false; interimResults = false; lang = ''; processLocally = false
    running = false
    onstart: (() => void) | null = null
    onend: (() => void) | null = null
    onerror: ((e: { error?: string }) => void) | null = null
    onresult: ((e: unknown) => void) | null = null
    constructor() { Rec.instances.push(this) }
    start = vi.fn(() => {
      if (this.running) throw Object.assign(new Error('already started'), { name: 'InvalidStateError' })
      this.running = true; this.onstart?.()
    })
    stop = vi.fn(() => { this.running = false; this.onend?.() })
  }
  const makeWindow = () => { Rec.instances = []; return { SpeechRecognition: Rec } as unknown as Window }

  it('ignores a second start while already listening instead of raising an error', () => {
    const adapter = createSpeechAdapter(makeWindow())
    const events: string[] = []
    adapter.subscribe((e) => events.push(e.type))
    adapter.start()
    adapter.start()
    expect(events.filter((type) => type === 'error')).toHaveLength(0)
    expect(Rec.instances[0].start).toHaveBeenCalledTimes(1)
  })

  it('streams interim transcripts as partials and settles only on the final result', () => {
    const adapter = createSpeechAdapter(makeWindow())
    const events: SpeechEvent[] = []
    adapter.subscribe((e) => events.push(e))
    adapter.start()
    const fire = (transcript: string, isFinal: boolean) =>
      Rec.instances[0].onresult?.({ results: [Object.assign([{ transcript, confidence: .9 }], { isFinal })] })
    fire('xi', false)
    fire('xing', true)
    expect(events.map((e) => e.type)).toEqual(['listening', 'partial', 'result'])
    expect(events[2]).toMatchObject({ transcript: 'xing' })
  })

})

// The on-device path ships disabled (see ON_DEVICE_ENABLED); these keep it honest for the day Chrome fixes it.
describe('on-device recognition (opt-in plumbing)', () => {
  class Rec2 {
    static instances: Rec2[] = []
    continuous = false; interimResults = false; lang = ''; processLocally = false
    running = false
    onstart: (() => void) | null = null
    onend: (() => void) | null = null
    onerror: ((e: { error?: string }) => void) | null = null
    onresult: ((e: unknown) => void) | null = null
    constructor() { Rec2.instances.push(this) }
    start = vi.fn(() => { this.running = true; this.onstart?.() })
    stop = vi.fn(() => { this.running = false; this.onend?.() })
  }
  const chromeWindow = (Ctor: unknown) => ({
    SpeechRecognition: Ctor,
    navigator: { userAgent: 'Chrome/152.0.0.0 Safari/537.36', userAgentData: { brands: [{ brand: 'Google Chrome' }] } },
  }) as unknown as Window

  const build = (available: string, install = vi.fn(async () => true)) => {
    Rec2.instances = []
    const Ctor = Object.assign(Rec2, { available: vi.fn(async () => available), install })
    return { Ctor, adapter: createSpeechAdapter(chromeWindow(Ctor), { enableOnDevice: true }), install }
  }

  it('runs on-device with the Mandarin tag when the model is available', async () => {
    const { adapter } = build('available')
    await vi.waitFor(() => expect(adapter.mode).toBe('local'))
    adapter.start()
    const rec = Rec2.instances[0]
    expect(rec.lang).toBe('cmn-Hans-CN')
    expect(rec.processLocally).toBe(true)
  })

  it('downloads the model in the background and stays on the network meanwhile', async () => {
    const { adapter, install } = build('downloadable')
    await vi.waitFor(() => expect(install).toHaveBeenCalledWith({ langs: ['cmn-Hans-CN'], processLocally: true }))
    expect(adapter.mode).toBe('network')
    adapter.start()
    expect(Rec2.instances[0].lang).toBe('zh-CN')
    expect(Rec2.instances[0].processLocally).toBe(false)
  })


  it('upgrades to on-device once the background download finishes', async () => {
    Rec2.instances = []
    let state = 'downloadable'
    const install = vi.fn(async () => { state = 'available'; return true })
    const Ctor = Object.assign(Rec2, { available: vi.fn(async () => state), install })
    const adapter = createSpeechAdapter(chromeWindow(Ctor), { enableOnDevice: true })
    await vi.waitFor(() => expect(adapter.mode).toBe('local'))
    adapter.start()
    expect(Rec2.instances[0].lang).toBe('cmn-Hans-CN')
    expect(Rec2.instances[0].processLocally).toBe(true)
  })


  it('never reconfigures a running recognition — doing so makes Chrome drop the microphone', async () => {
    Rec2.instances = []
    let state = 'downloadable'
    const install = vi.fn(async () => { state = 'available'; return true })
    const Ctor = Object.assign(Rec2, { available: vi.fn(async () => state), install })
    const adapter = createSpeechAdapter(chromeWindow(Ctor), { enableOnDevice: true })
    adapter.start()
    const rec = Rec2.instances[0]
    expect(rec.lang).toBe('zh-CN')
    await vi.waitFor(() => expect(adapter.mode).toBe('local'))
    // the upgrade landed mid-recognition: the live object must be untouched
    expect(rec.lang).toBe('zh-CN')
    expect(rec.processLocally).toBe(false)
    // it takes effect on the next start instead
    rec.stop()
    adapter.start()
    expect(rec.lang).toBe('cmn-Hans-CN')
    expect(rec.processLocally).toBe(true)
  })

  it('falls back to the network without surfacing an error when on-device rejects the language', async () => {
    const { adapter } = build('available')
    await vi.waitFor(() => expect(adapter.mode).toBe('local'))
    const events: SpeechEvent[] = []
    adapter.subscribe((e) => events.push(e))
    adapter.start()
    const rec = Rec2.instances[0]
    rec.running = false
    rec.onerror?.({ error: 'language-not-supported' })
    expect(events.some((e) => e.type === 'error')).toBe(false)
    await vi.waitFor(() => expect(rec.lang).toBe('zh-CN'))
    expect(rec.processLocally).toBe(false)
    expect(adapter.mode).toBe('network')
  })
})

describe('on-device probe gating', () => {
  const win = (userAgent: string, brands?: { brand: string }[]) => ({
    navigator: { userAgent, ...(brands ? { userAgentData: { brands } } : {}) },
  }) as unknown as Window

  it('probes only in vendor builds that ship the speech component', () => {
    expect(canProbeOnDevice(win('Chrome/152.0.0.0 Safari/537.36', [{ brand: 'Google Chrome' }, { brand: 'Chromium' }]))).toBe(true)
    expect(canProbeOnDevice(win('Edg/152.0.0.0 Chrome/152.0.0.0', [{ brand: 'Microsoft Edge' }]))).toBe(true)
  })

  it('never probes a bare Chromium, a headless build, or an embedded shell — available() crashes them', () => {
    expect(canProbeOnDevice(win('Chrome/152.0.0.0 Safari/537.36', [{ brand: 'Chromium' }, { brand: 'Not/A)Brand' }]))).toBe(false)
    expect(canProbeOnDevice(win('HeadlessChrome/152.0.0.0 Safari/537.36', [{ brand: 'Google Chrome' }]))).toBe(false)
    expect(canProbeOnDevice(win('Claude/1.4 Chrome/148.0.0.0 Safari/537.36'))).toBe(false)
    expect(canProbeOnDevice(win('Chrome/152.0.0.0 Safari/537.36'))).toBe(false)
  })
})

describe('microphone pre-flight races', () => {
  it('skips opening a stream when permission is already granted', async () => {
    const getUserMedia = vi.fn()
    const nav = {
      permissions: { query: async () => ({ state: 'granted' }) },
      mediaDevices: { getUserMedia },
    } as unknown as Navigator
    const result = await requestMicrophoneAccess(nav)
    expect(result.state).toBe('granted')
    // Opening and immediately closing a device leaves it mid-teardown, and the
    // recognition that follows fails with `audio-capture`.
    expect(getUserMedia).not.toHaveBeenCalled()
  })

  it('still prompts by opening a stream when permission has not been granted yet', async () => {
    const stop = vi.fn()
    const getUserMedia = vi.fn(async () => ({ getTracks: () => [{ stop }] }))
    const nav = {
      permissions: { query: async () => ({ state: 'prompt' }) },
      mediaDevices: { getUserMedia },
    } as unknown as Navigator
    expect((await requestMicrophoneAccess(nav)).state).toBe('granted')
    expect(getUserMedia).toHaveBeenCalled()
  })
})

describe('on-device is disabled by default', () => {
  class Rec3 {
    static instances: Rec3[] = []
    continuous = false; interimResults = false; lang = ''; processLocally = false
    running = false
    onstart: (() => void) | null = null
    onend: (() => void) | null = null
    onerror: ((e: { error?: string }) => void) | null = null
    onresult: ((e: unknown) => void) | null = null
    onspeechend: (() => void) | null = null
    constructor() { Rec3.instances.push(this) }
    start = vi.fn(function (this: Rec3) { this.running = true; this.onstart?.() })
    stop = vi.fn(function (this: Rec3) { this.running = false; this.onend?.() })
    abort = vi.fn(function (this: Rec3) { this.running = false })
  }
  const chromeWin = (Ctor: unknown) => ({
    SpeechRecognition: Ctor,
    navigator: { userAgent: 'Chrome/152.0.0.0 Safari/537.36', userAgentData: { brands: [{ brand: 'Google Chrome' }] } },
  }) as unknown as Window

  it('stays on the network even when the on-device model reports available', async () => {
    Rec3.instances = []
    const Ctor = Object.assign(Rec3, { available: vi.fn(async () => 'available'), install: vi.fn(async () => true) })
    const adapter = createSpeechAdapter(chromeWin(Ctor))
    await Promise.resolve(); await Promise.resolve()
    adapter.start()
    expect(adapter.mode).toBe('network')
    expect(Rec3.instances[0].lang).toBe('zh-CN')
    expect(Rec3.instances[0].processLocally).toBe(false)
  })

  it('unsticks the UI when recognition goes silent after speech ends', async () => {
    vi.useFakeTimers()
    try {
      Rec3.instances = []
      const adapter = createSpeechAdapter(chromeWin(Rec3))
      const events: SpeechEvent[] = []
      adapter.subscribe((e) => events.push(e))
      adapter.start()
      Rec3.instances[0].onspeechend?.()
      expect(events.some((e) => e.type === 'stopped')).toBe(false)
      vi.advanceTimersByTime(6000)
      expect(events.some((e) => e.type === 'stopped')).toBe(true)
      expect(Rec3.instances[0].abort).toHaveBeenCalled()
    } finally { vi.useRealTimers() }
  })
})

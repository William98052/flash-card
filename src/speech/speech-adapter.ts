
export type SpeechEvent =
  | { type: 'listening' }
  | { type: 'stopped' }
  | { type: 'partial'; transcript: string }
  | { type: 'result'; transcript: string; confidence: number; alternatives: string[] }
  | { type: 'error'; reason: 'denied' | 'timeout' | 'failed'; code?: string; detail?: string }

type Listener = (event: SpeechEvent) => void
interface RecognitionLike {
  continuous: boolean
  interimResults: boolean
  lang: string
  maxAlternatives?: number
  onstart: (() => void) | null
  onend: (() => void) | null
  onerror: ((event: { error?: string; message?: string }) => void) | null
  onresult: ((event: { results: ArrayLike<ArrayLike<{ transcript: string; confidence: number }> & { isFinal?: boolean; length: number }> }) => void) | null
  processLocally?: boolean
  onaudiostart?: (() => void) | null
  onspeechstart?: (() => void) | null
  onspeechend?: (() => void) | null
  onaudioend?: (() => void) | null
  start(): void
  stop(): void
  abort?(): void
}
type RecognitionConstructor = (new () => RecognitionLike) & {
  available?(options: { langs: string[]; processLocally: boolean }): Promise<string>
  install?(options: { langs: string[]; processLocally: boolean }): Promise<boolean>
}

/**
 * Chrome's on-device model removes the round trip to Google's servers, which is
 * the bulk of the wait before a transcript appears, and it keeps working
 * offline. Two findings drive this code, measured on Chrome 152 (2026-09-05):
 *  - the local model is registered under the BCP-47 Mandarin tag
 *    `cmn-Hans-CN`; asking for `zh-CN` locally always fails with
 *    `language-not-supported`.
 *  - `available()` is not reliably sticky across sessions, so on-device can
 *    reject a request even after a successful install. Every start therefore
 *    falls back to the network path rather than trusting the probe.
 */
/**
 * `SpeechRecognition.available()` CRASHES the renderer in Chromium builds that
 * expose the API without the speech component behind it — verified against
 * Playwright's bundled Chromium, where the probe killed the page outright. Only
 * vendor builds that declare themselves in userAgentData get probed; everyone
 * else silently stays on the network path.
 */
export function canProbeOnDevice(targetWindow: Window): boolean {
  const nav = (targetWindow as unknown as { navigator?: { userAgent?: string; userAgentData?: { brands?: { brand: string }[] } } }).navigator
  const userAgent = nav?.userAgent ?? ''
  if (/Headless/i.test(userAgent)) return false
  const brands = (nav?.userAgentData?.brands ?? []).map((item) => item.brand)
  return brands.includes('Google Chrome') || brands.includes('Microsoft Edge')
}

/**
 * On-device recognition is DISABLED. Measured against Chrome 152 with a real
 * microphone (2026-09-05): with `processLocally` and `cmn-Hans-CN`, Chrome
 * captures audio and fires onaudiostart → onspeechstart → onspeechend, then
 * never delivers a result, an error, or an end event — the recognition hangs
 * and the UI is stranded on "Listening…". The network path is slower but works.
 * Flip this to true only once a Chrome release returns on-device Mandarin
 * results; the plumbing below is kept and tested for that day.
 */
export const ON_DEVICE_ENABLED = false
export const LOCAL_LANG = 'cmn-Hans-CN'
export const NETWORK_LANG = 'zh-CN'

export async function ensureLocalModel(Constructor: RecognitionConstructor, onUpgrade?: () => void): Promise<'local' | 'network'> {
  if (typeof Constructor?.available !== 'function') return 'network'
  const options = { langs: [LOCAL_LANG], processLocally: true }
  try {
    const state = await Constructor.available(options)
    speechLog('local:availability', { state })
    if (state === 'available') return 'local'
    if ((state === 'downloadable' || state === 'downloading') && typeof Constructor.install === 'function') {
      // Chrome reports `downloadable` again on each page load even once the model
      // is present, so re-check after installing and upgrade the live session.
      void Constructor.install(options)
        .then(async (ok) => {
          speechLog('local:install', { ok })
          if (!ok) return
          const settled = await Constructor.available!(options)
          speechLog('local:availability:after-install', { state: settled })
          if (settled === 'available') onUpgrade?.()
        })
        .catch((error) => speechLog('local:install:failed', { message: (error as Error)?.message }))
    }
    return 'network'
  } catch (error) {
    speechLog('local:availability:threw', { message: (error as Error)?.message })
    return 'network'
  }
}

export interface SpeechAdapter {
  capability: 'available' | 'unsupported'
  /** 'local' once on-device recognition is in use; 'network' otherwise. */
  readonly mode: 'local' | 'network'
  start(): void
  stop(): void
  subscribe(listener: Listener): () => void
}

/** Diagnostic trail. Readable from the console as `window.__speechLog`. */
export interface SpeechLogEntry { at: string; stage: string; detail?: unknown }
const trail: SpeechLogEntry[] = []
export function speechLog(stage: string, detail?: unknown): void {
  const entry: SpeechLogEntry = { at: new Date().toISOString(), stage, detail }
  trail.push(entry)
  if (trail.length > 200) trail.shift()
  console.info('[speech]', stage, detail ?? '')
  // Dev-only: mirror to the dev server so the log is readable outside the browser.
  if (import.meta.env?.DEV) {
    try { navigator.sendBeacon?.('/__speech-log', JSON.stringify(entry)) } catch { /* diagnostics must never break study */ }
  }
  const target = globalThis as unknown as { __speechLog?: SpeechLogEntry[] }
  target.__speechLog = trail
}

export interface SpeechErrorInfo { reason: 'denied' | 'timeout' | 'failed'; message: string }

/** Maps a SpeechRecognitionErrorEvent code to an actionable message. */
export function describeSpeechError(code: string): SpeechErrorInfo {
  switch (code) {
    case 'not-allowed':
      return { reason: 'denied', message: 'Microphone access was blocked. Allow the microphone for this site in your browser, then try again.' }
    case 'service-not-allowed':
      return { reason: 'denied', message: 'Your browser or operating system blocked its speech service. On macOS, check System Settings → Privacy & Security → Microphone, then try again.' }
    case 'no-speech':
      return { reason: 'timeout', message: 'Nothing was heard. Check that the right microphone is selected, then try again.' }
    case 'audio-capture':
      return { reason: 'failed', message: 'No microphone was found. Connect or select an input device, then try again.' }
    case 'network':
      return { reason: 'failed', message: 'Speech recognition could not reach the network speech service. Chrome sends audio to Google servers to transcribe it, so a VPN, firewall, or offline connection will block it.' }
    case 'aborted':
      return { reason: 'failed', message: 'Recognition was interrupted before it finished. Try again.' }
    case 'language-not-supported':
      return { reason: 'failed', message: 'This browser cannot recognize Chinese (zh-CN). Desktop Chrome or Edge supports it.' }
    case 'no-transcript':
      return { reason: 'timeout', message: 'No transcript came back in time. Try again, or judge manually.' }
    case 'InvalidStateError':
      return { reason: 'failed', message: 'Recognition was already running. Wait for it to stop, then try again.' }
    default:
      return { reason: 'failed', message: `Speech recognition failed (${code}). You can keep studying in manual mode.` }
  }
}

export interface MicrophoneCheck { state: 'granted' | 'blocked' | 'no-device' | 'unavailable' | 'failed'; message: string; code?: string }

/**
 * Opens a real capture stream before recognition starts. Chrome reports the
 * generic `service-not-allowed` when the OS or the browser blocks capture, so
 * this pre-flight is what tells the two apart — and it triggers the ordinary
 * permission prompt when the site has never been granted access.
 */
export async function requestMicrophoneAccess(nav: Navigator): Promise<MicrophoneCheck> {
  const capture = nav?.mediaDevices?.getUserMedia
  if (!capture) return { state: 'unavailable', message: 'This browser exposes no microphone capture API, so speech input cannot run here.' }
  // If access is already granted, do NOT open a stream: acquiring and releasing
  // the device leaves it mid-teardown, and the recognition that follows fails
  // immediately with `audio-capture`.
  try {
    const status = await nav.permissions?.query?.({ name: 'microphone' as PermissionName })
    if (status?.state === 'granted') {
      speechLog('microphone:already-granted')
      return { state: 'granted', message: 'Microphone access is granted.' }
    }
  } catch { /* Permissions API is optional; fall through to the prompt below. */ }
  try {
    const stream = await capture.call(nav.mediaDevices, { audio: true }) as MediaStream
    stream.getTracks().forEach((track) => track.stop())
    speechLog('microphone:granted')
    return { state: 'granted', message: 'Microphone access is granted.' }
  } catch (error) {
    const code = (error as Error)?.name ?? 'unknown'
    speechLog('microphone:denied', { code, message: (error as Error)?.message })
    if (code === 'NotAllowedError' || code === 'SecurityError')
      return { state: 'blocked', code, message: 'The microphone is blocked. Allow the microphone for this site in the browser, and allow your browser under macOS System Settings → Privacy & Security → Microphone.' }
    if (code === 'NotFoundError' || code === 'DevicesNotFoundError')
      return { state: 'no-device', code, message: 'No microphone was found. Connect an input device, then try again.' }
    if (code === 'NotReadableError' || code === 'TrackStartError')
      return { state: 'failed', code, message: 'The microphone is in use by another application. Close it, then try again.' }
    return { state: 'failed', code, message: `The microphone could not be opened (${code}).` }
  }
}

export interface EnvironmentReport {
  browser: string
  isChromium: boolean
  hasSpeechApi: boolean
  secureContext: boolean
  /** Chromium builds without Google's API keys always answer `service-not-allowed`. */
  speechServiceLikelyMissing: boolean
  userAgent: string
}

export function describeEnvironment(targetWindow: Window): EnvironmentReport {
  const scope = targetWindow as unknown as {
    SpeechRecognition?: unknown; webkitSpeechRecognition?: unknown; isSecureContext?: boolean
    navigator?: { userAgent?: string; userAgentData?: { brands?: { brand: string }[] } }
  }
  const userAgent = scope.navigator?.userAgent ?? ''
  const brands = (scope.navigator?.userAgentData?.brands ?? []).map((item) => item.brand)
  const named = brands.find((brand) => !/^(Chromium|Not[^a-zA-Z]*A[^a-zA-Z]*Brand|Not\?A_Brand)$/i.test(brand))
  const isChromium = /Chrome\//.test(userAgent) || brands.includes('Chromium')
  // Embedders (Electron, in-app shells) append their own product token to the UA.
  const shellToken = /\b(Electron|Claude|Brave|Arc|Opera|OPR|Vivaldi|Ungoogled)\b/i.test(userAgent)
  const isGoogleChrome = named === 'Google Chrome' || (!named && !shellToken && /Chrome\//.test(userAgent) && /Safari\//.test(userAgent) && !/Edg\//.test(userAgent))
  const isEdge = named === 'Microsoft Edge' || /Edg\//.test(userAgent)
  const browser = named ?? (isEdge ? 'Microsoft Edge' : isGoogleChrome ? 'Google Chrome' : isChromium ? 'Chromium-based browser' : /Safari\//.test(userAgent) ? 'Safari' : /Firefox\//.test(userAgent) ? 'Firefox' : 'Unknown browser')
  return {
    browser,
    isChromium,
    hasSpeechApi: Boolean(scope.SpeechRecognition ?? scope.webkitSpeechRecognition),
    secureContext: Boolean(scope.isSecureContext),
    speechServiceLikelyMissing: isChromium && !isGoogleChrome && !isEdge,
    userAgent,
  }
}

export function shouldRestartContinuous(enabled: boolean, event: SpeechEvent): boolean {
  return enabled && event.type === 'stopped'
}

export function createSpeechAdapter(targetWindow: Window, options: { enableOnDevice?: boolean } = {}): SpeechAdapter {
  const scope = targetWindow as unknown as {
    SpeechRecognition?: RecognitionConstructor
    webkitSpeechRecognition?: RecognitionConstructor
    isSecureContext?: boolean
    location?: { href?: string }
    navigator?: { userAgent?: string; onLine?: boolean }
  }
  const Constructor = scope.SpeechRecognition ?? scope.webkitSpeechRecognition
  const listeners = new Set<Listener>()
  const emit = (event: SpeechEvent) => { speechLog(`emit:${event.type}`, event); listeners.forEach((listener) => listener(event)) }
  speechLog('detect', {
    standard: Boolean(scope.SpeechRecognition),
    webkit: Boolean(scope.webkitSpeechRecognition),
    secureContext: scope.isSecureContext,
    href: scope.location?.href,
    online: scope.navigator?.onLine,
    userAgent: scope.navigator?.userAgent,
  })
  if (!Constructor) return { capability: 'unsupported', mode: 'network', start() {}, stop() {}, subscribe(listener) { listeners.add(listener); return () => listeners.delete(listener) } }

  const recognition = new Constructor()
  let mode: 'local' | 'network' = 'network'
  let localRejected = false
  const applyMode = () => {
    // Chrome drops the audio device if `lang` or `processLocally` change while a
    // recognition is live: it ends with `audio-capture` mid-utterance. The new
    // mode is picked up by the next start() instead.
    if (running) { speechLog('mode:deferred', { until: 'next start', mode }); return }
    const useLocal = mode === 'local' && !localRejected
    recognition.lang = useLocal ? LOCAL_LANG : NETWORK_LANG
    if ('processLocally' in recognition) recognition.processLocally = useLocal
  }
  recognition.lang = NETWORK_LANG
  recognition.continuous = false
  recognition.interimResults = true
  // Chrome's default of 1. Raising this to 5 alongside interimResults stopped
  // results arriving at all (measured 2026-09-05: repeated runs heard no speech
  // and delivered no transcript, while maxAlternatives=1 streamed normally).
  // The homophone index does the accuracy work instead; any alternatives Chrome
  // does return are still read below.
  recognition.maxAlternatives = 1
  let running = false
  let startedAt = 0
  let watchdog: ReturnType<typeof setTimeout> | undefined
  const clearWatchdog = () => { if (watchdog !== undefined) { clearTimeout(watchdog); watchdog = undefined } }
  const armWatchdog = () => {
    clearWatchdog()
    // Chrome can stop responding after endpointing, delivering no result, no
    // error and no end. Without this the button sticks on "Listening…" forever.
    watchdog = setTimeout(() => {
      if (!running) return
      speechLog('watchdog:timeout', { msSinceStart: Date.now() - startedAt })
      running = false
      try { recognition.abort?.() ?? recognition.stop() } catch { /* already gone */ }
      emit({ type: 'error', reason: 'timeout', code: 'no-transcript' })
      emit({ type: 'stopped' })
    }, 5000)
  }
  const useLocalMode = () => { if (localRejected) return; mode = 'local'; applyMode(); speechLog('recognition:mode', { mode, upgraded: true }) }
  const onDeviceEnabled = options.enableOnDevice ?? ON_DEVICE_ENABLED
  if (!onDeviceEnabled) speechLog('local:skipped', { reason: 'on-device Mandarin hangs without returning a result' })
  else if (!canProbeOnDevice(targetWindow)) speechLog('local:skipped', { reason: 'build does not ship the on-device speech component' })
  else void ensureLocalModel(Constructor, useLocalMode).then((resolved) => {
    if (mode === 'local') return
    mode = resolved; applyMode(); speechLog('recognition:mode', { mode })
  })
  recognition.onstart = () => { running = true; startedAt = Date.now(); speechLog('recognition:onstart'); emit({ type: 'listening' }) }
  recognition.onend = () => { clearWatchdog(); speechLog('recognition:onend', { msSinceStart: Date.now() - startedAt, wasRunning: running }); running = false; emit({ type: 'stopped' }) }
  recognition.onerror = (event) => {
    clearWatchdog()
    const code = event.error ?? 'unknown'
    speechLog('recognition:onerror', { code, message: event.message, msSinceStart: Date.now() - startedAt, wasRunning: running })
    running = false
    if (code === 'language-not-supported' && mode === 'local' && !localRejected) {
      // The probe said on-device was ready but it refused; drop to the network path and retry once.
      localRejected = true; mode = 'network'; applyMode()
      speechLog('local:rejected', { fallback: NETWORK_LANG })
      try { recognition.start() } catch { emit({ type: 'stopped' }) }
      return
    }
    const { reason } = describeSpeechError(code)
    emit({ type: 'error', reason, code, detail: event.message || undefined })
  }
  // Timing probes: they show whether latency is capture, endpointing, or the network service.
  recognition.onaudiostart = () => speechLog('recognition:onaudiostart', { msSinceStart: Date.now() - startedAt })
  recognition.onspeechstart = () => speechLog('recognition:onspeechstart', { msSinceStart: Date.now() - startedAt })
  recognition.onspeechend = () => { speechLog('recognition:onspeechend', { msSinceStart: Date.now() - startedAt }); armWatchdog() }
  recognition.onaudioend = () => speechLog('recognition:onaudioend', { msSinceStart: Date.now() - startedAt })
  recognition.onresult = (event) => {
    clearWatchdog()
    speechLog('recognition:onresult', { count: event.results.length, msSinceStart: Date.now() - startedAt })
    const latest = event.results[event.results.length - 1]
    const alternative = latest?.[0]
    if (!alternative) return
    if (latest.isFinal === false) { emit({ type: 'partial', transcript: alternative.transcript }); return }
    const alternatives: string[] = []
    for (let i = 0; i < (latest.length ?? 1); i += 1) { const item = latest[i]; if (item?.transcript) alternatives.push(item.transcript) }
    emit({ type: 'result', transcript: alternative.transcript, confidence: alternative.confidence, alternatives })
  }
  return {
    capability: 'available',
    get mode() { return localRejected ? 'network' : mode },
    start() {
      speechLog('adapter:start:called', { running, mode })
      applyMode()
      if (running) { speechLog('adapter:start:ignored', { reason: 'already listening' }); return }
      try { recognition.start() } catch (error) {
        speechLog('adapter:start:threw', { name: (error as Error)?.name, message: (error as Error)?.message, running })
        const code = (error as Error)?.name ?? 'start-threw'
        emit({ type: 'error', reason: describeSpeechError(code).reason, code, detail: describeSpeechError(code).message })
      }
    },
    stop() {
      speechLog('adapter:stop:called', { running })
      try { recognition.stop() } catch (error) { speechLog('adapter:stop:threw', { message: (error as Error)?.message }) }
    },
    subscribe(listener) { listeners.add(listener); return () => listeners.delete(listener) },
  }
}

/**
 * One adapter per window. React StrictMode double-invokes state initializers and
 * remounts routes, so building the adapter inline created several live
 * SpeechRecognition objects; only one can hold the microphone, and the strays
 * surfaced as `aborted` / InvalidStateError.
 */
const sharedAdapters = new WeakMap<Window, SpeechAdapter>()
export function getSharedSpeechAdapter(targetWindow: Window): SpeechAdapter {
  const existing = sharedAdapters.get(targetWindow)
  if (existing) return existing
  const adapter = createSpeechAdapter(targetWindow)
  sharedAdapters.set(targetWindow, adapter)
  return adapter
}

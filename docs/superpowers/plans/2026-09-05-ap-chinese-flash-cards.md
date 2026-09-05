# AP Chinese Flash Cards Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the complete local-first 汉字闪练 MVP described by the approved product definition, including 1,000 validated cards, study flows, management, speech assistance, import/export, and offline PWA support.

**Architecture:** A React/TypeScript PWA keeps UI components thin and puts business rules in framework-independent domain modules. Dexie owns transactional IndexedDB persistence through repository interfaces, while versioned seed data, Web Speech, JSON/CSV portability, and the service worker remain isolated adapters.

**Tech Stack:** React 19, TypeScript, Vite, React Router, Dexie, Zod, Vitest, Testing Library, fake-indexeddb, Playwright, vite-plugin-pwa

**Spec:** `docs/superpowers/specs/2026-09-05-ap-chinese-flash-card-design.md`

## Global Constraints

- The app is a local-first PWA with no account, server, cloud sync, analytics, ads, or API keys.
- The built-in collection is product-curated and must never be described as an official College Board list.
- Seed data contains exactly 1,000 unique simplified characters with complete readings, meanings, and either 1–6 compounds or exactly two examples.
- User data, settings, study state, and summaries persist in IndexedDB; audio and raw recognition text are never persisted.
- Normal study sessions exclude cards whose `contentStatus` is `needs_content`.
- Core interaction works at 320 CSS pixels, entirely by keyboard, and without speech support.
- Imported content is untrusted, size-limited, schema-validated, rendered as text, and committed transactionally only after confirmation.
- Production behavior is implemented with red–green–refactor TDD: each behavior gets a failing test before its implementation.

---

### Task 1: Project shell and executable test harness

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `vite.config.ts`
- Create: `playwright.config.ts`
- Create: `index.html`
- Create: `src/main.tsx`
- Create: `src/app/App.tsx`
- Create: `src/app/App.test.tsx`
- Create: `src/test/setup.ts`
- Create: `src/styles/global.css`

**Interfaces:**
- Produces: a renderable `<App />`, `npm test`, `npm run build`, and `npm run test:e2e`.

- [ ] **Step 1: Configure the package scripts and testing environment**

Add scripts for `dev`, `build`, `test`, `test:watch`, and `test:e2e`; configure jsdom, Testing Library cleanup, `fake-indexeddb/auto`, and a Vite `@/` alias.

- [ ] **Step 2: Write the failing shell test**

```tsx
it('renders the product name and local-first description', () => {
  render(<App />)
  expect(screen.getByRole('heading', { name: '汉字闪练' })).toBeVisible()
  expect(screen.getByText(/学习记录只保存在此浏览器/)).toBeVisible()
})
```

- [ ] **Step 3: Run the test and verify RED**

Run: `npm test -- src/app/App.test.tsx`
Expected: FAIL because `App` does not exist.

- [ ] **Step 4: Implement the accessible application shell and tokens**

Create the root landmark, skip link, header, local-storage notice, responsive typography/color tokens, visible focus styles, 44px controls, and reduced-motion defaults.

- [ ] **Step 5: Verify GREEN and build**

Run: `npm test -- src/app/App.test.tsx && npm run build`
Expected: the shell test and TypeScript production build pass.

### Task 2: Domain model and seed-data validator

**Files:**
- Create: `src/domain/types.ts`
- Create: `src/domain/libraries.ts`
- Create: `src/content/seed-schema.ts`
- Create: `src/content/validate-seed.ts`
- Create: `src/content/validate-seed.test.ts`
- Create: `scripts/validate-seed.ts`
- Create: `src/content/ap-1000.json`

**Interfaces:**
- Produces: `CharacterCard`, `Reading`, `Compound`, `Example`, `LibraryId`, `ReviewState`, `StudySession`, `SessionSummary`, and `AppSettings` types.
- Produces: `validateSeed(cards: unknown): CharacterCard[]`, which throws a path-specific validation error.

- [ ] **Step 1: Define validator expectations in failing tests**

Cover exact cardinality, unique single Han characters, tone-marked pinyin, non-empty English meanings, maximum six complete compounds, exactly two complete examples, stable IDs, and no placeholder strings.

```ts
expect(() => validateSeed(validCards.slice(0, 999))).toThrow(/exactly 1000/)
expect(() => validateSeed(withDuplicateCharacter)).toThrow(/unique character/)
expect(() => validateSeed(withSevenCompounds)).toThrow(/at most 6/)
```

- [ ] **Step 2: Run the tests and verify RED**

Run: `npm test -- src/content/validate-seed.test.ts`
Expected: FAIL because the schema and validator are missing.

- [ ] **Step 3: Implement the types and strict seed validator**

Use Zod for record shape validation and explicit collection-level checks. Restrict seed cards to `contentStatus: 'complete'`, require `seedVersion`, and keep `userEditedFields` empty.

- [ ] **Step 4: Author the versioned 1,000-card collection**

Populate `ap-1000.json` with unique simplified characters, tone-marked readings, concise English meanings, and natural AP-context compounds or examples. Use stable IDs of the form `seed-0001` through `seed-1000`.

- [ ] **Step 5: Verify content quality automatically**

Run: `npm test -- src/content/validate-seed.test.ts && npm run validate:seed`
Expected: 1,000 records validated with zero duplicates or incomplete fields.

### Task 3: Character extraction and library rules

**Files:**
- Create: `src/domain/character-extraction.ts`
- Create: `src/domain/character-extraction.test.ts`
- Create: `src/domain/library-service.ts`
- Create: `src/domain/library-service.test.ts`

**Interfaces:**
- Produces: `extractUniqueHan(input: string, existing: ReadonlySet<string>): ExtractionPreview`.
- Produces: pure `addMembership`, `removeMembership`, `addCards`, `editCard`, `deleteCard`, and `resetUnreviewed` operations over `LibraryState`.

- [ ] **Step 1: Test extraction before implementation**

Assert mixed multiline input extracts Han characters only, preserves first-seen order, separates existing characters, and reports ignored Unicode code points.

- [ ] **Step 2: Verify extraction RED, implement minimally, then verify GREEN**

Run RED and GREEN with: `npm test -- src/domain/character-extraction.test.ts`.

- [ ] **Step 3: Test library invariants before implementation**

Assert idempotent membership, overlapping tag libraries, automatic unreviewed membership for new cards, edit collision rejection, and delete cleanup across tags and review state.

- [ ] **Step 4: Verify library RED, implement pure transitions, then verify GREEN**

Run RED and GREEN with: `npm test -- src/domain/library-service.test.ts`.

### Task 4: Study engine and statistics settlement

**Files:**
- Create: `src/domain/study-engine.ts`
- Create: `src/domain/study-engine.test.ts`

**Interfaces:**
- Produces: `createSession(sourceLibraryId, eligibleIds, shuffle, now): StudySession`.
- Produces: `showCurrentCard(session, reviewStates): ReviewState[]`.
- Produces: `setPendingDecision(session, decision): StudySession`.
- Produces: `settleAndAdvance(session, state, now): SettlementResult`.
- Produces: `endSession(session, now): SessionSummary`.

- [ ] **Step 1: Test shuffled snapshot sessions before implementation**

Assert injected shuffle output is snapshotted, contains the full source set once, rejects empty sources, and is unaffected by later membership changes.

- [ ] **Step 2: Verify RED, implement session creation, verify GREEN**

Run: `npm test -- src/domain/study-engine.test.ts -t 'session creation'`.

- [ ] **Step 3: Test unreviewed lifecycle and one-time settlement**

Assert showing a card immediately removes its unreviewed flag; toggling a pending decision never updates totals; advancing settles exactly once; correct removes and incorrect adds the wrong-card membership; reset repopulates only on explicit action.

- [ ] **Step 4: Verify RED, implement transitions, verify GREEN**

Run: `npm test -- src/domain/study-engine.test.ts`.

### Task 5: IndexedDB persistence, migrations, and rollback

**Files:**
- Create: `src/data/database.ts`
- Create: `src/data/repository.ts`
- Create: `src/data/repository.test.ts`
- Create: `src/data/initialize.ts`
- Create: `src/data/initialize.test.ts`

**Interfaces:**
- Produces: `FlashCardDatabase extends Dexie` tables for cards, memberships, review states, sessions, summaries, settings, and metadata.
- Produces: `FlashCardRepository` transactional methods used by UI/application hooks.
- Produces: `initializeDatabase(db, seed): Promise<void>` with idempotent seed installation.

- [ ] **Step 1: Test clean initialization and reopen persistence**

Use fake-indexeddb to assert first run installs 1,000 cards and 1,000 unreviewed states, while a second initialization preserves user edits and statistics.

- [ ] **Step 2: Verify initialization RED, implement schema and seed transaction, verify GREEN**

Run: `npm test -- src/data/initialize.test.ts`.

- [ ] **Step 3: Test repository atomicity and migrations**

Force an exception midway through a multi-table transaction and assert pre-transaction cards, memberships, and review states remain unchanged. Test migration of the previous schema fixture.

- [ ] **Step 4: Verify RED, implement transactions/migrations, verify GREEN**

Run: `npm test -- src/data/repository.test.ts`.

### Task 6: JSON backup and CSV content portability

**Files:**
- Create: `src/portability/backup-schema.ts`
- Create: `src/portability/json-backup.ts`
- Create: `src/portability/json-backup.test.ts`
- Create: `src/portability/csv.ts`
- Create: `src/portability/csv.test.ts`

**Interfaces:**
- Produces: `exportBackup(snapshot): BackupV1` and `previewBackup(input): ImportPreview`.
- Produces: `commitBackup(db, validatedBackup): Promise<void>` as a single transaction.
- Produces: `exportCardsCsv(cards): string` and `parseCardsCsv(csv): CsvImportPreview`.

- [ ] **Step 1: Test JSON round-trip, invalid input, size limits, and rollback**

Assert all cards, memberships, review state, sessions, summaries, settings, metadata, and user-edit markers survive a round trip. Assert invalid or oversized input never writes.

- [ ] **Step 2: Verify JSON RED, implement validation/preview/transaction, verify GREEN**

Run: `npm test -- src/portability/json-backup.test.ts`.

- [ ] **Step 3: Test CSV quoting, multiline fields, content modes, and error rows**

Use quoted commas/newlines and assert CSV affects card content only—not memberships, settings, or statistics.

- [ ] **Step 4: Verify CSV RED, implement parser/exporter, verify GREEN**

Run: `npm test -- src/portability/csv.test.ts`.

### Task 7: Speech adapter and pronunciation matching

**Files:**
- Create: `src/speech/normalize.ts`
- Create: `src/speech/normalize.test.ts`
- Create: `src/speech/speech-adapter.ts`
- Create: `src/speech/speech-adapter.test.ts`

**Interfaces:**
- Produces: `normalizeRecognition(text: string): string[]`.
- Produces: `assessPronunciation(result, card, threshold): Assessment` with `correct`, `incorrect`, or `manual` status.
- Produces: `createSpeechAdapter(window): SpeechAdapter` with capability, permission-safe start/stop, timeout, and result events.

- [ ] **Step 1: Test normalization and polyphonic acceptance**

Cover recognized target characters, allowed reading forms, punctuation/case normalization, unrelated characters, low confidence, empty results, and the isolated `翻` command.

- [ ] **Step 2: Verify RED, implement normalization/assessment, verify GREEN**

Run: `npm test -- src/speech/normalize.test.ts`.

- [ ] **Step 3: Test adapter capability and failure states**

Inject a fake recognition constructor and assert unsupported, denied, timeout, no-result, listening, and stopped states without persisting transcripts or repeatedly requesting denied permission.

- [ ] **Step 4: Verify RED, implement adapter, verify GREEN**

Run: `npm test -- src/speech/speech-adapter.test.ts`.

### Task 8: Routing, home dashboard, and application state

**Files:**
- Create: `src/app/router.tsx`
- Create: `src/app/AppProviders.tsx`
- Create: `src/app/useRepository.ts`
- Create: `src/features/home/HomePage.tsx`
- Create: `src/features/home/HomePage.test.tsx`
- Modify: `src/app/App.tsx`

**Interfaces:**
- Produces routes `/`, `/study/:sessionId`, `/library`, `/summary/:sessionId`, and `/settings`.
- Consumes `FlashCardRepository`; home reads seven library counts, unreviewed progress, and active session.

- [ ] **Step 1: Test the home page states**

Assert seven named libraries with counts, disabled empty-library starts, overall unreviewed progress, active-session continuation, and navigation links.

- [ ] **Step 2: Verify RED, implement providers/router/home, verify GREEN**

Run: `npm test -- src/features/home/HomePage.test.tsx`.

### Task 9: Study page and round summary

**Files:**
- Create: `src/features/study/FlashCard.tsx`
- Create: `src/features/study/StudyPage.tsx`
- Create: `src/features/study/StudyPage.test.tsx`
- Create: `src/features/study/SummaryPage.tsx`
- Create: `src/features/study/SummaryPage.test.tsx`
- Create: `src/features/study/study.css`

**Interfaces:**
- Consumes the study engine, repository, and speech adapter.
- Produces UI for flip, pending/final decisions, labels, next card, early end, summary, and explicit new-round reset.

- [ ] **Step 1: Test front/back and input rules**

Assert the front contains only the target character and instructions; click, eligible Space, and front-side `翻` reveal the back; Space in inputs and `翻` on the back do nothing.

- [ ] **Step 2: Verify RED, implement card interaction, verify GREEN**

Run: `npm test -- src/features/study/StudyPage.test.tsx -t 'card interaction'`.

- [ ] **Step 3: Test decisions, tags, speech feedback, and navigation**

Assert manual decisions override automatic results; feedback contains text and symbol; repeated toggles settle once; next is explicit; speech unsupported/denied preserves all manual functions; live regions are polite.

- [ ] **Step 4: Verify RED, implement the complete study page, verify GREEN**

Run: `npm test -- src/features/study/StudyPage.test.tsx`.

- [ ] **Step 5: Test and implement summaries/new-round confirmation**

Assert correct totals and rate, home/retry actions, and an explicit confirmation before repopulating unreviewed cards.

Run RED then GREEN: `npm test -- src/features/study/SummaryPage.test.tsx`.

### Task 10: Library management and card editor

**Files:**
- Create: `src/features/library/LibraryPage.tsx`
- Create: `src/features/library/LibraryPage.test.tsx`
- Create: `src/features/library/AddCharactersDialog.tsx`
- Create: `src/features/library/CardEditor.tsx`
- Create: `src/features/library/ImportExportPanel.tsx`
- Create: `src/features/library/library.css`

**Interfaces:**
- Consumes extraction, library service, portability functions, and repository.
- Produces search/filter, add preview, edit/restore, delete confirmation, batch tag changes, and import/export UI.

- [ ] **Step 1: Test search, filters, and synchronized memberships**

Assert search by character/pinyin/English, library and completeness filters, idempotent batch tags, and current edited content across all views.

- [ ] **Step 2: Verify RED, implement list controls, verify GREEN**

Run: `npm test -- src/features/library/LibraryPage.test.tsx -t 'search and filters'`.

- [ ] **Step 3: Test add/edit/delete behavior**

Assert live extraction counts/preview, incomplete cards excluded from study, character collision guidance, user-edit markers, restore confirmation, delete confirmation, and complete membership/stat cleanup.

- [ ] **Step 4: Verify RED, implement dialogs/editor, verify GREEN**

Run: `npm test -- src/features/library/LibraryPage.test.tsx`.

- [ ] **Step 5: Test and implement JSON/CSV UI safeguards**

Assert accepted file types/sizes, preview counts, confirmation before overwrite, actionable validation errors, and download filenames.

Run RED then GREEN: `npm test -- src/features/library/LibraryPage.test.tsx -t 'import and export'`.

### Task 11: Settings, privacy, and destructive-action separation

**Files:**
- Create: `src/features/settings/SettingsPage.tsx`
- Create: `src/features/settings/SettingsPage.test.tsx`

**Interfaces:**
- Consumes repository settings and speech capability state.
- Produces continuous-`翻` toggle, permission guidance, local-data/voice privacy notices, backup reminder, reset defaults, and separately confirmed erase-all action.

- [ ] **Step 1: Test settings semantics and privacy copy**

Assert reset defaults preserves learning data, erase all requires exact confirmation, continuous listening is visible and off by default, and browser-vendor audio processing is disclosed.

- [ ] **Step 2: Verify RED, implement settings, verify GREEN**

Run: `npm test -- src/features/settings/SettingsPage.test.tsx`.

### Task 12: PWA installation, offline shell, and release E2E

**Files:**
- Modify: `vite.config.ts`
- Create: `public/manifest.webmanifest`
- Create: `public/icons/icon-192.png`
- Create: `public/icons/icon-512.png`
- Create: `e2e/study.spec.ts`
- Create: `e2e/library.spec.ts`
- Create: `e2e/backup.spec.ts`
- Create: `e2e/offline.spec.ts`
- Create: `e2e/responsive.spec.ts`
- Modify: `README.md`

**Interfaces:**
- Produces: installable manifest and generated service worker caching the app shell and seed content, never audio/user data.

- [ ] **Step 1: Write failing E2E tests for the required user journeys**

Cover starting from home, flip/decision/tag/next, session continuation after reload, manual override, mixed-text bulk add, JSON round trip, explicit new round, 320px layout, and offline manual study after first load.

- [ ] **Step 2: Run Playwright and verify RED**

Run: `npm run test:e2e`
Expected: FAIL for missing PWA/offline and unfinished journey behavior.

- [ ] **Step 3: Configure manifest and service worker; close integration gaps**

Precache hashed application assets and seed data, include update-failure fallback, add install metadata/icons, and fix only behavior required by the failing E2E tests.

- [ ] **Step 4: Verify the complete release candidate**

Run: `npm test && npm run validate:seed && npm run build && npm run test:e2e`
Expected: all unit/integration/E2E tests pass, seed validation reports exactly 1,000 valid cards, and the production build exits successfully.

- [ ] **Step 5: Perform documented manual checks**

Record Chrome/Edge microphone permission and recognition checks, another-browser manual-mode check, install/update/offline launch, clean-profile JSON recovery, keyboard-only navigation, reduced motion, and representative content sampling in `README.md` without claiming unchecked results.


---

## Post-Implementation Findings (2026-09-05)

Everything below was measured on this machine against Chrome 152 on macOS,
during a session that translated the UI to English and made speech usable.
Facts are separated from what remains unverified. Several of these were learned
by shipping a regression first, so they are written down to stop the next
person repeating them.

### The original bug was not in the code

Speech failed with `service-not-allowed`. The cause was that Chrome had been
running since before the microphone was granted to it in macOS System Settings.
**macOS binds TCC permissions when a process starts**, so an already-running
browser never sees a newly granted permission. Quitting and reopening Chrome
fixed it. Chrome also runs with `--no-startup-window`, so closing every window
is not enough — it must be `⌘Q` or a kill.

Diagnosis was slow because the UI collapsed six distinct
`SpeechRecognitionErrorEvent` codes into one "recognition failed" string. The
first real fix was diagnostic, not behavioural: map every code to a distinct,
actionable message (`describeSpeechError`), and log the recognition lifecycle.

### Chrome's recognizer: measured behaviour

- **A single short syllable is abandoned.** `onaudiostart`, `onspeechstart` and
  `onspeechend` all fire, `onend` arrives, and **no result is ever delivered**.
  Saying the syllable twice gives it enough audio to commit. This is the reason
  a learner finds they must speak twice, and it is what motivated the offline
  engine.
- **A recognition can hang with no result, no error and no end event**, which
  strands the UI on "Listening…". A watchdog is required; do not assume `onend`
  always arrives.
- **`maxAlternatives = 5` alongside `interimResults` stops results arriving
  altogether.** Repeated trials heard no speech and returned nothing, while
  `maxAlternatives = 1` streamed normally. Keep it at 1.
- **Never mutate a live recognition.** Changing `lang` or `processLocally` while
  running makes Chrome drop the audio device mid-utterance and report
  `audio-capture`. Defer configuration changes to the next `start()`.
- **Do not open and immediately close a `getUserMedia` stream before starting
  recognition.** The device is left mid-teardown and the recognition fails
  instantly with `audio-capture`. Query the Permissions API instead, and only
  open a stream when permission has not yet been granted.
- **Calling `start()` while already running throws `InvalidStateError`** and
  discards the in-flight attempt, so an impatient second click actively destroys
  a working recognition. Ignore the second call.
- **React StrictMode builds two `SpeechRecognition` objects per mount** when the
  adapter is created in a `useState` initializer, and the strays are never
  released. Share one adapter per window.
- **The confidence score is not usable as a gate.** Ambient noise has scored
  0.89 while real speech scored lower. Confidence may only choose between
  "incorrect" and "ask the learner"; it must never veto a reading that matched.

### On-device recognition: available, and unusable for Mandarin

Chrome 138+ exposes `SpeechRecognition.available()` / `install()` and a
`processLocally` flag. It is **disabled** in this codebase
(`ON_DEVICE_ENABLED = false`), with the plumbing and its tests kept behind the
flag. What was measured:

- The local model is registered under the BCP-47 Mandarin tag **`cmn-Hans-CN`**.
  Requesting `zh-CN` locally always fails with `language-not-supported`.
- With the correct tag and the model installed, Chrome **captures audio and then
  hangs**: speech start and end fire, and no result, error or end ever arrives.
- `available()` is **not sticky across page loads** — it reports `downloadable`
  again even after `install()` succeeded, so a one-shot probe leaves the session
  on the network path. A post-install re-check is needed.
- `available()` **crashes the renderer outright** in Chromium builds that expose
  the API without the speech component behind it (reproduced against
  Playwright's bundled Chromium). Probe only in builds declaring `Google Chrome`
  or `Microsoft Edge` in `userAgentData.brands`, never headless or embedded
  shells. See `canProbeOnDevice`.

Chromium builds without Google's API keys — Brave, Arc, ungoogled Chromium,
Electron shells, in-app browser panes — return `service-not-allowed`
permanently. No permission change helps; the UI now says so explicitly.

### Matching is where the accuracy actually is

Recognizing a lone syllable is the hardest case for general speech recognition:
there is no context. Judging the transcript against the card's **known** readings
turns a guess into a decision. Three rules, all measured against the real seed:

- **Homophones.** Saying 行 correctly often returns 型 or 形. **228 readings in
  the 1,000-card seed are shared by two or more characters**; `shi` alone covers
  25 cards. Exact-character matching marked all of these wrong.
- **Letter names.** Chrome writes a syllable as a Latin letter when the letter's
  name matches: 闭 (bì) comes back as **"B"**, because B is said "bee". **15
  letters collide with readings in the seed, covering 109 cards** — B→bi,
  G→ji (22 cards), E→yi (13), V→wei (12), J→jie (10) and others. Only a lone
  letter is expanded; longer romanized text is left alone.
- **Repeats.** Because Chrome drops single syllables, learners repeat themselves
  and the transcript arrives as `"b b"`. Split on whitespace and judge each
  attempt separately, so a repeat — or a self-correction where only the last
  attempt was right — counts.

A match settles the card automatically and reveals the answer. **A non-match
never auto-fails**: misrecognition is common enough that failing a learner who
spoke correctly is the worse error.

### Tone checking

Tone is the **shape of the pitch curve**, which Chrome discards entirely. It is
recovered locally with autocorrelation pitch detection and no model or network.

The key design point: **do not compare the learner's audio against a TTS
reference.** Two speakers differ far more in pitch and timbre than the same
speaker saying two different words, so a similarity score mostly reports who is
speaking. Instead, the expected tone is read from the mark on the card's pinyin
(`xīng`/`xíng`/`xǐng`/`xìng`), and the recorded contour is measured **in
semitones relative to the speaker's own median**, so only its shape matters. A
low voice and a high voice score identically for the same tone.

Verified through the real pipeline: flat→1, rising→2, falling→4. Unverified:
behaviour on real speech, where short or quiet syllables are noisy and tone 3 is
the hardest to detect.

### Playback

Chrome ships **offline** Chinese voices on macOS (Tingting, Shelley, Eddy, all
`localService: true`), so playback needs no network. Note that
`speechSynthesis.getVoices()` **returns an empty array on first call** — the list
populates asynchronously — so wait for `voiceschanged` before concluding that no
Chinese voice exists. Curiously, the same system voices produce silence via the
`say` CLI on this machine while working correctly inside Chrome.

### Offline recognition (vosk-browser)

**Outcome: tried, measured against real speech, and parked.** Accuracy was
worse than Chrome's cloud recognizer in practice, so the setting now defaults
off. The engine, its tests and the toggle remain in place for anyone who wants
to revisit it with a larger model.

`vosk-browser` (Kaldi in WebAssembly) with the small Mandarin model is an
alternative engine, switchable in Settings. It records a **fixed 2.5s window**
rather than leaving endpointing to the browser, which is what removes the
"must speak twice" problem at its root. One recording answers both questions:
transcript for the syllable, pitch contour for the tone.

Sizing matters and nearly broke the build:

- The recognizer runtime is **~6.7 MB of WASM**; a static import put it in the
  main bundle, taking it from 960 KB to 6.77 MB and breaking the service-worker
  precache. It must be imported on demand.
- The model is **~42 MB**, is not committed, and is fetched by
  `npm run fetch:model`. Both it and the lazy chunk are excluded from precaching.
- Result: main bundle 960 KB and precache 976 KB, unchanged from before.
- Measured: model loads in ~1.1s once cached, a 2.5s clip transcribes in
  ~0.5–1.1s, and **silence returns an empty transcript** rather than an invented
  one — unlike Whisper, which hallucinates on short clips.
- Deploying this requires hosting the 42 MB model alongside the app.
- `vosk-browser` depends on `uuid <11.1.1`, a moderate advisory with no upstream
  fix.

### Testing limitations on this machine

These blocked verification repeatedly and should be expected again:

- **Chrome's fake audio device delivers no samples.** `--use-fake-device-for-
  media-stream` with a valid 16-bit PCM WAV yields `audio-capture` or
  `speechHeard: false`. Recognizer settings cannot be A/B tested here.
- **Chinese TTS cannot be synthesized from the CLI.** `say` with the zh_CN
  voices produces ~0.016s of silence, so no Mandarin test audio can be generated.
- Consequently **recognition accuracy on real Mandarin is unverified** for both
  engines. Only plumbing was exercised. A real microphone and a human voice are
  the only way to confirm it.
- A browser-side diagnostic relay was added for this reason: `speechLog` writes
  to `window.__speechLog` and mirrors to the dev server in development, so a log
  from a real session can be read outside the browser.

### Process notes

- **`npx tsc --noEmit` is not sufficient.** `tsc -b` applies stricter project
  settings and caught a test-fixture cast that `--noEmit` accepted. Run
  `npm run build` before claiming a change is done.
- Chrome accepted every one of `processLocally`, a mid-flight `lang` change, and
  `maxAlternatives = 5` **without error while silently breaking recognition**.
  Recognizer settings must be verified against a real microphone before shipping,
  not merely observed to "apply".
- Vite ignores the `PORT` environment variable by default; `server.port` now
  honours it so the dev server need not hold port 5173.

---

## Playback Findings (2026-09-05)

Once recognition was usable, attention moved to the "Hear it" button. Playback
turned out to matter more than expected for study, and to have its own traps.

### The voice being used was the wrong one

`pickChineseVoice` originally preferred any `zh-CN` voice that ran locally, and
so selected **Eddy**. macOS ships a set of *character* voices — Eddy, Flo,
Grandma, Grandpa, Reed, Rocko, Sandy, Shelley — in every language, and they
sound like novelties rather than speech. This was the whole of the "quality"
complaint: nothing was broken, the app was simply choosing a joke voice.

Voices are now ranked, best first:

1. **Chrome's Google Mandarin voice**, judged the best available. It is a
   *network* voice, so it is preferred despite needing connectivity.
2. **Tingting** (zh-CN) and **Meijia** (zh-TW), the natural local voices.
3. Everything else.
4. Character voices, last.

An explicit choice in Settings always wins over the ranking. macOS *enhanced*
voices, installed through System Settings → Accessibility → Spoken Content,
appear in the picker automatically and are the best offline option.

`speechSynthesis.getVoices()` **returns an empty array on the first call** — the
list populates asynchronously — so waiting for `voiceschanged` is required
before concluding that no Chinese voice exists. Note also that the same system
voices produce silence through the `say` CLI on this machine while working
correctly inside Chrome, which makes CLI-generated Mandarin audio impossible
here.

### Neural TTS (Piper), available but not the default

`@diffusionstudio/vits-web` runs Piper's `zh_CN-huayan-medium` VITS model in
WebAssembly, entirely locally. It is offered as an opt-in upgrade rather than
the default, because the Google voice was judged better in practice and a 60 MB
download should be a choice.

- Synthesis takes **1–2 seconds per character**, far too slow for a button
  press. Audio is therefore prepared in the background as soon as a card is
  shown, and cached; replaying prepared audio is instant (2.0s to prepare, 0ms
  to replay). The cache evicts oldest-first, never caches a failure, and never
  starts a second synthesis for a character already in flight.
- Playback **never blocks**: the neural voice is used only when that card's
  audio is already prepared, otherwise the system voice speaks immediately.
- The model is ~60 MB, stored in **OPFS, which is per browser profile**, so each
  profile downloads it once. Deploying the app means hosting it too.
- Sizing follows the rule established by the speech model: the ONNX runtime and
  the Piper chunk are imported on demand and excluded from precaching, leaving
  the main bundle at 964 KB and the precache at 980 KB.

### Settings UI: a control that lies is worse than no control

Two bugs here were purely about the interface telling the truth, and both were
reported as "the setting does nothing":

- **Preview must play what the cards play.** It originally always used the
  system voice, so toggling the neural voice and pressing Preview sounded
  identical and the setting appeared dead. The setting had been working the
  whole time.
- **Disable what has stopped having an effect.** While the neural voice reads
  the cards, nothing in the system-voice picker changes playback, so the
  dropdown is disabled and says why. The Preview button stays enabled — and
  must not be *dimmed* either, since a control that looks disabled is disabled
  as far as the reader is concerned. Checking `isEnabled()` was not a sufficient
  test; computed opacity was the thing that mattered.

### Verifying audio

Asserting that an `Audio` object was constructed proves nothing about playback.
Confirm the `playing` event fires and `currentTime` advances. Distinguishing
which engine actually spoke is best done by wrapping both
`speechSynthesis.speak` and `window.Audio` and recording which fires.

Toggling a React-controlled checkbox from a test is unreliable; writing the
preference straight into IndexedDB (`hanzi-flash-practice` → `settings`) and
reloading gives a clean comparison.

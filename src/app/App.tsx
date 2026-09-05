import '@/styles/global.css'
import { BrowserRouter } from 'react-router-dom'
import { AppProviders } from './AppProviders'
import { AppRoutes } from './router'

export function App() {
  return (
    <BrowserRouter>
      <AppProviders>
      <a className="skip-link" href="#main">Skip to main content</a>
      <header className="site-header">
        <div>
          <p className="eyebrow">AP Chinese · Local-first</p>
          <h1>Hanzi Flash</h1>
        </div>
        <nav aria-label="Main navigation"><a href="/">Home</a><a href="/library">Manage cards</a><a href="/settings">Settings</a></nav>
      </header>
      <main id="main" className="page-shell">
        <p className="storage-note">Your study data stays in this browser only. No account needed, and manual review keeps working offline.</p>
        <AppRoutes />
      </main>
      </AppProviders>
    </BrowserRouter>
  )
}

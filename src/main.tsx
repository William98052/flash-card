import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from './app/App'
import { registerSW } from 'virtual:pwa-register'

registerSW({ immediate: true, onRegisterError: () => console.info('Offline caching is unavailable right now; the page still works.') })

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

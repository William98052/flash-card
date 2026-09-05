import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from './app/App'
import { registerSW } from 'virtual:pwa-register'

registerSW({ immediate: true, onRegisterError: () => console.info('离线缓存暂时不可用；当前页面仍可继续使用。') })

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

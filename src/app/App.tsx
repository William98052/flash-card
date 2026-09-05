import '@/styles/global.css'
import { BrowserRouter } from 'react-router-dom'
import { AppProviders } from './AppProviders'
import { AppRoutes } from './router'

export function App() {
  return (
    <BrowserRouter>
      <AppProviders>
      <a className="skip-link" href="#main">跳到主要内容</a>
      <header className="site-header">
        <div>
          <p className="eyebrow">AP Chinese · 本地优先</p>
          <h1>汉字闪练</h1>
        </div>
        <nav aria-label="主导航"><a href="/">首页</a><a href="/library">字库管理</a><a href="/settings">设置</a></nav>
      </header>
      <main id="main" className="page-shell">
        <p className="storage-note">学习记录只保存在此浏览器。无需注册，离线也能继续手动复习。</p>
        <AppRoutes />
      </main>
      </AppProviders>
    </BrowserRouter>
  )
}

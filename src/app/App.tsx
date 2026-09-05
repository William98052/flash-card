import '@/styles/global.css'

export function App() {
  return (
    <>
      <a className="skip-link" href="#main">跳到主要内容</a>
      <header className="site-header">
        <div>
          <p className="eyebrow">AP Chinese · 本地优先</p>
          <h1>汉字闪练</h1>
        </div>
      </header>
      <main id="main" className="page-shell">
        <section className="welcome-card" aria-labelledby="welcome-title">
          <p className="eyebrow">欢迎回来</p>
          <h2 id="welcome-title">每天认识一点，考场从容一点。</h2>
          <p>学习记录只保存在此浏览器。无需注册，离线也能继续手动复习。</p>
        </section>
      </main>
    </>
  )
}

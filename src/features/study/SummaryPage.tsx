interface Props { completed: number; correct: number; incorrect: number; unreviewedEmpty: boolean; onNewRound(): void }

export function SummaryPage({ completed, correct, incorrect, unreviewedEmpty, onNewRound }: Props) {
  const accuracy = completed ? Math.round((correct / completed) * 100) : 0
  return <section className="summary-card">
    <p className="eyebrow">本轮完成</p><h2>练得漂亮。</h2><div className="accuracy">{accuracy}%</div>
    <dl className="summary-stats"><div><dt>完成</dt><dd>{completed}</dd></div><div><dt>正确</dt><dd>{correct}</dd></div><div><dt>错误</dt><dd>{incorrect}</dd></div></dl>
    <div className="button-row"><a className="secondary-link" href="/">返回首页</a>{unreviewedEmpty && <button className="primary-button" onClick={onNewRound}>开始新一轮</button>}</div>
  </section>
}

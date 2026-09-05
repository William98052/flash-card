interface Props { completed: number; correct: number; incorrect: number; unreviewedEmpty: boolean; onNewRound(): void }

export function SummaryPage({ completed, correct, incorrect, unreviewedEmpty, onNewRound }: Props) {
  const accuracy = completed ? Math.round((correct / completed) * 100) : 0
  return <section className="summary-card">
    <p className="eyebrow">Round complete</p><h2>Nicely done.</h2><div className="accuracy">{accuracy}%</div>
    <dl className="summary-stats"><div><dt>Completed</dt><dd>{completed}</dd></div><div><dt>Correct</dt><dd>{correct}</dd></div><div><dt>Incorrect</dt><dd>{incorrect}</dd></div></dl>
    <div className="button-row"><a className="secondary-link" href="/">Back to home</a>{unreviewedEmpty && <button className="primary-button" onClick={onNewRound}>Start a new round</button>}</div>
  </section>
}

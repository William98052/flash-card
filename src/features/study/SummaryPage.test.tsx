import { render, screen } from '@testing-library/react'
import { SummaryPage } from './SummaryPage'

it('shows totals and offers an explicit new round when unreviewed is empty', () => {
  render(<SummaryPage completed={10} correct={8} incorrect={2} unreviewedEmpty onNewRound={() => {}} />)
  expect(screen.getByText('80%')).toBeVisible()
  expect(screen.getByRole('button', { name: /开始新一轮/ })).toBeVisible()
})

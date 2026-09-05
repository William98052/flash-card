import { render, screen } from '@testing-library/react'
import { App } from './App'

it('renders the product name and local-first description', () => {
  render(<App />)
  expect(screen.getByRole('heading', { name: 'Hanzi Flash' })).toBeVisible()
  expect(screen.getByText(/Your study data stays in this browser only/)).toBeVisible()
})

it('provides navigation to home, library management, and settings', () => {
  render(<App />)
  expect(screen.getByRole('link', { name: 'Home' })).toBeVisible()
  expect(screen.getByRole('link', { name: 'Manage cards' })).toBeVisible()
  expect(screen.getByRole('link', { name: 'Settings' })).toBeVisible()
})

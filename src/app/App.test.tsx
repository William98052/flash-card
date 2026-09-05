import { render, screen } from '@testing-library/react'
import { App } from './App'

it('renders the product name and local-first description', () => {
  render(<App />)
  expect(screen.getByRole('heading', { name: '汉字闪练' })).toBeVisible()
  expect(screen.getByText(/学习记录只保存在此浏览器/)).toBeVisible()
})

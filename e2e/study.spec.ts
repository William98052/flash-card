import { expect, test } from '@playwright/test'

test('starts a library, flips, judges, and advances explicitly', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('button', { name: 'Start All characters' })).toBeEnabled()
  await page.getByRole('button', { name: 'Start All characters' }).click()
  await expect(page).toHaveURL(/\/study\//)
  const card = page.getByRole('button', { name: 'Flip card' })
  await expect(card).toBeVisible()
  await card.click()
  await page.getByRole('button', { name: /Correct/ }).click()
  await expect(page).toHaveURL(/\/study\//)
  await page.getByRole('button', { name: /Next/ }).click()
  await expect(page.getByText('2 / 1000')).toBeVisible()
})

test('continues an unfinished session after reload', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Start All characters' }).click()
  await expect(page).toHaveURL(/\/study\//)
  const sessionUrl = page.url()
  await page.goto('/')
  await expect(page.getByRole('link', { name: /Resume last session/ })).toBeVisible()
  await page.getByRole('link', { name: /Resume last session/ }).click()
  await expect(page).toHaveURL(sessionUrl)
})

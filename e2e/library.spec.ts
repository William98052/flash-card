import { expect, test } from '@playwright/test'

test('extracts only unique Han characters from mixed text', async ({ page }) => {
  await page.goto('/library')
  await page.getByRole('button', { name: /Add characters/ }).click()
  await page.getByRole('textbox', { name: /Paste text/ }).fill('龘 A 123 龘')
  await expect(page.getByText('To add 1')).toBeVisible()
  await page.getByRole('button', { name: 'Add them' }).click()
  await expect(page.getByText('龘')).toBeVisible()
  await expect(page.locator('.status', { hasText: 'Needs content' })).toBeVisible()
})

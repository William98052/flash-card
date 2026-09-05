import { expect, test } from '@playwright/test'

test('extracts only unique Han characters from mixed text', async ({ page }) => {
  await page.goto('/library')
  await page.getByRole('button', { name: /添加汉字/ }).click()
  await page.getByRole('textbox', { name: /粘贴文本/ }).fill('龘 A 123 龘')
  await expect(page.getByText('将添加 1')).toBeVisible()
  await page.getByRole('button', { name: '确认添加' }).click()
  await expect(page.getByText('龘')).toBeVisible()
  await expect(page.locator('.status', { hasText: '内容待完善' })).toBeVisible()
})

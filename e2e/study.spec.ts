import { expect, test } from '@playwright/test'

test('starts a library, flips, judges, and advances explicitly', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('button', { name: '全部字库 开始' })).toBeEnabled()
  await page.getByRole('button', { name: '全部字库 开始' }).click()
  await expect(page).toHaveURL(/\/study\//)
  const card = page.getByRole('button', { name: '翻开字卡' })
  await expect(card).toBeVisible()
  await card.click()
  await page.getByRole('button', { name: /正确/ }).click()
  await expect(page).toHaveURL(/\/study\//)
  await page.getByRole('button', { name: /下一张/ }).click()
  await expect(page.getByText('2 / 1000')).toBeVisible()
})

test('continues an unfinished session after reload', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: '全部字库 开始' }).click()
  await expect(page).toHaveURL(/\/study\//)
  const sessionUrl = page.url()
  await page.goto('/')
  await expect(page.getByRole('link', { name: /继续上次学习/ })).toBeVisible()
  await page.getByRole('link', { name: /继续上次学习/ }).click()
  await expect(page).toHaveURL(sessionUrl)
})

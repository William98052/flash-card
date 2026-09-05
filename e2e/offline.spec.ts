import { expect, test } from '@playwright/test'

test('reopens the cached app in manual mode while offline', async ({ page, context }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: /选一个字库/ })).toBeVisible()
  await page.evaluate(() => navigator.serviceWorker.ready)
  await page.reload()
  await page.waitForFunction(() => Boolean(navigator.serviceWorker.controller))
  await context.setOffline(true)
  await page.reload()
  await expect(page.getByRole('heading', { name: /选一个字库/ })).toBeVisible()
})

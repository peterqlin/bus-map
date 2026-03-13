import { test, expect } from '@playwright/test';

test('map canvas is visible', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('canvas')).toBeVisible({ timeout: 10000 });
});

test('sidebar shows routes heading', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByText('Routes')).toBeVisible({ timeout: 5000 });
});

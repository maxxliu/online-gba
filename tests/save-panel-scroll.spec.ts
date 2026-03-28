import { test, expect, type Locator } from '@playwright/test';

async function assertPanelScrollability(panel: Locator) {
  // Panel should NOT have a restrictive inline touch-action from Framer Motion
  const panelInlineTouchAction = await panel.evaluate((el: HTMLElement) => el.style.touchAction);
  expect(panelInlineTouchAction).toBe('');

  // Panel has overflow: hidden
  const panelOverflow = await panel.evaluate((el: HTMLElement) => getComputedStyle(el).overflow);
  expect(panelOverflow).toBe('hidden');

  // Header has touch-action: none (drag-to-dismiss zone)
  const header = panel.locator('> div').first();
  const headerTouchAction = await header.evaluate((el: HTMLElement) => getComputedStyle(el).touchAction);
  expect(headerTouchAction).toBe('none');

  // Content has touch-action: pan-y + overflow-y: auto (scroll zone)
  const content = panel.locator('> div').nth(1);
  const contentStyles = await content.evaluate((el: HTMLElement) => {
    const s = getComputedStyle(el);
    return { touchAction: s.touchAction, overflowY: s.overflowY };
  });
  expect(contentStyles.touchAction).toBe('pan-y');
  expect(contentStyles.overflowY).toBe('auto');
}

test.describe('mobile panel scrollability', () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/');
    await page.waitForTimeout(2000);
  });

  test('save states panel', async ({ page }) => {
    await page.locator('button:has-text("Saves")').first().click();
    await page.waitForTimeout(500);
    const panel = page.locator('[role="dialog"][aria-label="Save States"]');
    await expect(panel).toBeVisible({ timeout: 5_000 });
    await assertPanelScrollability(panel);
  });

  test('library panel', async ({ page }) => {
    await page.locator('button:has-text("Library")').first().click();
    await page.waitForTimeout(500);
    const panel = page.locator('[role="dialog"][aria-label="ROM Library"]');
    await expect(panel).toBeVisible({ timeout: 5_000 });
    await assertPanelScrollability(panel);
  });

  test('settings panel', async ({ page }) => {
    await page.locator('button:has-text("Settings")').first().click();
    await page.waitForTimeout(500);
    const panel = page.locator('[role="dialog"][aria-label="Settings"]');
    await expect(panel).toBeVisible({ timeout: 5_000 });
    await assertPanelScrollability(panel);
  });

  test('profile panel', async ({ page }) => {
    await page.locator('button:has-text("Profile")').first().click();
    await page.waitForTimeout(500);
    const panel = page.locator('[role="dialog"][aria-label="Profile"]');
    await expect(panel).toBeVisible({ timeout: 5_000 });
    await assertPanelScrollability(panel);
  });
});

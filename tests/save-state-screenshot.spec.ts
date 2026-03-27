import { test, expect } from '@playwright/test';
import { join } from 'path';

const TEST_ROM = join(__dirname, 'fixtures', 'test-blue-screen.gba');

test('save state screenshot captures non-black game frame', async ({ page }) => {
  // Navigate and wait for WASM init
  await page.goto('/');
  await page.waitForTimeout(3000); // Allow WASM module to initialize

  // Open library panel
  const libraryButton = page.locator('button[aria-label*="ibrary"], button:has-text("Library")').first();
  await libraryButton.click();
  await page.waitForTimeout(500);

  // Upload test ROM via file input
  const fileInput = page.locator('input[type="file"]');
  await fileInput.setInputFiles(TEST_ROM);

  // Wait for upload to complete and ROM card to appear
  await page.waitForSelector('[class*="romCard"], [class*="RomCard"]', { timeout: 10_000 });
  await page.waitForTimeout(500);

  // Click Play on the ROM card
  const playButton = page.locator('button[aria-label*="lay"], button:has-text("Play")').first();
  await playButton.click();

  // Wait for emulator to be running — frames need time to render
  await page.waitForTimeout(3000);

  // Open saves panel
  const savesButton = page.locator('button[aria-label*="ave"], button:has-text("Save")').first();
  await savesButton.click();
  await page.waitForTimeout(500);

  // Click "Save Here" on an empty slot
  const saveHereButton = page.locator('button:has-text("Save Here")').first();
  await saveHereButton.click();

  // Wait for save to complete
  await page.waitForTimeout(2000);

  // Find the save state card's screenshot image
  const screenshotImg = page.locator('[class*="saveState"] img, [class*="SaveState"] img, [class*="screenshot"] img').first();
  await expect(screenshotImg).toBeVisible({ timeout: 10_000 });

  // Verify the src is a data URL PNG
  const src = await screenshotImg.getAttribute('src');
  expect(src).toBeTruthy();
  expect(src!).toMatch(/^data:image\/png;base64,/);

  // Decode the base64 PNG and check it has non-black pixel data
  const base64Data = src!.replace(/^data:image\/png;base64,/, '');
  expect(base64Data.length).toBeGreaterThan(100); // Non-trivial image data

  // Use the canvas to check actual pixel colors
  const hasNonBlackPixels = await page.evaluate(async (imgSrc: string) => {
    return new Promise<boolean>((resolve) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d')!;
        ctx.drawImage(img, 0, 0);
        const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;

        // Check if any pixel is non-black (R, G, or B > 0)
        for (let i = 0; i < data.length; i += 4) {
          if (data[i] > 10 || data[i + 1] > 10 || data[i + 2] > 10) {
            resolve(true);
            return;
          }
        }
        resolve(false);
      };
      img.onerror = () => resolve(false);
      img.src = imgSrc;
    });
  }, src!);

  expect(hasNonBlackPixels).toBe(true);
});

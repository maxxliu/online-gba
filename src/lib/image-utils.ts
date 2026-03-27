/**
 * Converts a Blob (e.g. downloaded JPEG) to a data URL string.
 */
export function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error('Failed to read blob'));
    reader.readAsDataURL(blob);
  });
}

/**
 * Compresses a screenshot data URL to a small JPEG blob.
 * Resizes to 120x80 at quality 0.7 — typically 2-5KB vs 100KB+ PNG.
 */
export async function compressScreenshot(dataUrl: string): Promise<Blob> {
  const img = new Image();
  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve();
    img.onerror = () => reject(new Error('Failed to load screenshot'));
    img.src = dataUrl;
  });

  const canvas = document.createElement('canvas');
  canvas.width = 120;
  canvas.height = 80;
  const ctx = canvas.getContext('2d')!;
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(img, 0, 0, 120, 80);

  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('Failed to compress screenshot'))),
      'image/jpeg',
      0.7,
    );
  });
}

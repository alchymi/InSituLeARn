const KEY_PREFIX = 'insitu:polaroid:';

export function polaroidKey(slug: string, targetId: string) {
  return `${KEY_PREFIX}${slug}:${targetId}`;
}

export function savePolaroid(slug: string, targetId: string, dataUrl: string) {
  try {
    localStorage.setItem(polaroidKey(slug, targetId), dataUrl);
  } catch {
    /* quota or private mode — silently ignore */
  }
}

export function loadPolaroid(slug: string, targetId: string): string | null {
  try {
    return localStorage.getItem(polaroidKey(slug, targetId));
  } catch {
    return null;
  }
}

export function dropPolaroids(slug: string) {
  try {
    const prefix = `${KEY_PREFIX}${slug}:`;
    const toDrop: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k?.startsWith(prefix)) toDrop.push(k);
    }
    toDrop.forEach((k) => localStorage.removeItem(k));
  } catch {
    /* ignore */
  }
}

/**
 * Composite a polaroid frame from the live camera video + Three.js canvas.
 * Returns a JPEG data URL or null on failure.
 */
export async function capturePolaroid(
  container: HTMLElement,
  rendererCanvas: HTMLCanvasElement
): Promise<string | null> {
  // Give the renderer two frames to paint the AR content before grabbing
  await new Promise<void>((r) => requestAnimationFrame(() => r()));
  await new Promise<void>((r) => requestAnimationFrame(() => r()));

  const video = container.querySelector('video');
  const out = document.createElement('canvas');
  const TARGET = 480;
  out.width = TARGET;
  out.height = TARGET;
  const ctx = out.getContext('2d');
  if (!ctx) return null;

  // Camera frame (centered square crop)
  if (video && video.videoWidth > 0) {
    const vw = video.videoWidth;
    const vh = video.videoHeight;
    const s = Math.min(vw, vh);
    ctx.drawImage(video, (vw - s) / 2, (vh - s) / 2, s, s, 0, 0, TARGET, TARGET);
  } else {
    ctx.fillStyle = '#09090B';
    ctx.fillRect(0, 0, TARGET, TARGET);
  }

  // Overlay the AR canvas
  if (rendererCanvas && rendererCanvas.width > 0) {
    const cw = rendererCanvas.width;
    const ch = rendererCanvas.height;
    const s = Math.min(cw, ch);
    try {
      ctx.drawImage(rendererCanvas, (cw - s) / 2, (ch - s) / 2, s, s, 0, 0, TARGET, TARGET);
    } catch {
      /* may fail if canvas is tainted by cross-origin texture; ignore */
    }
  }

  // Polaroid post-processing — vignette
  const grad = ctx.createRadialGradient(TARGET / 2, TARGET / 2, TARGET * 0.28, TARGET / 2, TARGET / 2, TARGET * 0.62);
  grad.addColorStop(0, 'rgba(0,0,0,0)');
  grad.addColorStop(1, 'rgba(0,0,0,0.45)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, TARGET, TARGET);

  try {
    return out.toDataURL('image/jpeg', 0.78);
  } catch {
    return null;
  }
}

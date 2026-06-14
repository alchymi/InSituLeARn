import { Compiler } from 'mind-ar/dist/mindar-image.prod.js';

export async function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Impossible de lire cette image'));
    img.src = src;
  });
}

export async function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error('Lecture du fichier impossible'));
    reader.readAsDataURL(file);
  });
}

export async function compileMindTarget(
  image: HTMLImageElement,
  onProgress: (p: number) => void
): Promise<Blob> {
  return compileMergedMindTargets([image], onProgress);
}

/**
 * Compile a merged .mind containing multiple targets. The anchor index
 * at runtime matches the array order passed in.
 */
export async function compileMergedMindTargets(
  images: HTMLImageElement[],
  onProgress: (p: number) => void
): Promise<Blob> {
  const compiler = new Compiler();
  await compiler.compileImageTargets(images, (p: number) => {
    onProgress(Math.max(0, Math.min(100, p)));
  });
  const data = await Promise.resolve(compiler.exportData());
  const buffer = data instanceof Uint8Array ? data : new Uint8Array(data as ArrayBuffer);
  return new Blob([buffer], { type: 'application/octet-stream' });
}

/**
 * Fetch a remote URL and turn it into an HTMLImageElement we can feed to the compiler.
 */
export async function fetchImage(url: string): Promise<HTMLImageElement> {
  const res = await fetch(url, { credentials: 'omit' });
  if (!res.ok) throw new Error(`HTTP ${res.status} en téléchargeant ${url}`);
  const blob = await res.blob();
  const objectUrl = URL.createObjectURL(blob);
  try {
    return await loadImage(objectUrl);
  } finally {
    // image is loaded and decoded; revoke the object url
    URL.revokeObjectURL(objectUrl);
  }
}

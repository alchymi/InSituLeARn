import { Compiler } from 'mind-ar/dist/mindar-image.prod.js';

const $ = <T extends HTMLElement>(sel: string) => document.querySelector(sel) as T;

const dropzone = $('#dropzone');
const fileInput = $('#file') as HTMLInputElement;
const preview = $('#preview');
const previewImg = $('#preview-img') as HTMLImageElement;
const previewName = $('#preview-name');
const previewDim = $('#preview-dim');
const progress = $('#progress');
const progressFill = $('#progress-fill');
const progressLabel = $('#progress-label');
const result = $('#result');
const resultSize = $('#result-size');
const downloadLink = $('#download') as HTMLAnchorElement;
const useNowBtn = $('#use-now') as HTMLButtonElement;

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Impossible de lire cette image'));
    img.src = src;
  });
}

function readDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error('Lecture du fichier impossible'));
    reader.readAsDataURL(file);
  });
}

async function handleFile(file: File) {
  if (!file.type.startsWith('image/')) {
    alert('Merci de fournir un fichier image (PNG ou JPG).');
    return;
  }

  // Reset UI
  result.hidden = true;
  progress.hidden = false;
  progressFill.style.width = '0%';
  progressLabel.textContent = 'Lecture de l\'image…';

  const dataUrl = await readDataUrl(file);
  const img = await loadImage(dataUrl);

  previewImg.src = dataUrl;
  previewName.textContent = file.name;
  previewDim.textContent = `${img.naturalWidth} × ${img.naturalHeight} px · ${(file.size / 1024).toFixed(0)} Ko`;
  preview.hidden = false;

  progressLabel.textContent = 'Compilation MindAR (peut prendre 10–60 s)…';

  try {
    const compiler = new Compiler();
    await compiler.compileImageTargets([img], (p: number) => {
      progressFill.style.width = `${Math.max(2, Math.min(100, p))}%`;
    });

    const data = await Promise.resolve(compiler.exportData());
    const buffer = data instanceof Uint8Array ? data : new Uint8Array(data as ArrayBuffer);
    const blob = new Blob([buffer], { type: 'application/octet-stream' });
    const url = URL.createObjectURL(blob);

    downloadLink.href = url;
    resultSize.textContent = `${(blob.size / 1024).toFixed(1)} Ko`;
    progress.hidden = true;
    result.hidden = false;

    useNowBtn.onclick = () => {
      sessionStorage.setItem('mindTargetBlob', url);
      location.href = '/';
    };
  } catch (err) {
    console.error(err);
    progressLabel.textContent = `Erreur : ${(err as Error)?.message || err}`;
    progressFill.style.width = '0%';
  }
}

dropzone.addEventListener('click', () => fileInput.click());

fileInput.addEventListener('change', () => {
  const f = fileInput.files?.[0];
  if (f) handleFile(f);
});

['dragenter', 'dragover'].forEach((ev) =>
  dropzone.addEventListener(ev, (e) => {
    e.preventDefault();
    dropzone.classList.add('drag-over');
  })
);
['dragleave', 'drop'].forEach((ev) =>
  dropzone.addEventListener(ev, (e) => {
    e.preventDefault();
    dropzone.classList.remove('drag-over');
  })
);

dropzone.addEventListener('drop', (e) => {
  const dt = (e as DragEvent).dataTransfer;
  const f = dt?.files?.[0];
  if (f) handleFile(f);
});

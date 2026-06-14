import * as THREE from 'three';
import { MindARThree } from 'mind-ar/dist/mindar-image-three.prod.js';

const $ = <T extends HTMLElement>(sel: string) => document.querySelector(sel) as T;

const container = $('#container');
const splash = $('#splash');
const topBar = $('#ui-top');
const viewfinder = $('#viewfinder');
const hint = $('#hint');
const trackingLabel = $('#tracking-label');
const trackingDot = document.querySelector('#tracking-badge .dot') as HTMLElement;
const startBtn = $('#start') as HTMLButtonElement;
const backBtn = $('#back');
const toast = $('#toast');

type TrackingState = 'idle' | 'searching' | 'found' | 'lost';

function setTracking(state: TrackingState, label: string) {
  trackingDot.className = 'dot';
  if (state !== 'idle') trackingDot.classList.add(`dot-${state}`);
  trackingLabel.textContent = label;
}

function showToast(msg: string, ms = 3000) {
  toast.textContent = msg;
  toast.hidden = false;
  window.setTimeout(() => (toast.hidden = true), ms);
}

function resolveTargetSrc(): string {
  // 1) Compiled in-session via /compile.html
  const sessionBlob = sessionStorage.getItem('mindTargetBlob');
  if (sessionBlob) return sessionBlob;
  // 2) Bundled in public/
  return '/targets.mind';
}

async function targetExists(url: string): Promise<boolean> {
  try {
    const res = await fetch(url, { method: 'HEAD' });
    return res.ok;
  } catch {
    return false;
  }
}

function buildScene(group: THREE.Group) {
  // Dark panel
  const panelMat = new THREE.MeshBasicMaterial({
    color: 0x09090b,
    transparent: true,
    opacity: 0.88,
  });
  const panel = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 0.55), panelMat);
  panel.position.set(0, 0, 0.01);
  group.add(panel);

  // Accent border (slightly larger plane behind)
  const borderMat = new THREE.MeshBasicMaterial({
    color: 0x3b82f6,
    transparent: true,
    opacity: 0.45,
  });
  const border = new THREE.Mesh(new THREE.PlaneGeometry(0.93, 0.58), borderMat);
  border.position.set(0, 0, 0.005);
  group.add(border);

  // Canvas-textured label
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 640;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#fafafa';
    ctx.font = '600 92px Inter, system-ui, sans-serif';
    ctx.fillText('Tracking OK', canvas.width / 2, canvas.height / 2 - 80);

    ctx.fillStyle = '#a1a1aa';
    ctx.font = '500 38px Inter, system-ui, sans-serif';
    ctx.fillText('Phase 0 · InSitu AR', canvas.width / 2, canvas.height / 2 + 30);

    ctx.fillStyle = '#3b82f6';
    ctx.font = "500 30px 'JetBrains Mono', monospace";
    ctx.fillText('● live', canvas.width / 2, canvas.height / 2 + 110);
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  const label = new THREE.Mesh(
    new THREE.PlaneGeometry(0.85, 0.53),
    new THREE.MeshBasicMaterial({ map: tex, transparent: true })
  );
  label.position.set(0, 0, 0.02);
  group.add(label);

  // Floating cube above the panel
  const cube = new THREE.Mesh(
    new THREE.BoxGeometry(0.14, 0.14, 0.14),
    new THREE.MeshNormalMaterial()
  );
  cube.position.set(0, 0.5, 0.15);
  group.add(cube);

  return { cube };
}

async function start() {
  startBtn.disabled = true;
  setTracking('searching', 'Initialisation…');

  const targetSrc = resolveTargetSrc();
  const isBlob = targetSrc.startsWith('blob:');
  if (!isBlob) {
    const ok = await targetExists(targetSrc);
    if (!ok) {
      startBtn.disabled = false;
      setTracking('idle', 'Prêt');
      showToast('Aucun targets.mind trouvé. Compile une image d\'abord →', 5000);
      window.setTimeout(() => (location.href = '/compile.html'), 1200);
      return;
    }
  }

  try {
    const mindar = new MindARThree({
      container,
      imageTargetSrc: targetSrc,
      uiLoading: 'no',
      uiScanning: 'no',
      uiError: 'no',
    });

    const { renderer, scene, camera } = mindar;
    const anchor = mindar.addAnchor(0);
    const { cube } = buildScene(anchor.group);

    anchor.onTargetFound = () => setTracking('found', 'Cible trouvée');
    anchor.onTargetLost = () => setTracking('lost', 'Cible perdue');

    // Reveal UI, hide splash
    splash.style.display = 'none';
    topBar.hidden = false;
    viewfinder.hidden = false;
    hint.hidden = false;

    await mindar.start();
    setTracking('searching', 'Recherche cible…');

    const clock = new THREE.Clock();
    renderer.setAnimationLoop(() => {
      const t = clock.getElapsedTime();
      cube.rotation.x = t * 0.6;
      cube.rotation.y = t * 0.8;
      cube.position.y = 0.5 + Math.sin(t * 1.6) * 0.04;
      renderer.render(scene, camera);
    });
  } catch (err) {
    console.error(err);
    startBtn.disabled = false;
    splash.style.display = '';
    topBar.hidden = true;
    viewfinder.hidden = true;
    hint.hidden = true;
    setTracking('idle', 'Erreur');
    const msg = (err as Error)?.message || String(err);
    showToast(`Erreur : ${msg}`, 6000);
  }
}

startBtn.addEventListener('click', start);
backBtn?.addEventListener('click', () => location.reload());

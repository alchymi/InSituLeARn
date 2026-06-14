import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import html2canvas from 'html2canvas';
import { pbFileUrl, type ArContentRecord } from '../lib/pb';

const gltfLoader = new GLTFLoader();

/**
 * Build a Three.js Object3D for an ar_content record.
 * The target plane in MindAR is 1 unit wide; positions/scales here use the same units.
 */
export async function buildArContent(content: ArContentRecord): Promise<THREE.Object3D | null> {
  let obj: THREE.Object3D | null = null;

  switch (content.type) {
    case 'text':
      obj = buildTextPanel(content);
      break;
    case 'info':
      obj = await buildInfoCard(content);
      break;
    case 'image':
      obj = await buildImagePlane(content);
      break;
    case 'model3d':
      obj = await buildGlbModel(content);
      break;
    case 'embed':
      obj = buildEmbedMarker(content);
      break;
  }
  if (!obj) return null;

  obj.position.set(content.positionX || 0, content.positionY || 0, content.positionZ || 0);
  obj.rotation.set(
    THREE.MathUtils.degToRad(content.rotationX || 0),
    THREE.MathUtils.degToRad(content.rotationY || 0),
    THREE.MathUtils.degToRad(content.rotationZ || 0)
  );
  obj.scale.set(content.scaleX || 1, content.scaleY || 1, content.scaleZ || 1);

  return obj;
}

// ─── Plain text panel ────────────────────────────────────────
function buildTextPanel(content: ArContentRecord): THREE.Object3D {
  const group = new THREE.Group();

  const W = 900;
  const H = 540;
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = 'rgba(9, 9, 11, 0.92)';
  roundRect(ctx, 0, 0, W, H, 28);
  ctx.fill();

  ctx.strokeStyle = 'rgba(255,255,255,0.10)';
  ctx.lineWidth = 2;
  roundRect(ctx, 1, 1, W - 2, H - 2, 28);
  ctx.stroke();

  const padX = 48;
  let y = 64;

  if (content.title) {
    ctx.fillStyle = '#fafafa';
    ctx.font = '600 56px Inter, system-ui, sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    wrapText(ctx, content.title, padX, y, W - padX * 2, 64);
    y += measureTextLines(ctx, content.title, W - padX * 2, 64) + 28;
  }

  if (content.body) {
    ctx.fillStyle = '#a1a1aa';
    ctx.font = '400 30px Inter, system-ui, sans-serif';
    wrapText(ctx, content.body, padX, y, W - padX * 2, 42);
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;

  const aspect = H / W;
  const mesh = new THREE.Mesh(
    new THREE.PlaneGeometry(0.8, 0.8 * aspect),
    new THREE.MeshBasicMaterial({ map: tex, transparent: true })
  );

  const border = new THREE.Mesh(
    new THREE.PlaneGeometry(0.82, 0.82 * aspect),
    new THREE.MeshBasicMaterial({ color: 0x3b82f6, transparent: true, opacity: 0.25 })
  );
  border.position.z = -0.005;

  group.add(border, mesh);
  return group;
}

// ─── Rich info card (Quill HTML → html2canvas → texture) ──────
async function buildInfoCard(content: ArContentRecord): Promise<THREE.Object3D> {
  const sanitized = sanitizeHtml(content.body || '');

  // Offscreen render container — styled via .ar-info-card class in index.css
  const host = document.createElement('div');
  host.className = 'ar-info-card';
  host.setAttribute('aria-hidden', 'true');
  host.style.position = 'fixed';
  host.style.left = '-9999px';
  host.style.top = '0';
  host.style.zIndex = '-1';

  const inner = document.createElement('div');
  inner.className = 'ar-info-card-inner';

  if (content.title) {
    const t = document.createElement('h1');
    t.className = 'ar-info-card-title';
    t.textContent = content.title;
    inner.appendChild(t);
  }
  const richBody = document.createElement('div');
  richBody.className = 'ar-info-card-body';
  richBody.innerHTML = sanitized || '<p class="ar-info-card-placeholder">(carte vide)</p>';
  inner.appendChild(richBody);
  host.appendChild(inner);
  document.body.appendChild(host);

  let canvas: HTMLCanvasElement;
  try {
    canvas = await html2canvas(host, {
      backgroundColor: null,
      scale: 2,
      logging: false,
      useCORS: true,
      windowWidth: 540,
    });
  } finally {
    document.body.removeChild(host);
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  tex.needsUpdate = true;

  const aspect = canvas.height / canvas.width;
  const mesh = new THREE.Mesh(
    new THREE.PlaneGeometry(0.85, 0.85 * aspect),
    new THREE.MeshBasicMaterial({ map: tex, transparent: true })
  );
  return mesh;
}

// ─── Image plane ─────────────────────────────────────────────
async function buildImagePlane(content: ArContentRecord): Promise<THREE.Object3D | null> {
  if (!content.media) return null;
  const url = pbFileUrl(content, content.media);
  const loader = new THREE.TextureLoader();
  loader.setCrossOrigin('anonymous');
  const tex = await loader.loadAsync(url);
  tex.colorSpace = THREE.SRGBColorSpace;

  const imgW = tex.image?.width || 1;
  const imgH = tex.image?.height || 1;
  const aspect = imgH / imgW;
  return new THREE.Mesh(
    new THREE.PlaneGeometry(0.6, 0.6 * aspect),
    new THREE.MeshBasicMaterial({ map: tex })
  );
}

// ─── GLB model ───────────────────────────────────────────────
async function buildGlbModel(content: ArContentRecord): Promise<THREE.Object3D | null> {
  if (!content.model3d) return null;
  const url = pbFileUrl(content, content.model3d);
  const gltf = await gltfLoader.loadAsync(url);
  const root = gltf.scene;

  // Center and normalize to roughly fit unit space
  const box = new THREE.Box3().setFromObject(root);
  const size = box.getSize(new THREE.Vector3());
  const max = Math.max(size.x, size.y, size.z) || 1;
  root.scale.multiplyScalar(0.35 / max);

  const center = box.getCenter(new THREE.Vector3()).multiplyScalar(0.35 / max);
  root.position.sub(center);

  // Lighting (otherwise PBR materials look black)
  const group = new THREE.Group();
  group.add(new THREE.AmbientLight(0xffffff, 0.9));
  const dir = new THREE.DirectionalLight(0xffffff, 1.2);
  dir.position.set(0.5, 1, 0.8);
  group.add(dir);
  group.add(root);
  return group;
}

// ─── Embed marker (tappable) ─────────────────────────────────
function buildEmbedMarker(content: ArContentRecord): THREE.Object3D {
  const group = new THREE.Group();

  const ring = new THREE.Mesh(
    new THREE.RingGeometry(0.10, 0.13, 48),
    new THREE.MeshBasicMaterial({ color: 0x60a5fa, transparent: true, opacity: 0.55, side: THREE.DoubleSide })
  );
  const inner = new THREE.Mesh(
    new THREE.CircleGeometry(0.085, 48),
    new THREE.MeshBasicMaterial({ color: 0x0E0E11, transparent: true, opacity: 0.92 })
  );
  inner.position.z = 0.001;

  // Play triangle
  const tri = new THREE.Mesh(
    new THREE.CircleGeometry(0.045, 3),
    new THREE.MeshBasicMaterial({ color: 0xffffff })
  );
  tri.position.z = 0.002;
  tri.rotation.z = -Math.PI / 2;
  tri.position.x = 0.012;

  group.add(ring, inner, tri);

  // Mark group + children for raycasting hit
  group.userData.contentId = content.id;
  group.traverse((o) => {
    o.userData.contentId = content.id;
  });

  return group;
}

// ─── Helpers ─────────────────────────────────────────────────
function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function wrapText(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, maxWidth: number, lineHeight: number) {
  const words = text.split(/\s+/);
  let line = '';
  for (let i = 0; i < words.length; i++) {
    const test = line + words[i] + ' ';
    if (ctx.measureText(test).width > maxWidth && i > 0) {
      ctx.fillText(line, x, y);
      line = words[i] + ' ';
      y += lineHeight;
    } else {
      line = test;
    }
  }
  ctx.fillText(line, x, y);
}

function measureTextLines(ctx: CanvasRenderingContext2D, text: string, maxWidth: number, lineHeight: number): number {
  const words = text.split(/\s+/);
  let line = '';
  let lines = 1;
  for (let i = 0; i < words.length; i++) {
    const test = line + words[i] + ' ';
    if (ctx.measureText(test).width > maxWidth && i > 0) {
      line = words[i] + ' ';
      lines++;
    } else {
      line = test;
    }
  }
  return lines * lineHeight;
}

/**
 * Minimal HTML sanitizer for Quill output. POC-level.
 * For production: swap in DOMPurify.
 */
function sanitizeHtml(html: string): string {
  return html
    .replace(/<(script|style|iframe|object|embed|link|meta)[^>]*>[\s\S]*?<\/\1>/gi, '')
    .replace(/<(script|style|iframe|object|embed|link|meta)[^>]*\/?>/gi, '')
    .replace(/\s+on[a-z]+\s*=\s*"[^"]*"/gi, '')
    .replace(/\s+on[a-z]+\s*=\s*'[^']*'/gi, '')
    .replace(/javascript:/gi, '');
}

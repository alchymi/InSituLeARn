import { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { TransformControls } from 'three/examples/jsm/controls/TransformControls.js';
import { pb, pbFileUrl } from '../lib/pb';
import type { ArContentRecord, TargetRecord } from '../types';
import { buildArContent } from './buildArContent';

type TransformMode = 'translate' | 'rotate' | 'scale';

interface TransformValues {
  px: number; py: number; pz: number;
  rx: number; ry: number; rz: number; // degrees
  sx: number; sy: number; sz: number;
}

interface VisualEditorProps {
  target: TargetRecord;
  contents: ArContentRecord[];
  onContentChanged?: () => void;
}

function readTransform(obj: THREE.Object3D): TransformValues {
  return {
    px: obj.position.x, py: obj.position.y, pz: obj.position.z,
    rx: THREE.MathUtils.radToDeg(obj.rotation.x),
    ry: THREE.MathUtils.radToDeg(obj.rotation.y),
    rz: THREE.MathUtils.radToDeg(obj.rotation.z),
    sx: obj.scale.x, sy: obj.scale.y, sz: obj.scale.z,
  };
}

export function VisualEditor({ target, contents, onContentChanged }: VisualEditorProps) {
  const mountRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const orbitRef = useRef<OrbitControls | null>(null);
  const transformRef = useRef<TransformControls | null>(null);
  const contentRootRef = useRef<THREE.Group | null>(null);
  const contentMapRef = useRef<Map<string, THREE.Object3D>>(new Map());
  const rafRef = useRef<number | null>(null);
  const saveTimerRef = useRef<number | null>(null);
  const pendingSaveRef = useRef<{ id: string; patch: Partial<ArContentRecord> } | null>(null);

  const [mode, setMode] = useState<TransformMode>('translate');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [transform, setTransform] = useState<TransformValues | null>(null);
  const [uniformScale, setUniformScale] = useState(true);
  const [saving, setSaving] = useState(false);

  // Stable refs for contents/onContentChanged
  const contentsRef = useRef(contents);
  contentsRef.current = contents;
  const onChangedRef = useRef(onContentChanged);
  onChangedRef.current = onContentChanged;

  // ─── Init scene (once per target) ───
  useEffect(() => {
    if (!mountRef.current) return;
    const mount = mountRef.current;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x08080A);
    sceneRef.current = scene;

    // Soft grid under the target plane
    const grid = new THREE.GridHelper(2, 20, 0x222226, 0x16161A);
    grid.rotation.x = Math.PI / 2;
    grid.position.z = -0.001;
    scene.add(grid);

    const ambient = new THREE.AmbientLight(0xffffff, 0.85);
    scene.add(ambient);

    const camera = new THREE.PerspectiveCamera(45, 1, 0.01, 100);
    camera.position.set(0.4, -0.35, 1.4);
    camera.lookAt(0, 0, 0);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    rendererRef.current = renderer;
    mount.appendChild(renderer.domElement);

    const orbit = new OrbitControls(camera, renderer.domElement);
    orbit.enableDamping = true;
    orbit.dampingFactor = 0.08;
    orbit.target.set(0, 0, 0);
    orbit.minDistance = 0.4;
    orbit.maxDistance = 3.5;
    orbit.zoomSpeed = 0.7;
    orbitRef.current = orbit;

    const tc = new TransformControls(camera, renderer.domElement);
    tc.setSize(0.7);
    tc.addEventListener('dragging-changed', (e) => {
      orbit.enabled = !e.value;
    });
    tc.addEventListener('objectChange', () => {
      const obj = tc.object;
      if (!obj?.userData?.contentId) return;
      setTransform(readTransform(obj));
      scheduleSave(obj.userData.contentId as string, {
        positionX: obj.position.x,
        positionY: obj.position.y,
        positionZ: obj.position.z,
        rotationX: THREE.MathUtils.radToDeg(obj.rotation.x),
        rotationY: THREE.MathUtils.radToDeg(obj.rotation.y),
        rotationZ: THREE.MathUtils.radToDeg(obj.rotation.z),
        scaleX: obj.scale.x,
        scaleY: obj.scale.y,
        scaleZ: obj.scale.z,
      });
    });
    scene.add(tc as any);
    transformRef.current = tc;

    const contentRoot = new THREE.Group();
    contentRoot.name = 'content-root';
    scene.add(contentRoot);
    contentRootRef.current = contentRoot;

    // Target image plane
    if (target.sourceImage) {
      const url = pbFileUrl(target, target.sourceImage);
      const loader = new THREE.TextureLoader();
      loader.setCrossOrigin('anonymous');
      loader.load(url, (tex) => {
        tex.colorSpace = THREE.SRGBColorSpace;
        tex.anisotropy = 4;
        const w = tex.image?.width || 1;
        const h = tex.image?.height || 1;
        const aspect = h / w;
        const plane = new THREE.Mesh(
          new THREE.PlaneGeometry(1, aspect),
          new THREE.MeshBasicMaterial({ map: tex })
        );
        plane.name = 'target-plane';
        scene.add(plane);
      });
    }

    // Raycaster for selection on click
    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();
    let downPos = { x: 0, y: 0 };
    function onPointerDown(e: PointerEvent) {
      downPos = { x: e.clientX, y: e.clientY };
    }
    function onPointerUp(e: PointerEvent) {
      const dx = Math.abs(e.clientX - downPos.x);
      const dy = Math.abs(e.clientY - downPos.y);
      if (dx > 4 || dy > 4) return; // dragging, not a click
      const rect = renderer.domElement.getBoundingClientRect();
      pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(pointer, camera);
      const hits = raycaster.intersectObjects(contentRoot.children, true);
      for (const hit of hits) {
        let cur: THREE.Object3D | null = hit.object;
        while (cur && cur.parent !== contentRoot) cur = cur.parent;
        if (cur && cur.userData?.contentId) {
          selectObject(cur);
          return;
        }
      }
      // Click on empty space → deselect
      deselect();
    }
    renderer.domElement.addEventListener('pointerdown', onPointerDown);
    renderer.domElement.addEventListener('pointerup', onPointerUp);

    function selectObject(obj: THREE.Object3D) {
      tc.attach(obj);
      setSelectedId((obj.userData?.contentId as string) || null);
      setTransform(readTransform(obj));
    }
    function deselect() {
      tc.detach();
      setSelectedId(null);
      setTransform(null);
    }
    selectFnRef.current = selectObject;
    deselectFnRef.current = deselect;

    // Resize
    function resize() {
      const w = mount.clientWidth;
      const h = mount.clientHeight;
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    }
    const ro = new ResizeObserver(resize);
    ro.observe(mount);
    resize();

    // Animate
    const animate = () => {
      orbit.update();
      renderer.render(scene, camera);
      rafRef.current = requestAnimationFrame(animate);
    };
    animate();

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      ro.disconnect();
      renderer.domElement.removeEventListener('pointerdown', onPointerDown);
      renderer.domElement.removeEventListener('pointerup', onPointerUp);
      tc.detach();
      tc.dispose();
      orbit.dispose();
      renderer.dispose();
      if (mount.contains(renderer.domElement)) mount.removeChild(renderer.domElement);
      sceneRef.current = null;
      cameraRef.current = null;
      rendererRef.current = null;
      orbitRef.current = null;
      transformRef.current = null;
      contentRootRef.current = null;
      contentMapRef.current.clear();
    };
  }, [target.id]);

  // ─── Build/refresh content meshes when contents change ───
  useEffect(() => {
    let cancelled = false;
    const contentRoot = contentRootRef.current;
    if (!contentRoot) return;

    // Clear previous content
    while (contentRoot.children.length) {
      const c = contentRoot.children[0];
      disposeObject(c);
      contentRoot.remove(c);
    }
    contentMapRef.current.clear();
    transformRef.current?.detach();
    setSelectedId(null);

    (async () => {
      for (const c of contents) {
        try {
          const obj = await buildArContent(c);
          if (cancelled || !obj) continue;
          contentRoot.add(obj);
          contentMapRef.current.set(c.id, obj);
        } catch (err) {
          console.warn('Failed to build content', c.id, err);
        }
      }
    })();

    return () => { cancelled = true; };
  }, [contents]);

  // ─── Sync transform mode ───
  useEffect(() => {
    transformRef.current?.setMode(mode);
  }, [mode]);

  // ─── Debounced save ───
  const selectFnRef = useRef<((obj: THREE.Object3D) => void) | null>(null);
  const deselectFnRef = useRef<(() => void) | null>(null);

  function scheduleSave(id: string, patch: Partial<ArContentRecord>) {
    pendingSaveRef.current = { id, patch };
    if (saveTimerRef.current) window.clearTimeout(saveTimerRef.current);
    saveTimerRef.current = window.setTimeout(flushSave, 350);
  }

  async function flushSave() {
    const pending = pendingSaveRef.current;
    pendingSaveRef.current = null;
    saveTimerRef.current = null;
    if (!pending) return;
    try {
      setSaving(true);
      await pb.collection('ar_contents').update(pending.id, pending.patch);
      // Intentionally NOT invalidating the contents query here: the visual
      // editor already reflects the new transform locally, and invalidation
      // would trigger a full rebuild (flicker) on every drag end.
    } catch (err) {
      console.error('Failed to save transform', err);
    } finally {
      setSaving(false);
    }
  }

  // Cleanup save on unmount
  useEffect(() => {
    return () => {
      if (saveTimerRef.current) window.clearTimeout(saveTimerRef.current);
      flushSave();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const selectedContent = useMemo(
    () => contents.find((c) => c.id === selectedId) || null,
    [contents, selectedId]
  );

  function selectFromList(id: string) {
    const obj = contentMapRef.current.get(id);
    if (obj) selectFnRef.current?.(obj);
  }

  function applyField(field: keyof TransformValues, raw: string) {
    const obj = transformRef.current?.object;
    if (!obj) return;
    const v = parseFloat(raw);
    if (!Number.isFinite(v)) return;

    switch (field) {
      case 'px': obj.position.x = v; break;
      case 'py': obj.position.y = v; break;
      case 'pz': obj.position.z = v; break;
      case 'rx': obj.rotation.x = THREE.MathUtils.degToRad(v); break;
      case 'ry': obj.rotation.y = THREE.MathUtils.degToRad(v); break;
      case 'rz': obj.rotation.z = THREE.MathUtils.degToRad(v); break;
      case 'sx':
        if (uniformScale) { obj.scale.x = v; obj.scale.y = v; obj.scale.z = v; }
        else obj.scale.x = v;
        break;
      case 'sy':
        if (uniformScale) { obj.scale.x = v; obj.scale.y = v; obj.scale.z = v; }
        else obj.scale.y = v;
        break;
      case 'sz':
        if (uniformScale) { obj.scale.x = v; obj.scale.y = v; obj.scale.z = v; }
        else obj.scale.z = v;
        break;
    }
    setTransform(readTransform(obj));
    scheduleSave(obj.userData.contentId as string, {
      positionX: obj.position.x,
      positionY: obj.position.y,
      positionZ: obj.position.z,
      rotationX: THREE.MathUtils.radToDeg(obj.rotation.x),
      rotationY: THREE.MathUtils.radToDeg(obj.rotation.y),
      rotationZ: THREE.MathUtils.radToDeg(obj.rotation.z),
      scaleX: obj.scale.x,
      scaleY: obj.scale.y,
      scaleZ: obj.scale.z,
    });
  }

  function resetTransform() {
    const obj = transformRef.current?.object;
    if (!obj) return;
    obj.position.set(0, 0, 0);
    obj.rotation.set(0, 0, 0);
    obj.scale.set(1, 1, 1);
    setTransform(readTransform(obj));
    scheduleSave(obj.userData.contentId as string, {
      positionX: 0, positionY: 0, positionZ: 0,
      rotationX: 0, rotationY: 0, rotationZ: 0,
      scaleX: 1, scaleY: 1, scaleZ: 1,
    });
  }

  return (
    <div className="flex w-full rounded-2xl overflow-hidden border border-white/[0.08] bg-[#08080A]" style={{ height: 640 }}>
    <div className="flex-1 relative">
      <div ref={mountRef} className="absolute inset-0" />

      {/* Top-left toolbar — mode */}
      <div className="absolute top-3 left-3 flex items-center gap-1 bg-[#0E0E11]/85 backdrop-blur-md border border-white/10 rounded-lg p-1 shadow-lg">
        <ModeButton active={mode === 'translate'} onClick={() => setMode('translate')} title="Translater (W)">
          <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="1.8">
            <polyline points="5 9 2 12 5 15" />
            <polyline points="9 5 12 2 15 5" />
            <polyline points="15 19 12 22 9 19" />
            <polyline points="19 9 22 12 19 15" />
            <line x1="2" y1="12" x2="22" y2="12" />
            <line x1="12" y1="2" x2="12" y2="22" />
          </svg>
        </ModeButton>
        <ModeButton active={mode === 'rotate'} onClick={() => setMode('rotate')} title="Tourner (E)">
          <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="1.8">
            <polyline points="1 4 1 10 7 10" />
            <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
          </svg>
        </ModeButton>
        <ModeButton active={mode === 'scale'} onClick={() => setMode('scale')} title="Échelle (R)">
          <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="1.8">
            <path d="M15 3h6v6" />
            <path d="M9 21H3v-6" />
            <path d="M21 3l-7 7" />
            <path d="M3 21l7-7" />
          </svg>
        </ModeButton>
      </div>

      {/* Top-right — content list mini */}
      <div className="absolute top-3 right-3 bg-[#0E0E11]/85 backdrop-blur-md border border-white/10 rounded-lg shadow-lg overflow-hidden max-w-[200px]">
        <div className="px-3 py-1.5 text-[10px] uppercase tracking-wider text-zinc-500 font-medium border-b border-white/[0.06]">
          Contenus · {contents.length}
        </div>
        <div className="max-h-48 overflow-y-auto scrollbar-thin">
          {contents.length === 0 && (
            <p className="text-[11px] text-zinc-500 px-3 py-3">Aucun contenu</p>
          )}
          {contents.map((c) => (
            <button
              key={c.id}
              onClick={() => selectFromList(c.id)}
              className={`block w-full text-left px-3 py-1.5 text-[12px] truncate transition-colors ${
                selectedId === c.id ? 'bg-blue-500/15 text-blue-300' : 'text-zinc-300 hover:bg-white/[0.04]'
              }`}
            >
              <span className="text-zinc-500 mr-1.5 text-[10px]">{c.type}</span>
              {c.title || <span className="text-zinc-500 italic">sans titre</span>}
            </button>
          ))}
        </div>
      </div>

      {/* Bottom-left status */}
      <div className="absolute bottom-3 left-3 flex items-center gap-3 px-3 py-1.5 rounded-lg bg-[#0E0E11]/85 backdrop-blur-md border border-white/10 text-[11px] text-zinc-500">
        <span className="font-mono">unité 1 = largeur cible</span>
        {selectedContent && (
          <>
            <span className="text-zinc-700">·</span>
            <span className="font-mono text-zinc-300">
              {selectedContent.type} · {selectedContent.title || selectedContent.id.slice(0, 8)}
            </span>
          </>
        )}
      </div>

      {/* Bottom-right saving indicator */}
      <div className="absolute bottom-3 right-3 px-3 py-1.5 rounded-lg bg-[#0E0E11]/85 backdrop-blur-md border border-white/10 flex items-center gap-2 text-[11px]">
        <span className={`w-1.5 h-1.5 rounded-full ${saving ? 'bg-amber-400 animate-pulse' : 'bg-emerald-400'}`} />
        <span className="text-zinc-400">{saving ? 'Sauvegarde…' : 'À jour'}</span>
      </div>
    </div>

    {/* Right properties panel */}
    <aside className="w-72 shrink-0 border-l border-white/[0.08] overflow-y-auto scrollbar-thin p-4 bg-[#0A0A0C]">
      <p className="text-[10px] uppercase tracking-wider text-zinc-500 font-medium">Propriétés</p>
      {!transform || !selectedContent ? (
        <p className="mt-3 text-[12px] text-zinc-500">
          Aucun contenu sélectionné. Clique sur un objet dans la scène ou dans la liste.
        </p>
      ) : (
        <>
          <div className="mt-3 p-3 rounded-lg bg-blue-500/[0.06] border border-blue-500/20">
            <p className="text-[11px] uppercase tracking-wider text-blue-400 font-medium">{selectedContent.type}</p>
            <p className="mt-0.5 text-[13px] font-medium truncate">{selectedContent.title || <span className="text-zinc-500 italic">sans titre</span>}</p>
            <p className="text-[10px] font-mono text-zinc-500 mt-0.5">{selectedContent.id.slice(0, 12)}</p>
          </div>

          <PropGroup label="Position">
            <Vec3Inputs
              prefix={['x', 'y', 'z']}
              values={[transform.px, transform.py, transform.pz]}
              step={0.01}
              onChange={(i, v) => applyField((['px', 'py', 'pz'] as const)[i], v)}
            />
          </PropGroup>

          <PropGroup label="Rotation (°)">
            <Vec3Inputs
              prefix={['x', 'y', 'z']}
              values={[transform.rx, transform.ry, transform.rz]}
              step={1}
              onChange={(i, v) => applyField((['rx', 'ry', 'rz'] as const)[i], v)}
            />
          </PropGroup>

          <PropGroup
            label="Échelle"
            extra={
              <label className="flex items-center gap-1.5 text-[10px] text-zinc-500 cursor-pointer">
                <input
                  type="checkbox"
                  checked={uniformScale}
                  onChange={(e) => setUniformScale(e.target.checked)}
                  className="accent-blue-500"
                />
                Uniforme
              </label>
            }
          >
            <Vec3Inputs
              prefix={['x', 'y', 'z']}
              values={[transform.sx, transform.sy, transform.sz]}
              step={0.05}
              onChange={(i, v) => applyField((['sx', 'sy', 'sz'] as const)[i], v)}
            />
          </PropGroup>

          <div className="mt-5 pt-4 border-t border-white/[0.06]">
            <button
              onClick={resetTransform}
              className="w-full h-9 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 text-[12px] font-medium text-zinc-200 flex items-center justify-center gap-1.5"
            >
              <svg viewBox="0 0 24 24" className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M3 12a9 9 0 1 0 9-9" />
                <polyline points="3 4 3 10 9 10" />
              </svg>
              Réinitialiser le transform
            </button>
          </div>

          <p className="mt-5 text-[10px] text-zinc-600 leading-relaxed">
            Position en unités de plan (1 = largeur cible). Rotation en degrés.
            Pour un réglage fin, utilise ces champs ; le gizmo 3D est mieux pour le grain large.
          </p>
        </>
      )}
    </aside>
    </div>
  );
}

function PropGroup({ label, extra, children }: { label: string; extra?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="mt-5">
      <div className="flex items-center justify-between mb-2">
        <span className="text-[10px] uppercase tracking-wider text-zinc-500 font-medium">{label}</span>
        {extra}
      </div>
      {children}
    </div>
  );
}

function Vec3Inputs({
  prefix,
  values,
  step,
  onChange,
}: {
  prefix: [string, string, string];
  values: [number, number, number];
  step: number;
  onChange: (index: 0 | 1 | 2, value: string) => void;
}) {
  return (
    <div className="grid grid-cols-3 gap-1.5">
      {prefix.map((p, i) => (
        <Vec3Field
          key={p}
          axis={p}
          value={values[i]}
          step={step}
          onChange={(v) => onChange(i as 0 | 1 | 2, v)}
        />
      ))}
    </div>
  );
}

function Vec3Field({
  axis, value, step, onChange,
}: {
  axis: string; value: number; step: number; onChange: (v: string) => void;
}) {
  // Use uncontrolled local state so user can type freely without flicker
  const [local, setLocal] = useState<string>(value.toFixed(3));
  const lastExternalRef = useRef(value);
  useEffect(() => {
    if (Math.abs(value - lastExternalRef.current) > 1e-6) {
      lastExternalRef.current = value;
      setLocal(value.toFixed(3));
    }
  }, [value]);

  return (
    <div className="relative">
      <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[10px] text-zinc-600 font-mono uppercase">{axis}</span>
      <input
        type="number"
        step={step}
        value={local}
        onChange={(e) => setLocal(e.target.value)}
        onBlur={() => onChange(local)}
        onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }}
        className="w-full h-8 pl-5 pr-2 rounded-md bg-[#0E0E11] border border-white/10 text-[11px] font-mono text-zinc-100 focus:outline-none focus:border-blue-500/60 focus:ring-1 focus:ring-blue-500/30"
      />
    </div>
  );
}

function ModeButton({ active, children, ...rest }: { active: boolean; children: React.ReactNode } & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      className={`w-8 h-8 rounded-md flex items-center justify-center transition-colors ${active ? 'bg-white/[0.10] text-zinc-100' : 'hover:bg-white/[0.06] text-zinc-400'}`}
      {...rest}
    >
      {children}
    </button>
  );
}

function disposeObject(obj: THREE.Object3D) {
  obj.traverse((o) => {
    const mesh = o as THREE.Mesh;
    if (mesh.geometry) mesh.geometry.dispose?.();
    const mat = mesh.material;
    if (Array.isArray(mat)) mat.forEach((m) => disposeMaterial(m));
    else if (mat) disposeMaterial(mat as THREE.Material);
  });
}
function disposeMaterial(m: THREE.Material) {
  const anyMat = m as any;
  if (anyMat.map) anyMat.map.dispose?.();
  m.dispose();
}

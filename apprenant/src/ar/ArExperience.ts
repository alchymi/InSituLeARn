import * as THREE from 'three';
import { MindARThree } from 'mind-ar/dist/mindar-image-three.prod.js';
import type { ArContentRecord, TargetRecord } from '../lib/pb';
import { buildArContent } from './buildArContent';

export type TrackingState = 'idle' | 'searching' | 'found' | 'lost';

export interface ArExperienceOptions {
  container: HTMLElement;
  compiledTargetSrc: string;
  targets: TargetRecord[];
  contents: ArContentRecord[];
  onTrackingState: (state: TrackingState, label: string) => void;
  onTargetFound: (target: TargetRecord, isFirstTime: boolean) => void;
  onTargetLost: (target: TargetRecord) => void;
  onContentTap: (content: ArContentRecord) => void;
  initialDiscovered: Set<string>;
}

const LOST_AFTER_FRAMES = 6;
const MATRIX_EPSILON = 1e-5;

export class ArExperience {
  private mindar: MindARThree;
  private targets: TargetRecord[];
  private contents: ArContentRecord[];
  private opts: ArExperienceOptions;
  private discovered: Set<string>;
  private raycaster = new THREE.Raycaster();
  private pointer = new THREE.Vector2();
  private onTapHandler: ((e: PointerEvent) => void) | null = null;

  private anchors: Array<{ group: THREE.Group; onTargetFound?: () => void; onTargetLost?: () => void; onTargetUpdate?: () => void }> = [];
  private childrenCache: THREE.Object3D[][] = []; // detached children per anchor
  private lastUpdated: number[] = [];
  private prevMatrix: Float32Array[] = [];
  private attachedFlag: boolean[] = [];
  private currentFrame = 0;
  private wasAnyTracked = false;

  constructor(opts: ArExperienceOptions) {
    this.opts = opts;
    this.targets = [...opts.targets].sort(
      (a, b) => (a.order ?? 0) - (b.order ?? 0) || (a.created < b.created ? -1 : 1)
    );
    this.contents = opts.contents;
    this.discovered = new Set(opts.initialDiscovered);

    this.mindar = new MindARThree({
      container: opts.container,
      imageTargetSrc: opts.compiledTargetSrc,
      maxTrack: 1,
      uiLoading: 'no',
      uiScanning: 'no',
      uiError: 'no',
    });
  }

  get rendererCanvas(): HTMLCanvasElement {
    return this.mindar.renderer.domElement;
  }

  async start() {
    const { renderer, scene, camera } = this.mindar;

    for (let i = 0; i < this.targets.length; i++) {
      const target = this.targets[i];
      const anchor = this.mindar.addAnchor(i);
      this.anchors.push(anchor);
      this.childrenCache.push([]);
      this.lastUpdated.push(-Infinity);
      this.prevMatrix.push(new Float32Array(16));
      this.attachedFlag.push(false);
      anchor.group.visible = false;

      const contentForTarget = this.contents.filter((c) => c.target === target.id && c.isVisible);
      for (const content of contentForTarget) {
        try {
          const obj = await buildArContent(content);
          if (obj) this.childrenCache[i].push(obj); // do NOT attach yet
        } catch (err) {
          console.warn('Failed to build content', content.id, err);
        }
      }

      const idx = i;
      anchor.onTargetFound = () => {
        this.lastUpdated[idx] = this.currentFrame;
        const wasFirst = !this.discovered.has(target.id);
        this.discovered.add(target.id);
        this.opts.onTargetFound(target, wasFirst);
      };
      anchor.onTargetUpdate = () => {
        this.lastUpdated[idx] = this.currentFrame;
      };
      anchor.onTargetLost = () => {
        this.opts.onTargetLost(target);
      };
    }

    this.setupTapRaycasting();

    this.opts.onTrackingState('searching', 'Initialisation…');
    await this.mindar.start();
    this.opts.onTrackingState('searching', 'Cadre une image cible');

    renderer.setAnimationLoop(() => {
      this.currentFrame++;
      let anyTracked = false;

      for (let i = 0; i < this.anchors.length; i++) {
        const a = this.anchors[i];
        // Belt #2: detect matrix changes — if MindAR is actively writing into the anchor's
        // matrix each frame, the target is being tracked even if onTargetUpdate isn't fired.
        const m = a.group.matrix.elements;
        const prev = this.prevMatrix[i];
        let matrixChanged = false;
        for (let k = 0; k < 16; k++) {
          if (Math.abs(m[k] - prev[k]) > MATRIX_EPSILON) { matrixChanged = true; break; }
          prev[k] = m[k];
        }
        if (matrixChanged) {
          for (let k = 0; k < 16; k++) prev[k] = m[k];
          this.lastUpdated[i] = this.currentFrame;
        }

        const tracked = this.currentFrame - this.lastUpdated[i] <= LOST_AFTER_FRAMES;

        if (tracked && !this.attachedFlag[i]) {
          for (const c of this.childrenCache[i]) a.group.add(c);
          this.attachedFlag[i] = true;
        } else if (!tracked && this.attachedFlag[i]) {
          // Detach physically — no children means nothing can render, regardless of `visible`
          for (const c of this.childrenCache[i]) a.group.remove(c);
          this.attachedFlag[i] = false;
        }
        a.group.visible = tracked;
        if (tracked) anyTracked = true;
      }

      if (anyTracked && !this.wasAnyTracked) {
        this.opts.onTrackingState('found', 'Cible trouvée');
      } else if (!anyTracked && this.wasAnyTracked) {
        this.opts.onTrackingState('lost', 'Cible perdue');
      }
      this.wasAnyTracked = anyTracked;

      renderer.render(scene, camera);
    });
  }

  stop() {
    try { this.mindar.renderer.setAnimationLoop(null); } catch { /* ignore */ }
    try { this.mindar.stop(); } catch { /* ignore */ }
    if (this.onTapHandler) {
      this.mindar.renderer.domElement.removeEventListener('pointerdown', this.onTapHandler);
      this.onTapHandler = null;
    }
  }

  private setupTapRaycasting() {
    const canvas = this.mindar.renderer.domElement;
    const handler = (e: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      this.pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      this.pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      this.raycaster.setFromCamera(this.pointer, this.mindar.camera);
      const hits = this.raycaster.intersectObjects(this.mindar.scene.children, true);
      for (const hit of hits) {
        if (!isVisibleInHierarchy(hit.object)) continue;
        const tagged = findContentIdAncestor(hit.object);
        if (tagged) {
          const content = this.contents.find((c) => c.id === tagged);
          if (content) {
            this.opts.onContentTap(content);
            return;
          }
        }
      }
    };
    canvas.addEventListener('pointerdown', handler);
    this.onTapHandler = handler;
  }
}

function findContentIdAncestor(obj: THREE.Object3D | null): string | null {
  let cur: THREE.Object3D | null = obj;
  while (cur) {
    if (cur.userData?.contentId) return cur.userData.contentId as string;
    cur = cur.parent;
  }
  return null;
}

function isVisibleInHierarchy(obj: THREE.Object3D | null): boolean {
  let cur: THREE.Object3D | null = obj;
  while (cur) {
    if (!cur.visible) return false;
    cur = cur.parent;
  }
  return true;
}

declare module 'mind-ar/dist/mindar-image-three.prod.js' {
  import * as THREE from 'three';

  export class MindARThree {
    constructor(options: {
      container: HTMLElement;
      imageTargetSrc: string;
      maxTrack?: number;
      uiLoading?: 'yes' | 'no' | string;
      uiScanning?: 'yes' | 'no' | string;
      uiError?: 'yes' | 'no' | string;
      filterMinCF?: number;
      filterBeta?: number;
      warmupTolerance?: number;
      missTolerance?: number;
    });
    renderer: THREE.WebGLRenderer;
    scene: THREE.Scene;
    camera: THREE.Camera;
    addAnchor(targetIndex: number): {
      group: THREE.Group;
      onTargetFound?: () => void;
      onTargetLost?: () => void;
      onTargetUpdate?: () => void;
    };
    start(): Promise<void>;
    stop(): void;
  }
}

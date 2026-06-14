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

declare module 'mind-ar/dist/mindar-image.prod.js' {
  export class Compiler {
    constructor();
    compileImageTargets(
      images: HTMLImageElement[],
      progressCallback: (progress: number) => void
    ): Promise<unknown>;
    exportData(): Promise<Uint8Array> | Uint8Array;
  }
}

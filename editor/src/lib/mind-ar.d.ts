declare module 'mind-ar/dist/mindar-image.prod.js' {
  export class Compiler {
    constructor();
    compileImageTargets(
      images: HTMLImageElement[],
      progressCallback: (progress: number) => void
    ): Promise<unknown>;
    exportData(): Uint8Array | Promise<Uint8Array>;
  }
}

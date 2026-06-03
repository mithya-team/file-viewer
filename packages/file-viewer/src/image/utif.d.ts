export interface UtifIfd {
  width?: number;
  height?: number;
  data?: Uint8Array;
  [key: string]: unknown;
}

export interface UtifModule {
  decode(buffer: ArrayBuffer): UtifIfd[];
  decodeImage(buffer: ArrayBuffer, ifd: UtifIfd): void;
  toRGBA8(ifd: UtifIfd): Uint8Array;
  encode(ifds: UtifIfd[]): ArrayBuffer;
  encodeImage(rgba: ArrayBuffer | Uint8Array, width: number, height: number, metadata?: UtifIfd): ArrayBuffer;
}

declare const UTIF: UtifModule;
export default UTIF;

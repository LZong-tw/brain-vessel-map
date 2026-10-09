export type SlicePlane = 'axial' | 'coronal' | 'sagittal';

export interface SliceManifest {
  version: 1;
  dimensions: [number, number, number];
  spacingMm: [number, number, number];
  originMm: [number, number, number];
  ordering: 'x-fastest';
  compression?: 'gzip';
  uncompressedByteLength?: number;
  alignment?: { method: string; approximate: boolean; note: string };
  t1: { offset: number; type: 'u8' };
  territory: { offset: number; type: 'u8' | 'u16' };
  bed: { offset: number; type: 'u16' };
  beds: string[];
  territories: { id: number; name: string; code: string; side: 'l' | 'r'; color: [number, number, number] }[];
  sources: { title: string; url: string }[];
  bedMapping: 'existing-voxel-bed-assignment' | 'spatial-nearest-bed';
}

export interface SliceData {
  manifest: SliceManifest;
  t1: Uint8Array;
  territory: Uint8Array | Uint16Array;
  bed: Uint16Array;
}

export function parseSlices(manifest: SliceManifest, buffer: ArrayBuffer): SliceData {
  if (manifest.version !== 1 || manifest.ordering !== 'x-fastest') throw new Error('Unsupported slice format');
  if (!manifest.dimensions.every((n) => Number.isSafeInteger(n) && n > 0) || !manifest.spacingMm.every((n) => Number.isFinite(n) && n > 0) || !manifest.originMm.every(Number.isFinite)) throw new Error('Invalid slice dimensions');
  const count = manifest.dimensions.reduce((a, b) => a * b, 1);
  if (!Number.isSafeInteger(count)) throw new Error('Invalid slice size');
  const read = (offset: number, bytes: number) => {
    if (!Number.isSafeInteger(offset) || offset < 0 || offset + count * bytes > buffer.byteLength) throw new Error('Truncated slice data');
    return new DataView(buffer, offset, count * bytes);
  };
  const t1View = read(manifest.t1.offset, 1);
  const territoryView = read(manifest.territory.offset, manifest.territory.type === 'u16' ? 2 : 1);
  const bedView = read(manifest.bed.offset, 2);
  const t1 = new Uint8Array(count);
  const territory = manifest.territory.type === 'u16' ? new Uint16Array(count) : new Uint8Array(count);
  const bed = new Uint16Array(count);
  const territoryIds = new Set(manifest.territories.map((t) => t.id));
  for (let i = 0; i < count; i++) {
    t1[i] = t1View.getUint8(i);
    territory[i] = manifest.territory.type === 'u16' ? territoryView.getUint16(i * 2, true) : territoryView.getUint8(i);
    bed[i] = bedView.getUint16(i * 2, true);
    if (bed[i] > manifest.beds.length || (territory[i] !== 0 && !territoryIds.has(territory[i]))) throw new Error('Unknown slice label');
  }
  return { manifest, t1, territory, bed };
}

let cached: Promise<SliceData> | null = null;
export function loadSlices(): Promise<SliceData> {
  if (cached) return cached;
  const base = import.meta.env.BASE_URL;
  cached = Promise.all(['slices.json', 'slices.bin.gz'].map(async (file) => {
    const response = await fetch(`${base}data/${file}`);
    if (!response.ok) throw new Error(`Slice asset ${response.status}`);
    return file.endsWith('.json') ? response.json() : response.arrayBuffer();
  })).then(async ([value, bytes]) => {
    const manifest = value as SliceManifest;
    let buffer = bytes as ArrayBuffer;
    if (manifest.compression === 'gzip') {
      if (typeof DecompressionStream === 'undefined') throw new Error('Slice decompression unsupported');
      const stream = new Blob([buffer]).stream().pipeThrough(new DecompressionStream('gzip'));
      buffer = await new Response(stream).arrayBuffer();
      if (buffer.byteLength !== manifest.uncompressedByteLength) throw new Error('Invalid decompressed slice size');
    }
    return parseSlices(manifest, buffer);
  });
  cached.catch(() => { cached = null; });
  return cached;
}

export function sliceShape(manifest: SliceManifest, plane: SlicePlane): [number, number, number] {
  const [x, y, z] = manifest.dimensions;
  return plane === 'axial' ? [x, y, z] : plane === 'coronal' ? [x, z, y] : [y, z, x];
}

/** Radiological orientation: patient right on the left; superior at the top. */
export function sliceVoxel(manifest: SliceManifest, plane: SlicePlane, index: number, column: number, row: number): number {
  const [width, height, count] = sliceShape(manifest, plane);
  if (![index, column, row].every(Number.isInteger) || index < 0 || index >= count || column < 0 || column >= width || row < 0 || row >= height) throw new Error('Slice coordinate out of range');
  const [nx, ny, nz] = manifest.dimensions;
  const [x, y, z] = plane === 'axial' ? [nx - 1 - column, ny - 1 - row, index] : plane === 'coronal' ? [nx - 1 - column, index, nz - 1 - row] : [index, ny - 1 - column, nz - 1 - row];
  return x + nx * (y + ny * z);
}

export function fractionForBed(data: SliceData, voxel: number, fractions: Record<string, number>): number {
  const id = data.manifest.beds[data.bed[voxel] - 1];
  const value = id ? fractions[id] : 0;
  return Number.isFinite(value) ? Math.min(1, Math.max(0, value)) : 0;
}

export function slicePixels(data: SliceData, plane: SlicePlane, index: number, fractions: Record<string, number>, heatmap: boolean, outlines: boolean): Uint8ClampedArray {
  const [width, height] = sliceShape(data.manifest, plane);
  const pixels = new Uint8ClampedArray(width * height * 4);
  const colors = new Map(data.manifest.territories.map((t) => [t.id, t.color]));
  for (let row = 0; row < height; row++) for (let column = 0; column < width; column++) {
    const voxel = sliceVoxel(data.manifest, plane, index, column, row);
    const gray = data.t1[voxel];
    const fraction = heatmap ? fractionForBed(data, voxel, fractions) : 0;
    const alpha = fraction * 0.8;
    let color = [gray * (1 - alpha) + 255 * alpha, gray * (1 - alpha) + 48 * alpha, gray * (1 - alpha) + 48 * alpha];
    const label = data.territory[voxel];
    const boundary = outlines && label !== 0 && [[-1, 0], [1, 0], [0, -1], [0, 1]].some(([dx, dy]) => {
      const x = column + dx, y = row + dy;
      return x < 0 || y < 0 || x >= width || y >= height || data.territory[sliceVoxel(data.manifest, plane, index, x, y)] !== label;
    });
    if (boundary) color = colors.get(label) ?? color;
    pixels.set([...color, 255], (row * width + column) * 4);
  }
  return pixels;
}

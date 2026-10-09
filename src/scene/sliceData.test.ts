import { afterEach, describe, expect, it, vi } from 'vitest';
import { gzipSync } from 'node:zlib';
import { fractionForBed, parseSlices, slicePixels, sliceShape, sliceVoxel, type SliceManifest } from './sliceData';

const manifest: SliceManifest = {
  version: 1, dimensions: [2, 2, 2], spacingMm: [1, 1, 1], originMm: [-1, -1, -1], ordering: 'x-fastest',
  t1: { offset: 0, type: 'u8' }, territory: { offset: 8, type: 'u8' }, bed: { offset: 16, type: 'u16' },
  beds: ['bed'], territories: [{ id: 1, name: 'MCA', code: 'MCA', side: 'l', color: [0, 180, 255] }], sources: [], bedMapping: 'existing-voxel-bed-assignment',
};
const fixture = () => {
  const buffer = new ArrayBuffer(32);
  new Uint8Array(buffer, 0, 8).fill(100);
  new Uint8Array(buffer, 8, 8).fill(1);
  new Uint16Array(buffer, 16, 8).fill(1);
  return parseSlices(manifest, buffer);
};
afterEach(() => vi.unstubAllGlobals());

describe('reference slice data', () => {
  it('decodes each label volume separately and rejects invalid labels and truncated data', () => {
    const data = fixture();
    expect(data.t1[0]).toBe(100); expect(data.territory[0]).toBe(1); expect(data.bed[0]).toBe(1);
    expect(() => parseSlices(manifest, new ArrayBuffer(31))).toThrow('Truncated');
    const bad = new ArrayBuffer(32); new Uint16Array(bad, 16, 8).fill(2);
    expect(() => parseSlices(manifest, bad)).toThrow('Unknown slice label');
    expect(() => parseSlices({ ...manifest, dimensions: [0, 2, 2] }, bad)).toThrow('dimensions');
  });
  it('uses radiological orientation in all three planes and validates bounds', () => {
    expect(sliceShape(manifest, 'axial')).toEqual([2, 2, 2]);
    expect(sliceVoxel(manifest, 'axial', 0, 0, 0)).toBe(3);
    expect(sliceVoxel(manifest, 'coronal', 0, 0, 0)).toBe(5);
    expect(sliceVoxel(manifest, 'sagittal', 0, 0, 0)).toBe(6);
    expect(() => sliceVoxel(manifest, 'axial', 2, 0, 0)).toThrow('range');
  });
  it('shows continuous bed fractions, including small fractions, without binary infarct masks', () => {
    const data = fixture();
    const red = (fraction: number) => slicePixels(data, 'axial', 0, { bed: fraction }, true, false)[0];
    expect(red(0)).toBe(100); expect(red(0.01)).toBeGreaterThan(red(0));
    expect(red(0.25)).toBeLessThan(red(0.5)); expect(red(0.5)).toBeLessThan(red(1));
    expect(fractionForBed(data, 0, { bed: NaN })).toBe(0);
    expect(fractionForBed(data, 0, { bed: 2 })).toBe(1);
    data.bed[0] = 0; expect(fractionForBed(data, 0, { bed: 1 })).toBe(0);
  });
  it('territory outlines are independent of the simulation and heatmap visibility', () => {
    const data = fixture();
    const outline = slicePixels(data, 'axial', 0, { bed: 0 }, false, true);
    expect([...outline.slice(0, 3)]).toEqual([0, 180, 255]);
    expect(slicePixels(data, 'axial', 0, { bed: 1 }, true, true)).toEqual(outline);
    expect(slicePixels(data, 'axial', 0, { bed: 1 }, false, false)[0]).toBe(100);
  });
  it('loads the gzip binary relative to the configured base and validates decompressed size', async () => {
    vi.resetModules();
    const raw = new Uint8Array(32);
    const compressed = gzipSync(raw);
    const gzipManifest = { ...manifest, compression: 'gzip', uncompressedByteLength: 32 };
    const fetcher = vi.fn(async (url: string) => new Response(url.endsWith('.json') ? JSON.stringify(gzipManifest) : compressed));
    vi.stubGlobal('fetch', fetcher);
    const { loadSlices } = await import('./sliceData');
    expect((await loadSlices()).t1).toHaveLength(8);
    expect(fetcher.mock.calls.some(([url]) => url.endsWith('data/slices.bin.gz'))).toBe(true);
  });
  it('rejects unavailable gzip support and permits retry after a load failure', async () => {
    vi.resetModules();
    const gzipManifest = { ...manifest, compression: 'gzip', uncompressedByteLength: 32 };
    vi.stubGlobal('DecompressionStream', undefined);
    const fetcher = vi.fn(async (url: string) => new Response(url.endsWith('.json') ? JSON.stringify(gzipManifest) : new Uint8Array(32)));
    vi.stubGlobal('fetch', fetcher);
    const { loadSlices } = await import('./sliceData');
    await expect(loadSlices()).rejects.toThrow('decompression unsupported');
    await expect(loadSlices()).rejects.toThrow('decompression unsupported');
    expect(fetcher).toHaveBeenCalledTimes(4);
  });
});

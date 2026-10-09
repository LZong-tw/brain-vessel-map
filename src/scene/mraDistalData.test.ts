import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { describe, expect, it, vi } from 'vitest';
import { createMraDistalLoader, parseMraDistalData } from './mraDistalData';

const bytes = readFileSync(new URL('../../public/data/mra-distal.json', import.meta.url));
const source = JSON.parse(bytes.toString());
const provenance = JSON.parse(readFileSync(new URL('../../public/data/mra-distal-provenance.json', import.meta.url)).toString());

describe('individual distal MRA source data', () => {
  it('matches pinned source provenance and deterministic generated asset hash', () => {
    expect(createHash('sha256').update(bytes).digest('hex')).toBe(provenance.assetSha256);
    expect(provenance.archive.sha256).toBe('a90f65a08fa141973d94edf55a03c630b9dafe45d03fb3ffee0292b373898a79');
    expect(provenance.sourceVolume.sha256).toBe('6349b4dc25ab9a860d11f02c45ce40da35d073bffd82485a03712db5cd456e9a');
    expect(provenance.sourceVolume.entry).toBe('Brava43Subs.zip/srcgBG0001.nii');
    expect(provenance.license).toContain('Attribution');
    expect(provenance.license).toContain('does not specify');
    expect(provenance.licenseText).toContain('10.1016/j.neuroimage.2013.05.089');
    expect(provenance.namedBranchMapping).toBe(false);
    expect(provenance.simulationParametersChanged).toBe(false);
  });

  it('retains every finite labeled voxel, including isolated points and disconnected components', () => {
    const data = parseMraDistalData(source);
    expect(data.points).toHaveLength(13206);
    expect(data.segments).toHaveLength(37122);
    expect(data.groups.map((group) => [group.id, group.family, group.side, group.voxelCount])).toEqual([
      [1, 'CoW', 'm', 1032], [2, 'ACA', 'l', 1528], [3, 'MCA', 'l', 3212],
      [4, 'MCA', 'r', 3985], [5, 'ACA', 'r', 1407], [6, 'PCA', 'l', 1056], [7, 'PCA', 'r', 986],
    ]);
    expect(data.isolatedPointIndices).toHaveLength(5);
    expect(data.summary.componentCount).toBe(63);
    expect(data.summary.componentSizes.reduce((sum, count) => sum + count, 0)).toBe(data.points.length);
    for (const index of data.isolatedPointIndices) expect(data.segments.some((pair) => pair.includes(index))).toBe(false);
  });

  it('uses the source LAS voxel affine without claiming 2009c registration or repairing gaps', () => {
    const data = parseMraDistalData(source);
    expect(provenance.decoding.affine).toEqual([[-1, 0, 0, 90], [0, 1, 0, -126], [0, 0, 1, -72], [0, 0, 0, 1]]);
    expect(provenance.decoding.dimensions).toEqual([181, 217, 181]);
    expect(provenance.decoding.voxelAxes).toEqual(['L', 'A', 'S']);
    expect(provenance.decoding.nanVoxelCount).toBe(904961);
    expect(provenance.decoding.selection).toContain('NaN');
    expect(provenance.placement).toContain('unvalidated');
    for (const point of data.points) {
      expect(point.every(Number.isFinite)).toBe(true);
      const voxel = [90 - point[0], point[1] + 126, point[2] + 72];
      expect(voxel.every(Number.isInteger)).toBe(true);
      expect(voxel.every((coordinate, axis) => coordinate >= 0 && coordinate < provenance.decoding.dimensions[axis])).toBe(true);
    }
    for (const [first, second] of data.segments) {
      expect(first).toBeLessThan(second);
      expect(second).toBeLessThan(data.points.length);
      const delta = data.points[first].map((coordinate, axis) => Math.abs(coordinate - data.points[second][axis]));
      expect(Math.max(...delta)).toBe(1);
      expect(delta.every((step) => step === 0 || step === 1)).toBe(true);
    }
  });

  it.each([
    ['non-finite point', (value: typeof source) => { value.points[0][0] = NaN; }],
    ['non-unit voxel coordinate', (value: typeof source) => { value.points[0][0] += 0.5; }],
    ['unknown family', (value: typeof source) => { value.labels[0] = 8; }],
    ['incorrect source family count', (value: typeof source) => { value.groups[0].voxelCount++; }],
    ['incorrect family side', (value: typeof source) => { value.groups[1].side = 'r'; }],
    ['invalid point index', (value: typeof source) => { value.segments[0][1] = value.points.length; }],
    ['duplicate edge', (value: typeof source) => { value.segments[1] = value.segments[0]; }],
    ['invented gap connection', (value: typeof source) => { value.segments[0] = [0, value.points.length - 1]; }],
    ['missing source voxel', (value: typeof source) => { value.points.pop(); }],
    ['incorrect component summary', (value: typeof source) => { value.summary.componentCount = 1; }],
  ])('rejects %s', (_name, corrupt) => {
    const value = structuredClone(source);
    corrupt(value);
    expect(() => parseMraDistalData(value)).toThrow('Invalid MRA distal source data');
  });

  it.each([null, {}, [], { points: [] }])('rejects malformed payload %j', (value) => {
    expect(() => parseMraDistalData(value)).toThrow('Invalid MRA distal source data');
  });
});

describe('MRA distal loading', () => {
  it('shares pending and successful loads at the application base URL', async () => {
    const fetcher = vi.fn().mockResolvedValue(new Response(JSON.stringify(source)));
    const load = createMraDistalLoader(fetcher, '/brain-vessel-map/');
    const first = load();
    expect(load()).toBe(first);
    const data = await first;
    expect(await load()).toBe(data);
    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(fetcher).toHaveBeenCalledWith('/brain-vessel-map/data/mra-distal.json');
  });

  it('allows retry after HTTP failure and malformed source data', async () => {
    const fetcher = vi.fn()
      .mockResolvedValueOnce(new Response('', { status: 503 }))
      .mockResolvedValueOnce(new Response('{}'))
      .mockResolvedValueOnce(new Response(JSON.stringify(source)));
    const load = createMraDistalLoader(fetcher, '/');
    await expect(load()).rejects.toThrow('MRA distal asset 503');
    await expect(load()).rejects.toThrow('Invalid MRA distal source data');
    await expect(load()).resolves.toMatchObject({ subject: 'BG0001' });
    expect(fetcher).toHaveBeenCalledTimes(3);
  });

  it('allows retry after network failure', async () => {
    const fetcher = vi.fn().mockRejectedValueOnce(new Error('offline')).mockResolvedValueOnce(new Response(JSON.stringify(source)));
    const load = createMraDistalLoader(fetcher, '/');
    await expect(load()).rejects.toThrow('offline');
    await expect(load()).resolves.toMatchObject({ subject: 'BG0001' });
  });
});

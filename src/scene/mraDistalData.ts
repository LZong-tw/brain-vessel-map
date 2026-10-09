export type MraFamilyId = 1 | 2 | 3 | 4 | 5 | 6 | 7;
export interface MraDistalGroup {
  id: MraFamilyId;
  family: 'CoW' | 'ACA' | 'MCA' | 'PCA';
  side: 'm' | 'l' | 'r';
  sourceName: string;
  voxelCount: number;
}
export interface MraDistalData {
  version: 1;
  subject: 'BG0001';
  coordinateSpace: 'source SPM-normalized MNI152';
  spacingMm: [number, number, number];
  groups: MraDistalGroup[];
  points: [number, number, number][];
  labels: MraFamilyId[];
  segments: [number, number][];
  summary: {
    voxelCount: number;
    segmentCount: number;
    isolatedVoxelCount: number;
    componentCount: number;
    componentSizes: number[];
    boundsMm: number[][];
  };
  isolatedPointIndices: number[];
}

const SOURCE_GROUPS = [
  [1, 'CoW', 'm', 1032], [2, 'ACA', 'l', 1528], [3, 'MCA', 'l', 3212],
  [4, 'MCA', 'r', 3985], [5, 'ACA', 'r', 1407], [6, 'PCA', 'l', 1056], [7, 'PCA', 'r', 986],
] as const;
const fail = (): never => { throw new Error('Invalid MRA distal source data'); };
const object = (value: unknown): Record<string, unknown> => value !== null && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : fail();
const array = (value: unknown): unknown[] => Array.isArray(value) ? value : fail();

/** Validate the pinned individual source and retain disconnected/isolated measured points. */
export function parseMraDistalData(value: unknown): MraDistalData {
  const raw = object(value);
  if (raw.version !== 1 || raw.subject !== 'BG0001' || raw.coordinateSpace !== 'source SPM-normalized MNI152') fail();
  const spacing = array(raw.spacingMm);
  if (spacing.length !== 3 || spacing.some((entry) => entry !== 1)) fail();
  const points = array(raw.points).map((entry) => {
    const point = array(entry);
    if (point.length !== 3 || point.some((coordinate) => typeof coordinate !== 'number' || !Number.isFinite(coordinate) || !Number.isInteger(coordinate))) fail();
    const [x, y, z] = point as [number, number, number];
    if (x < -90 || x > 90 || y < -126 || y > 90 || z < -72 || z > 108) fail();
    return [x, y, z] as [number, number, number];
  });
  if (points.length !== 13206 || new Set(points.map((point) => point.join(','))).size !== points.length) fail();
  const labels = array(raw.labels);
  if (labels.length !== points.length || labels.some((label) => typeof label !== 'number' || !Number.isInteger(label) || label < 1 || label > 7)) fail();
  const counts = new Map<number, number>();
  for (const label of labels as number[]) counts.set(label, (counts.get(label) ?? 0) + 1);
  const groups = array(raw.groups).map((entry) => object(entry));
  if (groups.length !== SOURCE_GROUPS.length || new Set(groups.map((group) => group.id)).size !== groups.length) fail();
  for (const [id, family, side, count] of SOURCE_GROUPS) {
    const group = groups.find((entry) => entry.id === id);
    if (!group || group.family !== family || group.side !== side || group.voxelCount !== count || counts.get(id) !== count || typeof group.sourceName !== 'string') fail();
  }
  const adjacency: number[][] = Array.from({ length: points.length }, () => []);
  const pairs = new Set<string>();
  const segments = array(raw.segments).map((entry) => {
    const pair = array(entry);
    if (pair.length !== 2 || pair.some((index) => typeof index !== 'number' || !Number.isSafeInteger(index))) fail();
    const [first, second] = pair as [number, number];
    if (first < 0 || second >= points.length || first >= second) fail();
    const delta = points[first].map((coordinate, axis) => Math.abs(coordinate - points[second][axis]));
    if (Math.max(...delta) !== 1 || delta.some((step) => step !== 0 && step !== 1)) fail();
    const key = `${first},${second}`;
    if (pairs.has(key)) fail();
    pairs.add(key);
    adjacency[first].push(second);
    adjacency[second].push(first);
    return [first, second] as [number, number];
  });
  if (segments.length !== 37122) fail();
  const isolatedPointIndices = adjacency.flatMap((neighbors, index) => neighbors.length ? [] : [index]);
  const seen = new Set<number>();
  const componentSizes: number[] = [];
  for (let initial = 0; initial < points.length; initial++) {
    if (seen.has(initial)) continue;
    const queue = [initial];
    seen.add(initial);
    for (let cursor = 0; cursor < queue.length; cursor++) for (const neighbor of adjacency[queue[cursor]]) {
      if (!seen.has(neighbor)) { seen.add(neighbor); queue.push(neighbor); }
    }
    componentSizes.push(queue.length);
  }
  componentSizes.sort((a, b) => b - a);
  const summary = object(raw.summary);
  const bounds = [0, 1, 2].map((axis) => points.reduce(([min, max], point) => [Math.min(min, point[axis]), Math.max(max, point[axis])], [Infinity, -Infinity]));
  const boundsMm = [bounds.map((bound) => bound[0]), bounds.map((bound) => bound[1])];
  if (summary.voxelCount !== points.length || summary.segmentCount !== segments.length || summary.isolatedVoxelCount !== isolatedPointIndices.length || summary.componentCount !== componentSizes.length || JSON.stringify(summary.componentSizes) !== JSON.stringify(componentSizes) || JSON.stringify(summary.boundsMm) !== JSON.stringify(boundsMm)) fail();
  return {
    version: 1, subject: 'BG0001', coordinateSpace: 'source SPM-normalized MNI152', spacingMm: [1, 1, 1],
    groups: groups as unknown as MraDistalGroup[], points, labels: labels as MraFamilyId[], segments,
    summary: summary as unknown as MraDistalData['summary'], isolatedPointIndices,
  };
}

export function createMraDistalLoader(fetcher: typeof fetch, base: string): () => Promise<MraDistalData> {
  let cached: Promise<MraDistalData> | null = null;
  return () => {
    if (cached) return cached;
    const request = Promise.resolve().then(async () => {
      const response = await fetcher(`${base}data/mra-distal.json`);
      if (!response.ok) throw new Error(`MRA distal asset ${response.status}`);
      return parseMraDistalData(await response.json());
    });
    cached = request;
    void request.catch(() => { if (cached === request) cached = null; });
    return request;
  };
}

const defaultLoader = createMraDistalLoader((...args) => fetch(...args), import.meta.env.BASE_URL);
export const loadMraDistal = (): Promise<MraDistalData> => defaultLoader();

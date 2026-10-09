import { readFileSync } from 'node:fs';
import { Color } from 'three';
import { describe, expect, it } from 'vitest';
import { buildMraDistalGeometry, MRA_FAMILY_COLORS } from './MraDistalVessels';
import { parseMraDistalData } from './mraDistalData';
import { toThreeArr } from './coords';

const source = JSON.parse(readFileSync(new URL('../../public/data/mra-distal.json', import.meta.url)).toString());
const data = parseMraDistalData(source);

describe('MRA distal reference rendering', () => {
  it('renders exactly the source adjacency edges and every isolated source point', () => {
    const geometry = buildMraDistalGeometry(data, { l: true, r: true }, null);
    const positions = geometry.lines.getAttribute('position');
    expect(positions.count).toBe(37122 * 2);
    expect(geometry.points.getAttribute('position').count).toBe(5);
    const first = data.segments[0];
    for (let endpoint = 0; endpoint < 2; endpoint++) {
      const actual = [positions.getX(endpoint), positions.getY(endpoint), positions.getZ(endpoint)];
      actual.forEach((coordinate, axis) => expect(coordinate).toBeCloseTo(toThreeArr(data.points[first[endpoint]])[axis], 5));
    }
    geometry.lines.dispose();
    geometry.points.dispose();
  });

  it.each([{ l: false, r: true }, { l: true, r: false }, { l: false, r: false }])('honors hemisphere visibility %j without bridging removed points', (hemis) => {
    const visible = (index: number) => data.labels[index] === 1 || ([2, 3, 6].includes(data.labels[index]) ? hemis.l : hemis.r);
    const geometry = buildMraDistalGeometry(data, hemis, null);
    expect(geometry.lines.getAttribute('position').count).toBe(data.segments.filter(([first, second]) => visible(first) && visible(second)).length * 2);
    expect(geometry.points.getAttribute('position').count).toBe(data.isolatedPointIndices.filter(visible).length);
    if (!hemis.l && !hemis.r) expect(geometry.lines.getAttribute('position').count).toBeGreaterThan(0);
    geometry.lines.dispose();
    geometry.points.dispose();
  });

  it('highlights only the selected source family without changing geometry or using simulated state', () => {
    const neutral = buildMraDistalGeometry(data, { l: true, r: true }, null);
    const selected = buildMraDistalGeometry(data, { l: true, r: true }, 3);
    expect(selected.lines.getAttribute('position').array).toEqual(neutral.lines.getAttribute('position').array);
    const colors = selected.lines.getAttribute('color');
    for (const label of [1, 3, 4] as const) {
      const index = data.segments.flat().findIndex((point) => data.labels[point] === label);
      const expected = new Color(label === 3 ? '#fff0b0' : MRA_FAMILY_COLORS[label]).toArray();
      [colors.getX(index), colors.getY(index), colors.getZ(index)].forEach((channel, axis) => expect(channel).toBeCloseTo(expected[axis], 5));
    }
    neutral.lines.dispose();
    neutral.points.dispose();
    selected.lines.dispose();
    selected.points.dispose();
  });
});

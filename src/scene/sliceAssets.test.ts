import { readFileSync } from 'node:fs';
import { gunzipSync } from 'node:zlib';
import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';

const read = (name: string) => readFileSync(new URL(`../../public/data/${name}`, import.meta.url));
const manifest = JSON.parse(new TextDecoder().decode(read('slices.json')));
const packed = read('slices.bin.gz');
const raw = gunzipSync(packed);
const count = manifest.dimensions.reduce((a: number, b: number) => a * b, 1);
const atlas = raw.subarray(manifest.territory.offset, manifest.territory.offset + count);
const voxelBeds = new DataView(raw.buffer, raw.byteOffset + manifest.bed.offset, count * 2);
const modelBeds = JSON.parse(new TextDecoder().decode(readFileSync(new URL('../anatomy/generated/beds.json', import.meta.url))));
const mesh = JSON.parse(new TextDecoder().decode(read('brain.json')));

describe('real MRI slice assets', () => {
  it('verifies gzip payload, checksum and complete aligned array layout', () => {
    expect(createHash('sha256').update(packed).digest('hex')).toBe(manifest.sha256);
    expect(packed.byteLength).toBe(manifest.compressedByteLength);
    expect(raw.byteLength).toBe(manifest.uncompressedByteLength);
    expect(manifest.dimensions).toEqual([193, 229, 193]);
    expect(manifest.spacingMm).toEqual([1, 1, 1]);
    expect(manifest.originMm).toEqual([-96, -132, -78]);
    expect(manifest.ordering).toBe('x-fastest');
    expect(manifest.t1.offset).toBe(0);
    expect(manifest.territory.offset).toBe(count);
    expect(manifest.bed.offset).toBe(count * 2);
    expect(raw.byteLength).toBe(count * 4);
    expect(raw.subarray(0, count).some((value: number) => value > 0)).toBe(true);
  });

  it('preserves all source arterial IDs and left/right orientation', () => {
    const labels = new Set<number>();
    let leftX = 0, rightX = 0, leftCount = 0, rightCount = 0;
    for (let i = 0; i < atlas.length; i++) {
      const label = atlas[i];
      if (!label) continue;
      labels.add(label);
      const x = i % manifest.dimensions[0] + manifest.originMm[0];
      if (label % 2) { leftX += x; leftCount++; }
      else { rightX += x; rightCount++; }
    }
    expect([...labels].sort((a, b) => a - b)).toEqual(Array.from({ length: 30 }, (_, i) => i + 1));
    expect(leftX / leftCount).toBeCloseTo(manifest.validation.leftLabelMeanXmm, 8);
    expect(rightX / rightCount).toBeCloseTo(manifest.validation.rightLabelMeanXmm, 8);
    expect(leftX / leftCount).toBeLessThan(0);
    expect(rightX / rightCount).toBeGreaterThan(0);
    expect(leftCount + rightCount).toBe(manifest.validation.atlasVoxelCount);
    expect(manifest.alignment.approximate).toBe(true);
    expect(manifest.validation.atlasWithinAsegFraction).toBeGreaterThan(0);
    expect(manifest.validation.asegCoveredByAtlasFraction).toBeGreaterThan(0);
  });

  it('maps every voxel bed to existing model IDs with unchanged voxel volumes', () => {
    expect(manifest.beds).toEqual(mesh.beds);
    expect(new Set(manifest.beds)).toEqual(new Set(modelBeds.map((bed: { id: string }) => bed.id)));
    const counts = new Uint32Array(manifest.beds.length + 1);
    let invalid = 0;
    for (let i = 0; i < count; i++) {
      const id = voxelBeds.getUint16(i * 2, true);
      if (id >= counts.length) invalid++;
      else counts[id]++;
    }
    expect(invalid).toBe(0);
    expect(modelBeds).toHaveLength(257);
    for (const bed of modelBeds) {
      const index = manifest.beds.indexOf(bed.id) + 1;
      expect(index).toBeGreaterThan(0);
      expect(counts[index] / 1000).toBeCloseTo(bed.volume, 3);
    }
    expect(count - counts[0]).toBe(manifest.validation.bedVoxelCount);
    expect(manifest.bedMapping).toBe('existing-voxel-bed-assignment');
  });
});

import { createHash } from 'node:crypto';
import { inflateSync } from 'node:zlib';
import { describe, expect, it } from 'vitest';
import { VESSEL_BY_ID, VESSELS } from './index';
import { expandVessels } from './expand';
import { VESSEL_DEFS } from './vessels';
import audit from './generated/mraCommunicatingAudit.json';
import curves from './generated/mraCommunicatingPaths.json';
import physiologicalPaths from './generated/vesselPaths.json';
import previousRenderPaths from './generated/vesselRenderPaths.json';

const distance = (a: number[], b: number[]) => Math.hypot(...a.map((value, index) => value - b[index]));
const measuredIds = ['pcomm_r', 'pcomm_l', 'acomm'] as const;
const appended = /<AppendedData[^>]*>([\s\S]*?)<\/AppendedData>/.exec(audit.originalGraphVtp)![1].replace(/\s/g, '').slice(1);

function decodeArray(section: string, name?: string): Buffer {
  const sectionXml = new RegExp(`<${section}[^>]*>([\\s\\S]*?)<\\/${section}>`).exec(audit.originalGraphVtp)![1];
  const arrays = [...sectionXml.matchAll(/<DataArray\b([^>]*)\/?\s*>/g)];
  const attributes = arrays.find((entry) => !name || entry[1].includes(`Name="${name}"`))![1];
  const offset = Number(/offset="(\d+)"/.exec(attributes)![1]);
  const encoded = appended.slice(offset);
  const blocks = Buffer.from(encoded.slice(0, 24), 'base64').readUInt32LE(0);
  const headerCharacters = Math.ceil(((3 + blocks) * 4) / 3) * 4;
  const header = Buffer.from(encoded.slice(0, headerCharacters), 'base64');
  let position = headerCharacters;
  const decoded: Buffer[] = [];
  for (let index = 0; index < blocks; index++) {
    const characters = Math.ceil(header.readUInt32LE(12 + index * 4) / 3) * 4;
    decoded.push(inflateSync(Buffer.from(encoded.slice(position, position + characters), 'base64')));
    position += characters;
  }
  return Buffer.concat(decoded);
}

const pointBytes = decodeArray('Points');
const sourcePoints = Array.from({ length: pointBytes.length / 12 }, (_, index) => [0, 1, 2].map((axis) => pointBytes.readFloatLE(index * 12 + axis * 4)));
const labelBytes = decodeArray('CellData', 'labels');
const edgeBytes = decodeArray('Lines', 'connectivity');
const sourceEdges = Array.from({ length: labelBytes.length / 4 }, (_, index) => ({
  first: Number(edgeBytes.readBigInt64LE(index * 16)),
  second: Number(edgeBytes.readBigInt64LE(index * 16 + 8)),
  label: labelBytes.readInt32LE(index * 4),
}));

describe('MRA communicating vessel source and placement', () => {
  it('retains the pinned original MRA graph and separate noncommercial license', () => {
    expect(audit.modality).toBe('MRA');
    expect(audit.case).toBe('008');
    expect(audit.license).toBe('CC-BY-NC-4.0');
    expect(audit.sourceRecord).toBe('https://zenodo.org/records/17358162');
    expect(createHash('sha256').update(audit.originalGraphVtp).digest('hex')).toBe(audit.sourceFiles['topcow_mr_008.vtp'].sha256);
    expect(audit.integrity).toContain('whole archive MD5 not verified');
    expect(sourcePoints).toHaveLength(1020);
    expect(sourceEdges).toHaveLength(1020);
  });

  it('keeps every physiological path, radius and topology unchanged', () => {
    const paths = physiologicalPaths as Record<string, number[][]>;
    for (const authored of expandVessels(VESSEL_DEFS)) {
      const actual = VESSEL_BY_ID[authored.id];
      expect(actual.path, authored.id).toEqual(paths[authored.id] ?? authored.path);
      for (const key of ['r', 'from', 'to', 'parent', 'children'] as const) expect(actual[key], `${authored.id}.${key}`).toEqual(authored[key]);
    }
    expect(audit.simulationParametersChanged).toBe(false);
  });

  it.each(measuredIds)('%s preserves the selected real curve under a proper similarity', (id) => {
    const branch = audit.branches[id];
    const source = branch.sourcePointIds.map((point) => sourcePoints[point]);
    const rotation = branch.rotationColumnVector;
    const determinant = rotation[0][0] * (rotation[1][1] * rotation[2][2] - rotation[1][2] * rotation[2][1])
      - rotation[0][1] * (rotation[1][0] * rotation[2][2] - rotation[1][2] * rotation[2][0])
      + rotation[0][2] * (rotation[1][0] * rotation[2][1] - rotation[1][1] * rotation[2][0]);
    expect(determinant).toBeCloseTo(1, 10);
    for (let row = 0; row < 3; row++) for (let other = 0; other < 3; other++) {
      expect(rotation[row].reduce((sum, value, axis) => sum + value * rotation[other][axis], 0)).toBeCloseTo(row === other ? 1 : 0, 10);
    }
    source.forEach((point, index) => {
      const transformed = rotation.map((row, axis) => branch.scale * row.reduce((sum, value, column) => sum + value * point[column], 0) + branch.translation[axis]);
      expect(distance(curves[id][index], transformed)).toBeLessThan(1e-9);
      if (index) expect(distance(curves[id][index], curves[id][index - 1]) / distance(point, source[index - 1])).toBeCloseTo(branch.scale, 8);
    });
    expect(VESSEL_BY_ID[id].renderPath).toEqual(curves[id]);
    expect(VESSEL_BY_ID[id].path).not.toEqual(curves[id]);
  });

  it.each(measuredIds)('%s follows connected source labels and attaches to rendered anatomy', (id) => {
    const branch = audit.branches[id];
    const ids = branch.sourcePointIds;
    for (let index = 1; index < ids.length; index++) {
      expect(sourceEdges.some((edge) => edge.label === branch.label && ((edge.first === ids[index - 1] && edge.second === ids[index]) || (edge.second === ids[index - 1] && edge.first === ids[index])))).toBe(true);
    }
    for (const [index, endpoint] of [0, ids.length - 1].entries()) {
      const sourceLabels = [...new Set(sourceEdges.filter((edge) => edge.first === ids[endpoint] || edge.second === ids[endpoint]).map((edge) => edge.label))].sort((a, b) => a - b);
      expect(sourceLabels).toEqual(branch.sourceEndpointAdjacentLabels[index]);
      const [parent, location] = branch.targetAttachments[index];
      const vessel = VESSEL_BY_ID[String(parent)];
      const parentPath = vessel.renderPath ?? vessel.path;
      const target = Number(location) === -1 ? parentPath.at(-1)! : parentPath[0];
      expect(distance(curves[id][index ? curves[id].length - 1 : 0], target)).toBeLessThan(1e-9);
    }
  });

  it('classifies the relocated tuberothalamic connectors as authored and preserves their remaining course', () => {
    const previous = previousRenderPaths as Record<string, number[][]>;
    const physiological = physiologicalPaths as Record<string, number[][]>;
    for (const id of ['tuberothalamic_r', 'tuberothalamic_l'] as const) {
      const connector = audit.authoredConnectors[id];
      expect(connector.classification).toContain('not measured MRA');
      expect(curves[id].slice(1)).toEqual((previous[id] ?? physiological[id]).slice(1));
      expect(distance(curves[id][0], connector.newStart)).toBeLessThan(1e-9);
      expect(VESSEL_BY_ID[id].renderPath).toEqual(curves[id]);
    }
    expect(audit.branches.acomm.omittedLabelEdges).toBe(2);
    expect(audit.thirdA2).toContain('excluded');
    const overrideIds = new Set(Object.keys(curves));
    for (const vessel of VESSELS.filter((vessel) => !overrideIds.has(vessel.id))) {
      expect(vessel.renderPath).toEqual(previous[vessel.id]);
    }
  });
});

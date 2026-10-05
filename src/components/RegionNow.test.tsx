// @vitest-environment jsdom
/**
 * The region details under reduced consciousness (does not mount the 3D scene): a deficit that
 * cannot be examined while the patient is comatose has not "recovered" (X1-2).
 */
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render } from '@testing-library/react';
import { tr } from '../anatomy';
import { SCENARIO_BY_ID } from '../anatomy/scenarios';
import { SYMPTOM_BY_ID } from '../anatomy/symptoms';
import { TIME_STOPS } from '../anatomy/timeline';
import type { Lang } from '../anatomy/types';
import { simulate } from '../engine/simulate';
import { useApp } from '../state/store';
import { RightPanel } from './RightPanel';

afterEach(() => {
  cleanup();
});

const name = (id: string, lang: Lang) => tr(SYMPTOM_BY_ID[id].name, lang);

describe('region details while the patient is comatose (X1-2)', () => {
  it.each(['zh-TW', 'en'] as Lang[])('%s: the reading loss of the left angular gyrus cannot be examined in the herniation coma; it has not recovered', (lang) => {
    const { occlusions } = SCENARIO_BY_ID.l_m1;
    const i = TIME_STOPS.findIndex((s) => s.h === 48);
    const input = { occlusions, variants: [], map: 93, collateral: 'moderate' as const, reperfusionH: null, decompression: false };
    const sim = simulate({ ...input, tH: 48 });
    expect(sim.nihss.items['1a']).toBe(3);
    // the angular gyrus is the source of the alexia listed at 1 day
    expect(simulate({ ...input, tH: 24 }).symptoms.find((s) => s.id === 'alexia')?.sources).toContain('angular_l');
    useApp.setState({ ...input, selected: { kind: 'region', id: 'angular_l' }, rightTab: 'details', tIndex: i, lang });
    const { container } = render(<RightPanel sim={sim} />);
    const recovered = container.querySelector('.func-group.recovered')?.textContent ?? '';
    const compensated = container.querySelector('.func-group.compensated')?.textContent ?? '';
    expect(recovered + compensated).not.toContain(name('alexia', lang));
    const hidden = container.querySelector('.func-group.unexaminable');
    expect(hidden).not.toBeNull();
    expect(hidden!.textContent).toContain(name('alexia', lang));
    // the function strip at 2 days names the reading loss as not examinable, and is not drawn empty
    const label = lang === 'en' ? 'Cannot be examined' : '無法檢查';
    const cell = [...container.querySelectorAll('.sg-cell')].find(
      (c) => (c.getAttribute('title') ?? '').startsWith(tr(TIME_STOPS[i].label, lang)) && (c.getAttribute('title') ?? '').includes(label),
    );
    expect(cell).toBeDefined();
    expect(cell!.getAttribute('title')).toContain(name('alexia', lang));
    expect(cell!.className).not.toMatch(/\bempty\b/);
  });
});

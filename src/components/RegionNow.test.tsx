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
    // the angular gyrus is the source of the alexia there at 1 day (not examinable then either, but
    // because the global aphasia leaves too little comprehension to test reading: Z3-16)
    const day1 = simulate({ ...input, tH: 24 });
    expect(day1.unexaminable.find((s) => s.id === 'alexia')?.why).toBe('aphasia');
    expect(day1.unexaminable.find((s) => s.id === 'alexia')?.sources).toContain('angular_l');
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

// W2-10: from two days on, the penumbra that survives is no longer counted as penumbra but is still
// silent, regaining its function; the region's deficits are not those of dead tissue. The same holds
// for the tissue a reopening rescued (Y1-12)
describe('region details: tissue that survived and is still regaining its function (W2-10)', () => {
  const groupOf = (container: HTMLElement) => container.querySelector('.region-now .func-group:not(.unexaminable):not(.recovered):not(.compensated)');
  const DEAD = { en: /tissue has died, usually leaving a lasting deficit/, 'zh-TW': /組織壞死，多半會留下後遺症/ };
  const REGAINING = { en: /survived and is (still )?regaining its function/, 'zh-TW': /存活下來，仍在逐漸恢復功能/ };
  const cases: [string, number | null, number, string][] = [
    // untreated left M1 at 2 days: about a quarter of Broca's area is dead, most of the rest survives
    ['the left M1 at 2 days', null, 48, 'broca_l'],
    // reopened at 3 h: little died, the rest regains its function over hours
    ['the left M1 reopened at 3 h, at 4.5 h', 3, 4.5, 'broca_l'],
  ];
  it.each((['zh-TW', 'en'] as Lang[]).flatMap((lang) => cases.map((c) => [lang, ...c] as const)))(
    '%s: %s, the deficits of the region are told as recovering, not as those of dead tissue',
    (lang, _name, reperfusionH, tH, region) => {
      const input = { occlusions: SCENARIO_BY_ID.l_m1.occlusions, variants: [], map: 93, collateral: 'good' as const, reperfusionH, decompression: false };
      const sim = simulate({ ...input, tH });
      // most of the region is alive but silent, a minority is dead
      expect(sim.regions[region].infarct).toBeLessThan(0.3);
      expect(sim.regions[region].dys).toBeGreaterThan(0.7);
      useApp.setState({ ...input, selected: { kind: 'region', id: region }, rightTab: 'details', tIndex: TIME_STOPS.findIndex((s) => s.h === tH), lang });
      const { container } = render(<RightPanel sim={sim} />);
      const title = groupOf(container)?.querySelector('.func-title')?.textContent ?? '';
      expect(title).not.toMatch(DEAD[lang]);
      expect(title).toMatch(REGAINING[lang]);
      // the function status lists the share still regaining its function
      expect(container.querySelector('.rec-status')?.textContent ?? '').toContain(lang === 'en' ? 'Survived, still regaining function' : '存活，仍在恢復功能');
    },
  );
});

// W3-5: a lacune is shown at its own share of the structure (the corona radiata lacune is about
// 0.8 of its 12.4 mL), and the details say why so small a share costs most of the function
describe('region details of a lacune (W3-5)', () => {
  it.each(['zh-TW', 'en'] as Lang[])('%s: the dead share is the lacune’s own, and the note says what it costs', (lang) => {
    const { occlusions } = SCENARIO_BY_ID.l_cr_lacune;
    const i = TIME_STOPS.findIndex((s) => s.h === 2160);
    const input = { occlusions, variants: [], map: 93, collateral: 'good' as const, reperfusionH: null, decompression: false };
    const sim = simulate({ ...input, tH: 2160 });
    useApp.setState({ ...input, selected: { kind: 'region', id: 'corona_radiata_l' }, rightTab: 'details', tIndex: i, lang });
    const { container } = render(<RightPanel sim={sim} />);
    const dead = container.querySelector('.rec-status li.dead')?.textContent ?? '';
    expect(dead).toMatch(/\b6%/);
    expect(dead).toContain(lang === 'en' ? 'a lacune' : '腔隙');
    expect(dead).toMatch(/80%/);
  });
});

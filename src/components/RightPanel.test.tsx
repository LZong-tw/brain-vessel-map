// @vitest-environment jsdom
/**
 * Component tests for two Results-panel fixes (does not mount the 3D scene):
 *  - NIHSS 0 with uncaptured symptoms gets a clarifying note, not just "no deficit".
 *  - Effect-only regions (secondary degeneration/diaschisis) don't show a misleading "0%".
 */
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { REGION_BY_ID, regionName, tr } from '../anatomy';
import { SYMPTOM_BY_ID } from '../anatomy/symptoms';
import { RECOVERY_UI } from '../i18n/uiRecovery';
import { regionAffectedPct } from '../ui/regionLabel';
import { simulate } from '../engine/simulate';
import { useApp } from '../state/store';
import { RightPanel } from './RightPanel';

afterEach(() => {
  cleanup();
});

const occl = (...ids: string[]) => ids.map((vessel) => ({ vessel, severity: 1 }));
const tIndexFor = (h: number) => {
  const stops = [0, 0.25, 0.5, 1, 2, 3, 4.5, 6, 12, 24, 48, 72, 120, 168, 336, 720, 2160, 4320];
  return stops.indexOf(h);
};

describe('NIHSS total of 0 with symptoms the scale does not capture', () => {
  it('shows the "uncaptured" note for a right ophthalmic occlusion (amaurosis)', () => {
    const occlusions = occl('ophthalmic_r');
    const sim = simulate({ occlusions, variants: [], map: 93, collateral: 'good', tH: 1, reperfusionH: null, decompression: false });
    expect(sim.nihss.total).toBe(0);
    useApp.setState({ occlusions, rightTab: 'now', tIndex: tIndexFor(1), lang: 'zh-TW' });
    render(<RightPanel sim={sim} />);
    // throws if not found
    screen.getByText('NIHSS 未涵蓋這些症狀（例如單眼視力喪失）：分數 0 不代表沒有症狀。');
    // the score may be 0, but the label must not claim there are no symptoms
    expect(screen.queryByText('無症狀')).toBeNull();
    screen.getByText('量表未涵蓋');
  });

  it('does not show the note when there is nothing uncaptured', () => {
    const occlusions = occl('mca_m1_l');
    const sim = simulate({ occlusions, variants: [], map: 93, collateral: 'good', tH: 24, reperfusionH: null, decompression: false });
    expect(sim.nihss.total).toBeGreaterThan(0);
    useApp.setState({ occlusions, rightTab: 'now', tIndex: tIndexFor(24), lang: 'zh-TW' });
    render(<RightPanel sim={sim} />);
    expect(screen.queryByText(/NIHSS 未涵蓋/)).toBeNull();
  });
});

describe('effect-only regions in the affected-regions list', () => {
  it('shows the effect label without a misleading "0%" for Wallerian degeneration / diaschisis', () => {
    const occlusions = occl('mca_m1_l');
    const sim = simulate({ occlusions, variants: [], map: 93, collateral: 'good', tH: 720, reperfusionH: null, decompression: false });
    // sanity-check the scenario this test relies on (see engine/engine.test.ts "downstream cascade")
    expect(sim.regions.pons_caudal_basis_l.effect).toBe('degeneration');
    expect(sim.regions.pons_caudal_basis_l.dys).toBeLessThan(0.01);
    expect(sim.regions.cerebellum_superior_r.effect).toBe('diaschisis');

    useApp.setState({ occlusions, rightTab: 'now', tIndex: tIndexFor(720), lang: 'zh-TW' });
    const { container } = render(<RightPanel sim={sim} />);
    const regionList = container.querySelector('.region-list');
    expect(regionList).not.toBeNull();
    const scoped = within(regionList as HTMLElement);

    const degName = regionName(REGION_BY_ID.pons_caudal_basis_l, 'zh-TW');
    const degItem = scoped.getByText(degName).closest('li')!;
    within(degItem).getByText('續發退化');
    expect(within(degItem).queryByText(/%$/)).toBeNull();

    // diaschisis does silence some living tissue (recovery model), so a small percentage may be
    // shown — but it is that modelled dysfunction, never a misleading "0%"
    const diaName = regionName(REGION_BY_ID.cerebellum_superior_r, 'zh-TW');
    const diaItem = scoped.getByText(diaName).closest('li')!;
    within(diaItem).getByText('遠隔功能抑制');
    expect(within(diaItem).queryByText('0%')).toBeNull();
    const shown = within(diaItem).queryByText(/%$/)?.textContent ?? null;
    expect(shown).toBe(regionAffectedPct(sim.regions.cerebellum_superior_r));
  });
});

describe('named syndromes', () => {
  const at = (scenarioOcc: { vessel: string; severity: number }[], tH: number, map: number) =>
    simulate({ occlusions: scenarioOcc, variants: [], map, collateral: 'good', tH, reperfusionH: null, decompression: false });

  it('tags a vascular-pattern label whose side has no symptom left as clinically silent, in both languages', () => {
    // right ICA stenosis with low blood pressure (65 mmHg: a proximal arm weakness that recovers;
    // at 60 mmHg, the teaching scenario, a mild one stays: C1-F6)
    const occlusions = [{ vessel: 'ica_cervical_r', severity: 0.85 }];
    const late = at(occlusions, 2160, 65);
    expect(late.syndromes.find((s) => s.def.id === 'watershed')?.silent).toBe(true);
    useApp.setState({ occlusions, map: 65, rightTab: 'now', tIndex: tIndexFor(2160), lang: 'zh-TW' });
    const { container } = render(<RightPanel sim={late} />);
    const box = container.querySelector('details.syndrome') as HTMLElement;
    expect(within(box).getByText('臨床無症狀').getAttribute('title')).toContain('這一側已沒有可察覺的症狀');
    cleanup();

    useApp.setState({ lang: 'en' });
    const en = render(<RightPanel sim={late} />);
    expect(within(en.container.querySelector('details.syndrome') as HTMLElement).getByText('clinically silent')).toBeTruthy();
    cleanup();

    // the acute stage has symptoms: no tag
    const early = at(occlusions, 24, 65);
    useApp.setState({ lang: 'zh-TW', tIndex: tIndexFor(24) });
    const acute = render(<RightPanel sim={early} />);
    expect(early.syndromes.some((s) => s.def.id === 'watershed')).toBe(true);
    expect(within(acute.container.querySelector('details.syndrome') as HTMLElement).queryByText('臨床無症狀')).toBeNull();
  });
});

describe('a lacune can be placed within its bundle (C6-F5)', () => {
  it('offers the sites of a lenticulostriate branch and switches the occlusion to the one chosen', () => {
    const occlusions = [{ vessel: 'lenticulostriate_l', severity: 1, branch: true }];
    useApp.setState({ occlusions, selected: { kind: 'vessel', id: 'lenticulostriate_l' }, rightTab: 'details', tIndex: tIndexFor(24), lang: 'en' });
    const sim = simulate({ occlusions, variants: [], map: 93, collateral: 'good', tH: 24, reperfusionH: null, decompression: false });
    render(<RightPanel sim={sim} />);
    const pick = screen.getByRole('combobox', { name: 'Where the branch lies' }) as HTMLSelectElement;
    expect([...pick.options].map((o) => o.value)).toEqual(['pure_motor', 'ataxic', 'dch', 'genu']);
    expect(pick.value).toBe('pure_motor');
    fireEvent.change(pick, { target: { value: 'ataxic' } });
    expect(useApp.getState().occlusions).toEqual([{ vessel: 'lenticulostriate_l', severity: 1, branch: true, lacuneSite: 'ataxic' }]);
  });

  it('is not offered for a whole-bundle occlusion or a bundle with one site', () => {
    for (const occlusions of [[{ vessel: 'lenticulostriate_l', severity: 1 }], [{ vessel: 'thalamogeniculate_l', severity: 1, branch: true }]]) {
      const id = occlusions[0].vessel;
      useApp.setState({ occlusions, selected: { kind: 'vessel', id }, rightTab: 'details', tIndex: tIndexFor(24), lang: 'en' });
      const sim = simulate({ occlusions, variants: [], map: 93, collateral: 'good', tH: 24, reperfusionH: null, decompression: false });
      render(<RightPanel sim={sim} />);
      expect(screen.queryByRole('combobox', { name: 'Where the branch lies' })).toBeNull();
      cleanup();
    }
  });
});

// X1-2: the symptom list of the displayed time names apart what the lesion gives but cannot be
// examined while the patient is comatose, rather than leaving it out without a word
describe('symptom list under reduced consciousness', () => {
  it.each(['zh-TW', 'en'] as const)('%s: the herniation coma of a left M1 infarct lists executive function and reading apart, as not examinable', (lang) => {
    const occlusions = occl('mca_m1_l');
    const sim = simulate({ occlusions, variants: [], map: 93, collateral: 'moderate', tH: 48, reperfusionH: null, decompression: false });
    expect(sim.nihss.items['1a']).toBe(3);
    useApp.setState({ occlusions, collateral: 'moderate', rightTab: 'now', tIndex: tIndexFor(48), lang });
    const { container } = render(<RightPanel sim={sim} />);
    const group = container.querySelector('.sym-group.unexaminable') as HTMLElement;
    expect(group).not.toBeNull();
    within(group).getByText(lang === 'en' ? /Cannot be examined at this level of consciousness/ : /意識下降，目前無法檢查/);
    for (const id of ['executive', 'alexia']) within(group).getByText(tr(SYMPTOM_BY_ID[id].name, lang));
    // what is listed is not repeated there
    expect(within(group).queryByText(tr(SYMPTOM_BY_ID.arm_weak.name, lang))).toBeNull();
  });

  // Y2-14, Y2-15: what cannot be examined for another reason is named with that reason
  it.each(['zh-TW', 'en'] as const)('%s: a blind patient (both P2 arteries) lists face and object recognition apart, as not testable without sight', (lang) => {
    const occlusions = occl('pca_p2_r', 'pca_p2_l');
    const sim = simulate({ occlusions, variants: [], map: 93, collateral: 'moderate', tH: 24, reperfusionH: null, decompression: false });
    useApp.setState({ occlusions, collateral: 'moderate', rightTab: 'now', tIndex: tIndexFor(24), lang });
    const { container } = render(<RightPanel sim={sim} />);
    const group = container.querySelector('.sym-group.unexaminable') as HTMLElement;
    expect(group).not.toBeNull();
    within(group).getByText(lang === 'en' ? 'Cannot be tested: the patient cannot see' : '看不見，目前無法檢查');
    for (const id of ['prosopagnosia', 'visual_agnosia']) within(group).getByText(tr(SYMPTOM_BY_ID[id].name, lang));
    expect(within(group).queryByText(lang === 'en' ? /level of consciousness/ : /意識下降/)).toBeNull();
  });

  it.each(['zh-TW', 'en'] as const)('%s: akinetic mutism (both A2 arteries) lists praxis and the alien hand apart, with its own reason', (lang) => {
    const occlusions = occl('aca_a2_r', 'aca_a2_l');
    const sim = simulate({ occlusions, variants: [], map: 93, collateral: 'moderate', tH: 24, reperfusionH: null, decompression: false });
    useApp.setState({ occlusions, collateral: 'moderate', rightTab: 'now', tIndex: tIndexFor(24), lang });
    const { container } = render(<RightPanel sim={sim} />);
    const group = container.querySelector('.sym-group.unexaminable') as HTMLElement;
    within(group).getByText(lang === 'en' ? 'Cannot be examined: akinetic mutism' : '無動性緘默，目前無法檢查');
    within(group).getByText(tr(SYMPTOM_BY_ID.callosal_apraxia.name, lang), { exact: false });
  });

  // Z3-16: an awake patient with a global aphasia cannot be tested for reading, writing or
  // calculation either; so the awake patient without such a group is one who understands speech
  it.each(['zh-TW', 'en'] as const)('%s: an awake patient with a global aphasia (left M1) lists reading and writing apart, as tested through language', (lang) => {
    const occlusions = occl('mca_m1_l');
    const sim = simulate({ occlusions, variants: [], map: 93, collateral: 'moderate', tH: 24, reperfusionH: null, decompression: false });
    expect(sim.nihss.items['1a'] ?? 0).toBe(0);
    useApp.setState({ occlusions, collateral: 'moderate', rightTab: 'now', tIndex: tIndexFor(24), lang });
    const { container } = render(<RightPanel sim={sim} />);
    const group = container.querySelector('.sym-group.unexaminable') as HTMLElement;
    expect(group).not.toBeNull();
    // (beside the clumsy hand of the plegic arm, named apart for the paralysed limb: V2-10)
    expect(group.querySelector('h4')?.getAttribute('title')).toContain(RECOVERY_UI[lang].unexaminableBy.aphasia.title);
    const items = [...group.querySelectorAll('li')].map((li) => li.textContent ?? '');
    for (const id of ['alexia', 'agraphia']) expect(items.some((x) => x.includes(tr(SYMPTOM_BY_ID[id].name, lang))), id).toBe(true);
    expect(items.some((x) => x.includes(tr(SYMPTOM_BY_ID.apraxia.name, lang)))).toBe(false);
  });

  it('an awake patient who understands speech: only the clumsy hand of the plegic arm is named apart, for the paralysed limb (V2-10)', () => {
    const occlusions = occl('mca_m1_r');
    const sim = simulate({ occlusions, variants: [], map: 93, collateral: 'moderate', tH: 24, reperfusionH: null, decompression: false });
    expect(sim.nihss.items['1a'] ?? 0).toBe(0);
    expect(sim.unexaminable.map((s) => `${s.id}/${s.side}:${s.why}`)).toEqual(['hand_clumsy/l:paralysed']);
    useApp.setState({ occlusions, collateral: 'moderate', rightTab: 'now', tIndex: tIndexFor(24), lang: 'en' });
    const { container } = render(<RightPanel sim={sim} />);
    const group = container.querySelector('.sym-group.unexaminable') as HTMLElement;
    within(group).getByText(RECOVERY_UI.en.unexaminableBy.paralysed.label);
  });
});

// W2-3: before a later occlusion begins, *Now* describes the schedule so far; the line that leads
// to the Outcome tab still gives the Outcome tab's own figure, that of the whole schedule, and the
// note on when the oedema is timed from is shown only for an infarct
describe('the final-infarct line and the index-onset note with an occlusion that begins later (W2-3)', () => {
  it('a left M1 with a lower basilar occlusion from 1 month: at 3 days the line gives the whole schedule\'s final infarct', () => {
    const occlusions = [{ vessel: 'mca_m1_l', severity: 1 }, { vessel: 'basilar_lower', severity: 1, fromH: 720 }];
    const at = (tH: number) => simulate({ occlusions, variants: [], map: 93, collateral: 'good', tH, reperfusionH: null, decompression: false });
    const now = at(72);
    const whole = at(4320).volumes.finalInfarct;
    expect(whole).toBeGreaterThan(now.volumes.finalInfarct + 30);
    useApp.setState({ occlusions, variants: [], map: 93, collateral: 'good', reperfusionH: null, decompression: false, rightTab: 'now', tIndex: tIndexFor(72), lang: 'en' });
    const { container } = render(<RightPanel sim={now} />);
    const link = container.querySelector('.outcome-link')?.textContent ?? '';
    expect(link).toContain(`${Math.round(whole)}`);
    expect(link).not.toContain(`${Math.round(now.volumes.finalInfarct)} mL`);
  });

  it('a run of capsular attacks that has left no infarct yet: no note on when the oedema is timed from', () => {
    const occlusions = [
      { vessel: 'lenticulostriate_l', severity: 1, branch: true, toH: 1 / 12 },
      { vessel: 'lenticulostriate_l', severity: 1, branch: true, fromH: 1, toH: 1 + 1 / 12 },
      { vessel: 'lenticulostriate_l', severity: 1, branch: true, fromH: 6 },
    ];
    const sim = simulate({ occlusions, variants: [], map: 93, collateral: 'good', tH: 2, reperfusionH: null, decompression: false });
    expect(sim.schedule.onsetH).toBe(1);
    expect(sim.volumes.finalInfarct).toBeLessThan(0.05);
    useApp.setState({ occlusions, variants: [], map: 93, collateral: 'good', reperfusionH: null, decompression: false, rightTab: 'now', tIndex: tIndexFor(2), lang: 'en' });
    render(<RightPanel sim={sim} />);
    expect(screen.queryByText(/Oedema and complications are timed from/)).toBeNull();
  });
});

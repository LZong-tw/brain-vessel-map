// @vitest-environment jsdom
/**
 * Component tests for two Results-panel fixes (does not mount the 3D scene):
 *  - NIHSS 0 with uncaptured symptoms gets a clarifying note, not just "no deficit".
 *  - Effect-only regions (secondary degeneration/diaschisis) don't show a misleading "0%".
 */
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen, within } from '@testing-library/react';
import { REGION_BY_ID, regionName } from '../anatomy';
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
    // the watershed teaching case: right ICA stenosis with low blood pressure
    const occlusions = [{ vessel: 'ica_cervical_r', severity: 0.85 }];
    const late = at(occlusions, 2160, 60);
    expect(late.syndromes.find((s) => s.def.id === 'watershed')?.silent).toBe(true);
    useApp.setState({ occlusions, map: 60, rightTab: 'now', tIndex: tIndexFor(2160), lang: 'zh-TW' });
    const { container } = render(<RightPanel sim={late} />);
    const box = container.querySelector('details.syndrome') as HTMLElement;
    expect(within(box).getByText('臨床無症狀').getAttribute('title')).toContain('這一側已沒有可察覺的症狀');
    cleanup();

    useApp.setState({ lang: 'en' });
    const en = render(<RightPanel sim={late} />);
    expect(within(en.container.querySelector('details.syndrome') as HTMLElement).getByText('clinically silent')).toBeTruthy();
    cleanup();

    // the acute stage has symptoms: no tag
    const early = at(occlusions, 24, 60);
    useApp.setState({ lang: 'zh-TW', tIndex: tIndexFor(24) });
    const acute = render(<RightPanel sim={early} />);
    expect(early.syndromes.some((s) => s.def.id === 'watershed')).toBe(true);
    expect(within(acute.container.querySelector('details.syndrome') as HTMLElement).queryByText('臨床無症狀')).toBeNull();
  });
});

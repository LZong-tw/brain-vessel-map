// @vitest-environment jsdom
/**
 * Several arteries can be blocked at once from the interface — e.g. the pons (mid-basilar) and
 * the right cerebellum (right PICA) together, which users could not work out how to do before.
 */
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { REGION_BY_ID, VESSEL_BY_ID, regionName, vesselName } from '../anatomy';
import { simulate } from '../engine/simulate';
import { useApp } from '../state/store';
import { LeftPanel } from './LeftPanel';
import { RightPanel } from './RightPanel';

const simOf = () => {
  const s = useApp.getState();
  return simulate({ occlusions: s.occlusions, variants: s.variants, map: s.map, collateral: s.collateral, tH: 24, reperfusionH: s.reperfusionH, decompression: s.decompression });
};
const vessels = () => useApp.getState().occlusions.map((o) => o.vessel);
const PICA_R = vesselName(VESSEL_BY_ID.pica_r, 'zh-TW');

beforeEach(() => {
  useApp.getState().resetAll();
  useApp.setState({ lang: 'zh-TW' });
});
afterEach(() => {
  cleanup();
});

describe('combining occlusions', () => {
  it('adds an artery from the vessel list without replacing the scenario occlusion, and removes it again', () => {
    useApp.getState().loadScenario('basilar_mid');
    useApp.setState({ leftTab: 'vessels' });
    render(<LeftPanel sim={simOf()} />);
    fireEvent.change(screen.getByRole('searchbox'), { target: { value: '小腦後下' } });
    fireEvent.click(screen.getByRole('button', { name: `阻塞${PICA_R}（加到目前的阻塞上）` }));
    expect(vessels()).toEqual(['basilar_mid', 'pica_r']);

    // the current-occlusion strip lists both, and the toggle now shows the artery as blocked
    const strip = screen.getByRole('region', { name: '目前阻塞' });
    within(strip).getByText(vesselName(VESSEL_BY_ID.basilar_mid, 'zh-TW'));
    within(strip).getByText(PICA_R);
    fireEvent.click(screen.getByRole('button', { name: `解除${PICA_R}的阻塞` }));
    expect(vessels()).toEqual(['basilar_mid']);
  });

  it('removes one occlusion from the current-occlusion strip', () => {
    useApp.setState({ occlusions: [{ vessel: 'basilar_mid', severity: 1 }, { vessel: 'pica_r', severity: 1 }], leftTab: 'vessels' });
    render(<LeftPanel sim={simOf()} />);
    fireEvent.click(screen.getByRole('button', { name: `移除${vesselName(VESSEL_BY_ID.basilar_mid, 'zh-TW')}的阻塞` }));
    expect(vessels()).toEqual(['pica_r']);
  });

  it('adds a scenario on top of the current occlusions and keeps the settings', () => {
    useApp.getState().loadScenario('basilar_mid');
    useApp.getState().setCollateral('poor');
    useApp.setState({ leftTab: 'scenarios' });
    render(<LeftPanel sim={simOf()} />);
    fireEvent.click(screen.getByRole('button', { name: /^疊加情境：右 PICA/ }));
    expect(vessels()).toEqual(['basilar_mid', 'pica_r']);
    expect(useApp.getState().collateral).toBe('poor');
  });

  it('offers no "add" button while nothing is blocked (a scenario then simply loads)', () => {
    useApp.setState({ leftTab: 'scenarios' });
    render(<LeftPanel sim={simOf()} />);
    expect(screen.queryAllByRole('button', { name: /^疊加情境/ })).toHaveLength(0);
  });

  it('blocks an artery that supplies a region straight from the region details', () => {
    useApp.getState().loadScenario('basilar_mid');
    useApp.setState({ selected: { kind: 'region', id: 'cerebellum_posterior_inferior_r' }, rightTab: 'details' });
    render(<RightPanel sim={simOf()} />);
    screen.getByText(regionName(REGION_BY_ID.cerebellum_posterior_inferior_r, 'zh-TW'));
    fireEvent.click(screen.getByRole('button', { name: `阻塞${PICA_R}（加到目前的阻塞上）` }));
    expect(vessels()).toEqual(['basilar_mid', 'pica_r']);
  });
});

describe('addScenario', () => {
  it('never duplicates an artery that is already blocked', () => {
    useApp.getState().loadScenario('r_pica');
    useApp.getState().addScenario('r_pica');
    expect(vessels()).toEqual(['pica_r']);
  });
});

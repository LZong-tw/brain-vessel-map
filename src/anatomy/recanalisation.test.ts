import { describe, expect, it } from 'vitest';
import { VESSELS } from './index';
import { RECANALISATION_EVIDENCE, siteGroupOf, type EvidenceRange, type SiteGroup } from './recanalisation';
import { VESSEL_DEFS } from './vessels';

const SITE_GROUPS: SiteGroup[] = ['ica', 'm1', 'm2', 'distal', 'basilar', 'vertebral', 'other'];

/** every evidence entry with a readable path */
function allEntries(): [string, EvidenceRange][] {
  const e = RECANALISATION_EVIDENCE;
  const out: [string, EvidenceRange][] = [];
  for (const [site, byMethod] of Object.entries(e.success))
    for (const [method, r] of Object.entries(byMethod ?? {})) if (r) out.push([`success.${site}.${method}`, r]);
  for (const [method, r] of Object.entries(e.sich)) if (r) out.push([`sich.${method}`, r]);
  for (const [method, r] of Object.entries(e.sichMevo)) if (r) out.push([`sichMevo.${method}`, r]);
  if (e.sichLargeCore) out.push(['sichLargeCore', e.sichLargeCore]);
  if (e.tenecteplase.sich) out.push(['tenecteplase.sich', e.tenecteplase.sich]);
  if (e.tenecteplase.reperfusionBeforeEvt) out.push(['tenecteplase.reperfusionBeforeEvt', e.tenecteplase.reperfusionBeforeEvt]);
  if (e.lateIvt) out.push(['lateIvt', e.lateIvt]);
  for (const [method, r] of Object.entries(e.reocclusion)) if (r) out.push([`reocclusion.${method}`, r]);
  if (e.distalEmbolization) out.push(['distalEmbolization', e.distalEmbolization]);
  if (e.newTerritoryEmbolization) out.push(['newTerritoryEmbolization', e.newTerritoryEmbolization]);
  if (e.noReflow) out.push(['noReflow', e.noReflow]);
  return out;
}

describe('recanalisation evidence', () => {
  it('has entries', () => {
    expect(allEntries().length).toBeGreaterThan(10);
    expect(RECANALISATION_EVIDENCE.distalEmbolization).not.toBeNull();
    expect(RECANALISATION_EVIDENCE.noReflow).not.toBeNull();
  });

  it('every range satisfies 0 ≤ low ≤ high ≤ 1 and typical lies within it', () => {
    for (const [path, r] of allEntries()) {
      expect(Number.isFinite(r.low) && Number.isFinite(r.high), path).toBe(true);
      expect(r.low, path).toBeGreaterThanOrEqual(0);
      expect(r.high, path).toBeGreaterThanOrEqual(r.low);
      expect(r.high, path).toBeLessThanOrEqual(1);
      if (r.typical !== undefined) {
        expect(r.typical, path).toBeGreaterThanOrEqual(r.low);
        expect(r.typical, path).toBeLessThanOrEqual(r.high);
      }
    }
  });

  it('every entry has a source and a note in both languages', () => {
    for (const [path, r] of allEntries()) {
      expect(r.source.trim().length, path).toBeGreaterThan(0);
      expect(r.note.zh.trim().length, path).toBeGreaterThan(0);
      expect(r.note.en.trim().length, path).toBeGreaterThan(0);
    }
  });

  it('only uses known site groups', () => {
    for (const site of Object.keys(RECANALISATION_EVIDENCE.success)) expect(SITE_GROUPS).toContain(site);
  });

  it('the no-reflow note says that definitions vary and evidence is limited', () => {
    const n = RECANALISATION_EVIDENCE.noReflow!.note;
    expect(n.en).toMatch(/definitions vary/i);
    expect(n.en).toMatch(/evidence is limited/i);
    expect(n.zh).toMatch(/定義不一/);
    expect(n.zh).toMatch(/證據有限/);
  });

  it('keeps the usual treatment windows', () => {
    expect(RECANALISATION_EVIDENCE.ivtWindowH).toBe(4.5);
    expect(RECANALISATION_EVIDENCE.evtWindowH).toBe(24);
  });
});

describe('siteGroupOf', () => {
  it('maps representative vessels', () => {
    expect(siteGroupOf('ica_terminal')).toBe('ica');
    expect(siteGroupOf('ica_ophthalmic_seg')).toBe('ica');
    expect(siteGroupOf('mca_m1')).toBe('m1');
    expect(siteGroupOf('mca_m2_sup')).toBe('m2');
    expect(siteGroupOf('mca_m2_inf')).toBe('m2');
    expect(siteGroupOf('mca_angular')).toBe('distal');
    expect(siteGroupOf('aca_a2')).toBe('distal');
    expect(siteGroupOf('pca_p2')).toBe('distal');
    expect(siteGroupOf('basilar_mid')).toBe('basilar');
    expect(siteGroupOf('basilar_tip')).toBe('basilar');
    expect(siteGroupOf('va_v4_dist')).toBe('vertebral');
  });

  it('maps perforators, communicating arteries and collaterals to other', () => {
    expect(siteGroupOf('lenticulostriate')).toBe('other');
    expect(siteGroupOf('thalamoperforator')).toBe('other');
    expect(siteGroupOf('pontine_paramedian_rostral')).toBe('other');
    expect(siteGroupOf('pcomm')).toBe('other');
    expect(siteGroupOf('lepto_aca_mca_central')).toBe('other');
    for (const d of VESSEL_DEFS)
      if (d.kind === 'perforator' || d.kind === 'communicating' || d.kind === 'collateral')
        expect(siteGroupOf(d.id), d.id).toBe('other');
  });

  it('keeps extracranial segments out of the intracranial groups', () => {
    expect(siteGroupOf('ica_cervical')).toBe('other');
    expect(siteGroupOf('va_extracranial')).toBe('other');
    expect(siteGroupOf('cca_r')).toBe('other');
  });

  it('maps every occludable vessel base id to a group without throwing', () => {
    const bases = new Set(VESSELS.filter((v) => !v.visualOnly && !v.notOccludable).map((v) => v.baseId));
    expect(bases.size).toBeGreaterThan(0);
    for (const b of bases) {
      let g: SiteGroup | undefined;
      expect(() => (g = siteGroupOf(b)), b).not.toThrow();
      expect(SITE_GROUPS, b).toContain(g);
    }
  });

  it('every intracranial mapping names a real vessel (no typos)', () => {
    const ids = new Set(VESSEL_DEFS.map((d) => d.id));
    const mapped = ['ica', 'm1', 'm2', 'distal', 'basilar', 'vertebral'] as const;
    const counts = Object.fromEntries(mapped.map((g) => [g, 0])) as Record<(typeof mapped)[number], number>;
    for (const id of ids) {
      const g = siteGroupOf(id);
      if (g !== 'other') counts[g]++;
    }
    // a misspelt id in the table would silently fall back to 'other' and lower these counts
    expect(counts).toEqual({ ica: 3, m1: 1, m2: 2, distal: 23, basilar: 4, vertebral: 2 });
    // ids not in the anatomy fall back to 'other'
    expect(siteGroupOf('not_a_vessel')).toBe('other');
    expect(siteGroupOf('toString')).toBe('other');
  });
});

describe('C2-F11: VERITAS figures', () => {
  it('182 and 82 are the patients reaching mTICI ≥ 2b among those with angiographic data, not group sizes', () => {
    const evt = RECANALISATION_EVIDENCE.success.basilar!.evt!.note;
    const br = RECANALISATION_EVIDENCE.success.basilar!.bridging!.note;
    expect(evt.en).toMatch(/73% \(182 of about 250 with angiographic data; data missing for 183 of the 556\)/);
    expect(br.en).toMatch(/67% \(82 of about 122 with angiographic data\)/);
    expect(evt.en).not.toMatch(/\(182 patients/);
    expect(br.en).not.toMatch(/\(82 patients/);
    expect(evt.zh).toMatch(/約 250 位有血管攝影資料者中的 182 位/);
    expect(br.zh).toMatch(/約 122 位有資料者中的 82 位/);
  });

  it('the thrombectomy and bridging haemorrhage notes give the VERITAS basilar figures', () => {
    for (const m of ['evt', 'bridging'] as const) {
      const r = RECANALISATION_EVIDENCE.sich[m]!;
      expect(r.note.en, m).toMatch(/VERITAS/);
      expect(r.note.en, m).toMatch(/4\.9%.*6\.3%/);
      expect(r.note.en, m).toMatch(/1\.87.*0\.77–4\.57/);
      expect(r.note.zh, m).toMatch(/VERITAS/);
      expect(r.source, m).toContain('Knapen RRMM');
    }
    // the ranges span the figures quoted
    expect(RECANALISATION_EVIDENCE.sich.bridging!.high).toBeGreaterThanOrEqual(0.063);
    expect(RECANALISATION_EVIDENCE.sich.evt!.low).toBeLessThanOrEqual(0.049);
    expect(RECANALISATION_EVIDENCE.sich.evt!.high).toBeGreaterThanOrEqual(0.049);
  });
});

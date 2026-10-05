import { describe, expect, it } from 'vitest';
import { SCIENTIFIC_REFERENCES } from './sources';
import { RECANALISATION_EVIDENCE } from './recanalisation';
import REFERENCES_MD from '../../REFERENCES.md?raw';
import REGIONS_SRC from './regions.ts?raw';
import SYNDROMES_SRC from './syndromes.ts?raw';
import SYMPTOMS_SRC from './symptoms.ts?raw';
import CASCADE_SRC from '../engine/cascade.ts?raw';
import TISSUE_SRC from '../engine/tissue.ts?raw';
import TISSUE_PARAMS_SRC from '../engine/tissueParams.ts?raw';
import EDEMA_SRC from '../engine/edema.ts?raw';

/**
 * Citation corrections from the clinical-detail audit (cluster C11). Each reference was checked
 * against its PubMed record; these tests keep the corrected strings in the app's reference list,
 * in REFERENCES.md and in the source comments next to the code that relies on them.
 */

const ref = (needle: string) => SCIENTIFIC_REFERENCES.filter((r) => r.includes(needle));
const header = (src: string) => src.slice(0, src.indexOf('*/'));

describe('reference list mirrors REFERENCES.md', () => {
  it('every scientific reference is a bullet in REFERENCES.md', () => {
    for (const r of SCIENTIFIC_REFERENCES) expect(REFERENCES_MD, r).toContain(`- ${r}`);
  });
});

describe('C11-F1: brainstem-syndrome review', () => {
  it('drops the unverifiable Fiester "RadioGraphics 2019" brainstem review everywhere', () => {
    expect(ref('Fiester')).toEqual([]);
    expect(REFERENCES_MD).not.toContain('Fiester');
    expect(REGIONS_SRC).not.toContain('Fiester');
    expect(SYNDROMES_SRC).not.toContain('Fiester');
  });
  it('cites the real 2019 RadioGraphics brainstem review (Sciacca et al., PMID 31283463)', () => {
    const s = ref('Sciacca S');
    expect(s).toHaveLength(1);
    expect(s[0]).toContain('Midbrain, pons, and medulla: anatomy and syndromes. Radiographics 2019;39:1110–1125');
    expect(header(REGIONS_SRC)).toContain('Sciacca et al. (2019)');
    expect(header(SYNDROMES_SRC)).toContain('Sciacca et al., Radiographics 2019');
  });
});

describe('C11-F2: Bauer et al. 1979 locked-in syndrome', () => {
  it('gives the right volume and pages (221:77–91), not those of the 1980 paper', () => {
    const b = ref('Varieties of the locked-in syndrome');
    expect(b).toHaveLength(1);
    expect(b[0]).toContain('J Neurol 1979;221:77–91');
    expect(SYMPTOMS_SRC).toContain('Varieties of the locked-in syndrome. J Neurol. 1979;221:77-91.');
    for (const s of [b[0], SYMPTOMS_SRC, REFERENCES_MD]) expect(s).not.toMatch(/220:191/);
  });
});

describe('C11-F3: titles and an unused reference', () => {
  it('gives the real Donnan 1991 title', () => {
    const d = ref('Donnan GA');
    expect(d).toEqual([
      'Donnan GA, Bladin PF, Berkovic SF, Longley WA, Saling MM. The stroke syndrome of striatocapsular infarction. Brain 1991;114(Pt 1A):51–70.',
    ]);
    expect(REFERENCES_MD).not.toContain('Striatocapsular infarction: clinical and radiological features');
  });
  it('gives the full Pantano 1986 title', () => {
    expect(ref('Pantano P')).toEqual([
      'Pantano P, Baron JC, Samson Y, Bousser MG, Derouesne C, Comar D. Crossed cerebellar diaschisis. Further studies. Brain 1986;109(Pt 4):677–694.',
    ]);
  });
  it('lists both Tatu papers with their subtitles', () => {
    const t = ref('Tatu L');
    expect(t.join('\n')).toContain('Arterial territories of the human brain: cerebral hemispheres. Neurology 1998;50:1699–1708');
    expect(t.join('\n')).toContain('Arterial territories of human brain: brainstem and cerebellum. Neurology 1996;47:1125–1135');
  });
  it('cites Dirnagl 1999 at the ischaemic cascade it describes', () => {
    expect(ref('Dirnagl U')).toHaveLength(1);
    const at = CASCADE_SRC.indexOf("id: 'ischemic_cascade'");
    expect(CASCADE_SRC.slice(at - 300, at)).toContain('(Dirnagl, Iadecola & Moskowitz, Trends Neurosci 1999)');
    expect(header(CASCADE_SRC)).toContain('Dirnagl, Iadecola & Moskowitz, Trends Neurosci 1999');
  });
});

describe('C11-F4: NIHSS sources', () => {
  it('does not put "(NIHSS)" into the Brott 1989 title', () => {
    const b = ref('Brott T et al.');
    expect(b).toEqual(['Brott T et al. Measurements of acute cerebral infarction: a clinical examination scale. Stroke 1989;20:864–870. (The original 15-item scale.)']);
  });
  it('cites the NINDS-trial NIHSS (Lyden 1994) and the NIH form for the item codes', () => {
    expect(ref('Lyden P, Brott T')).toHaveLength(1);
    const h = header(SYMPTOMS_SRC);
    expect(h).toContain('Lyden P et al. Stroke. 1994;25:2220-2226');
    expect(h).toContain('NIH Stroke Scale form');
    expect(h).toMatch(/original 15-item scale/);
  });
});

describe('C11-F5: Yi 2023 is a futile-recanalisation analysis', () => {
  it('is labelled as what it is', () => {
    const y = ref('Yi T');
    expect(y).toHaveLength(1);
    expect(y[0]).toContain('Predictors of futile recanalization in basilar artery occlusion');
    expect(y[0]).not.toContain('reperfusion figures');
  });
  it('the basilar thrombectomy note says that about half of reperfused patients still did not reach mRS 0–3', () => {
    const r = RECANALISATION_EVIDENCE.success.basilar!.evt!;
    expect(r.note.en).toContain('208/226');
    expect(r.note.en).toMatch(/48\.1%.*did not reach mRS 0–3/);
    expect(r.note.zh).toContain('208/226');
    expect(r.note.zh).toMatch(/48\.1%.*mRS 0–3/);
    expect(r.source).toMatch(/Yi T et al\. Front Neurol 2023;14:1308036 \(post hoc ATTENTION analysis/);
  });
});

describe('C11-F6: Astrup 1981 is cited for the penumbra concept only', () => {
  it('the tissue thresholds no longer present 0.55 as an Astrup "electrically silent" band', () => {
    const h = header(TISSUE_SRC);
    expect(h).not.toMatch(/electrically silent/);
    expect(TISSUE_PARAMS_SRC).not.toMatch(/electrically silent/);
    expect(h).toMatch(/model calibration/);
    expect(h).toContain('Regenhardt et al., Front Neurol 2017');
    expect(ref('Regenhardt RW')).toHaveLength(1);
  });
});

describe('C11-F7: Minnerup 2016 is not cited for "a few per cent" of ionic uptake', () => {
  it('the oedema header states Minnerup\'s 11.5 % cut-off and why the model term is smaller', () => {
    const h = header(EDEMA_SRC);
    expect(h).not.toMatch(/a net gain of a few per cent/);
    expect(h).toContain('11.5 %');
    expect(h).toMatch(/ION_MAX/);
  });
});

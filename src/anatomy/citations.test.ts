import { describe, expect, it } from 'vitest';
import { SCIENTIFIC_REFERENCES } from './sources';
import { RECANALISATION_EVIDENCE } from './recanalisation';
import REFERENCES_MDRaw from '../../REFERENCES.md?raw';
import REGIONS_SRCRaw from './regions.ts?raw';
import SYNDROMES_SRCRaw from './syndromes.ts?raw';
import SYMPTOMS_SRCRaw from './symptoms.ts?raw';
import CASCADE_SRCRaw from '../engine/cascade.ts?raw';
import TISSUE_SRCRaw from '../engine/tissue.ts?raw';
import TISSUE_PARAMS_SRCRaw from '../engine/tissueParams.ts?raw';
import EDEMA_SRCRaw from '../engine/edema.ts?raw';
import SOURCES_SRCRaw from './sources.ts?raw';

// a Windows checkout (core.autocrlf) hands ?raw imports CRLF; the checks read lines
const lf = (text: string) => text.replace(/\r\n/g, '\n');
const REFERENCES_MD = lf(REFERENCES_MDRaw);
const REGIONS_SRC = lf(REGIONS_SRCRaw);
const SYNDROMES_SRC = lf(SYNDROMES_SRCRaw);
const SYMPTOMS_SRC = lf(SYMPTOMS_SRCRaw);
const CASCADE_SRC = lf(CASCADE_SRCRaw);
const TISSUE_SRC = lf(TISSUE_SRCRaw);
const TISSUE_PARAMS_SRC = lf(TISSUE_PARAMS_SRCRaw);
const EDEMA_SRC = lf(EDEMA_SRCRaw);
const SOURCES_SRC = lf(SOURCES_SRCRaw);

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

  it('REFERENCES.md lists each reference once', () => {
    const bullets = REFERENCES_MD.split('\n').filter((l) => l.startsWith('- '));
    expect(bullets.filter((b, i) => bullets.indexOf(b) !== i)).toEqual([]);
  });

  // R3-8: the scientific section holds exactly the app's list, each once, in the same sections
  it('the scientific section of REFERENCES.md has as many bullets as the app lists, and each is listed in the app', () => {
    const sec = REFERENCES_MD.slice(REFERENCES_MD.indexOf('## 醫學與生理文獻'), REFERENCES_MD.indexOf('## 參考的開源專案'));
    const bullets = sec.split('\n').filter((l) => l.startsWith('- ')).map((l) => l.slice(2));
    expect(bullets).toHaveLength(SCIENTIFIC_REFERENCES.length);
    expect(new Set(SCIENTIFIC_REFERENCES).size).toBe(SCIENTIFIC_REFERENCES.length);
    for (const b of bullets) expect(SCIENTIFIC_REFERENCES, b).toContain(b);
  });

  it('the post-stroke references sit under their own header in sources.ts, as in REFERENCES.md', () => {
    const md = REFERENCES_MD.slice(REFERENCES_MD.indexOf('### 中風後常見'), REFERENCES_MD.indexOf('## 參考的開源專案'));
    const post = md.split('\n').filter((l) => l.startsWith('- ')).map((l) => l.slice(2));
    expect(post.length).toBeGreaterThan(20);
    const header = SOURCES_SRC.indexOf('// ── common problems after stroke');
    expect(header).toBeGreaterThan(0);
    const after = SOURCES_SRC.slice(header, SOURCES_SRC.indexOf('];', header));
    for (const r of post) expect(after, r).toContain(r.replace(/'/g, "\\'"));
  });

  // R2-4, R2-6: checked against their PubMed records (PMID 11960898, 9409346)
  it('lists the sources behind the deep-neglect and lateral medullary sensory changes', () => {
    expect(ref('Hillis AE')).toHaveLength(1);
    expect(ref('Hillis AE')[0]).toContain('Subcortical aphasia and neglect in acute stroke: the role of cortical hypoperfusion. Brain 2002;125:1094–1104');
    expect(ref('Patterns of sensory dysfunction in lateral medullary infarction')).toHaveLength(1);
    expect(ref('Patterns of sensory dysfunction in lateral medullary infarction')[0]).toContain('Neurology 1997;49:1557–1563');
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
    // (the capsular warning syndrome paper, Donnan 1993, is a separate entry: C6-F2)
    const d = ref('Donnan GA, Bladin PF');
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

describe('C2: treatment and evidence references', () => {
  const chainB = (() => {
    const at = REFERENCES_MD.indexOf('### 臨床細節審查（B）');
    return REFERENCES_MD.slice(at, REFERENCES_MD.indexOf('\n### ', at + 5));
  })();
  it.each([
    ['Kargiotis O', 'Ther Adv Neurol Disord 2022;15:17562864221136335'],
    ['de Bastos Maximiano ML', 'Neuroradiol J 2026;39:557–566'],
    ['Menon BK, Buck BH', 'Lancet 2022;400:161–169'],
    ['Campbell BCV, Mitchell PJ', 'N Engl J Med 2018;378:1573–1582'],
    ['Alamowitch S', 'Eur Stroke J 2023;8:8–54'],
    ['Prabhakaran S', 'Stroke 2026;57:e316–e436'],
    ['Ma H, Campbell BCV', 'N Engl J Med 2019;380:1795–1803'],
    ['Thomalla G, Simonsen CZ', 'N Engl J Med 2018;379:611–622'],
    ['Xiong Y', 'N Engl J Med 2024;391:203–212'],
    // (Sarraj A et al. Stroke 2021, on early infarct growth, is a separate entry: Y1-0)
    ['Sarraj A, Hassan AE, Abraham MG', 'N Engl J Med 2023;388:1259–1271'],
    ['Huo X', 'N Engl J Med 2023;388:1272–1283'],
    ['Yoshimura S', 'N Engl J Med 2022;386:1303–1313'],
    ['Bendszus M', 'Lancet 2023;402:1753–1763'],
    ['Costalat V', 'N Engl J Med 2024;390:1677–1689'],
    ['Yaghi S, Boehme AK', 'JAMA Neurol 2015;72:1451–1457'],
    ['Yaghi S, Eisenberger A', 'JAMA Neurol 2014;71:1181–1185'],
    ['Fiorelli M', 'Stroke 1999;30:2280–2284'],
    // (Barow E et al. Neurol Res Pract 2020, on lacunar symptoms, is a separate entry: C6-F1)
    ['Barow E, Boutitie F', 'JAMA Neurol 2019;76:641–649'],
  ])('%s is listed once, in the chain-B audit section of REFERENCES.md', (who, where) => {
    const r = ref(who);
    expect(r, who).toHaveLength(1);
    expect(r[0]).toContain(where);
    expect(chainB).toContain(`- ${r[0]}`);
  });
});

describe('C8: haemodynamics, variants and tissue calibration', () => {
  it.each([
    ['Tobalem S', 'BMC Ophthalmol 2018;18:101'],
    ['Alemseged F, Van der Hoeven E', 'Stroke 2019;50:1415–1422'],
    ['Leonardi-Bee J', 'Stroke 2002;33:1315–1320'],
    ['Bang OY', 'Neurology 2019;93:e1955–e1963'],
    ['Yang P, Song L', 'Lancet 2022;400:1585–1596'],
    ['Sandset EC', 'Eur Stroke J 2026;11:aakag004'],
    ['Harper C', 'J Vasc Surg 2008;48:859–864'],
    ['Labropoulos N', 'Ann Surg 2010;252:166–170'],
    ['Huang W', 'Surg Radiol Anat 2023;45:947–957'],
    ['Triantafyllou G', 'Neuroradiology 2026;68:1607–1617'],
  ])('lists %s (%s)', (author, where) => {
    const r = ref(author);
    expect(r).toHaveLength(1);
    expect(r[0]).toContain(where);
  });
  it('cites the retinal survival-time sources next to the retina tissue parameters', () => {
    expect(TISSUE_PARAMS_SRC).toContain('Tobalem S et al.');
    expect(TISSUE_PARAMS_SRC).toContain('Hayreh SS');
  });
});

describe('Z1-7: the deep white-matter course', () => {
  it.each([
    ['Kaesmacher J, Kaesmacher M', 'Stroke 2021;52:1570–1579'],
    ['Kleine JF, Kaesmacher M', 'Stroke 2017;48:2776–2783'],
    ['Kleine JF, Beller E', 'J Neurointerv Surg 2017;9:234–239'],
  ])('lists %s (%s) once, in the flow and tissue section', (author, where) => {
    const r = ref(author);
    expect(r).toHaveLength(1);
    expect(r[0]).toContain(where);
    const at = REFERENCES_MD.indexOf('### 血流、組織與臨床模型');
    expect(REFERENCES_MD.slice(at, REFERENCES_MD.indexOf('\n### ', at + 5))).toContain(`- ${r[0]}`);
  });
  it('cites them next to the tissue parameters', () => {
    expect(TISSUE_PARAMS_SRC).toContain('Kaesmacher J');
    expect(TISSUE_PARAMS_SRC).toMatch(/Stroke\s+(\*\s+)?2021;52:1570–1579/);
    expect(TISSUE_PARAMS_SRC).toMatch(/Stroke\s+(\*\s+)?2017;48:2776–2783/);
  });
});

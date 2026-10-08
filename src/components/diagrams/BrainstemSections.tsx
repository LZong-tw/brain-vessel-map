import { useState } from 'react';
import { BED_BY_ID, REGION_BY_ID, regionName, tr } from '../../anatomy';
import type { L } from '../../anatomy/types';
import { TIME_STOPS } from '../../anatomy/timeline';
import type { SimResult } from '../../engine/simulate';
import { useApp } from '../../state/store';
import { edemaColor, stateColor, territoryColor, regionColor, toHex } from '../../ui/colors';

/**
 * Schematic axial sections through the brainstem showing vascular sectors and the key
 * nuclei/tracts inside each. Radiological orientation: anterior at the top, patient's
 * right on the viewer's left. Sector layout after Tatu et al. (Neurology 1996).
 */

interface Sector {
  base: string;
  /** polygon for the patient's RIGHT half (viewer's left); mirrored for the left */
  pts: [number, number][];
}
interface Struct {
  /** centre on the patient's right (viewer's left); mirrored automatically */
  x: number;
  y: number;
  rx: number;
  ry: number;
  abbr: string;
  name: L;
  sector: string;
  midline?: boolean;
}
interface Level {
  id: string;
  title: L;
  outline: string;
  sectors: Sector[];
  structs: Struct[];
  extra?: React.ReactNode;
}

const CX = 110;
const mirror = (pts: [number, number][]) => pts.map(([x, y]) => [2 * CX - x, y] as [number, number]);
const poly = (pts: [number, number][]) => pts.map((p) => p.join(',')).join(' ');

const LEVELS: Level[] = [
  {
    id: 'mid',
    title: { zh: '中腦（上丘高度）', en: 'Midbrain (superior colliculus)' },
    outline: 'M110 34 C92 20 50 18 36 44 C22 70 30 110 52 132 C70 150 92 156 110 156 C128 156 150 150 168 132 C190 110 198 70 184 44 C170 18 128 20 110 34 Z',
    sectors: [
      { base: 'midbrain_peduncle', pts: [[110, 34], [92, 22], [52, 24], [36, 44], [42, 70], [70, 72], [98, 58]] },
      { base: 'midbrain_paramedian', pts: [[110, 34], [98, 58], [96, 100], [110, 104]] },
      { base: 'midbrain_lateral', pts: [[42, 70], [70, 72], [98, 58], [96, 100], [80, 112], [48, 118], [34, 96]] },
      { base: 'midbrain_tectum', pts: [[48, 118], [80, 112], [96, 100], [110, 104], [110, 156], [88, 154], [60, 140]] },
    ],
    structs: [
      { x: 64, y: 44, rx: 16, ry: 8, abbr: 'CST', name: { zh: '皮質脊髓徑', en: 'Corticospinal tract' }, sector: 'midbrain_peduncle' },
      { x: 84, y: 62, rx: 12, ry: 5, abbr: 'SN', name: { zh: '黑質', en: 'Substantia nigra' }, sector: 'midbrain_peduncle' },
      { x: 98, y: 78, rx: 7, ry: 8, abbr: 'RN', name: { zh: '紅核', en: 'Red nucleus' }, sector: 'midbrain_paramedian' },
      { x: 104, y: 98, rx: 5, ry: 4, abbr: 'III', name: { zh: '動眼神經核', en: 'Oculomotor nucleus' }, sector: 'midbrain_paramedian' },
      { x: 62, y: 96, rx: 10, ry: 6, abbr: 'ML', name: { zh: '內側蹄系', en: 'Medial lemniscus' }, sector: 'midbrain_lateral' },
      { x: 52, y: 110, rx: 8, ry: 5, abbr: 'STT', name: { zh: '脊髓視丘徑', en: 'Spinothalamic tract' }, sector: 'midbrain_lateral' },
      { x: 88, y: 136, rx: 14, ry: 9, abbr: 'SC', name: { zh: '上丘', en: 'Superior colliculus' }, sector: 'midbrain_tectum' },
    ],
    extra: <circle cx={CX} cy={114} r={5} className="aqueduct" />,
  },
  {
    id: 'ponsR',
    title: { zh: '橋腦上部', en: 'Upper pons' },
    outline: 'M110 22 C70 18 30 30 24 70 C20 104 40 130 64 142 C84 152 98 154 110 154 C122 154 136 152 156 142 C180 130 200 104 196 70 C190 30 150 18 110 22 Z',
    sectors: [
      { base: 'pons_rostral_basis', pts: [[110, 22], [70, 20], [34, 36], [28, 60], [46, 92], [110, 96]] },
      { base: 'pons_rostral_lateral', pts: [[28, 60], [46, 92], [86, 100], [80, 136], [60, 140], [30, 112], [22, 84]] },
      { base: 'pons_rostral_tegmentum', pts: [[46, 92], [110, 96], [110, 154], [90, 152], [80, 136], [86, 100]] },
    ],
    structs: [
      { x: 88, y: 50, rx: 12, ry: 8, abbr: 'CST', name: { zh: '皮質脊髓徑', en: 'Corticospinal tract' }, sector: 'pons_rostral_basis' },
      { x: 58, y: 64, rx: 14, ry: 9, abbr: 'PN', name: { zh: '橋核與橋小腦纖維', en: 'Pontine nuclei' }, sector: 'pons_rostral_basis' },
      { x: 46, y: 112, rx: 10, ry: 7, abbr: 'V', name: { zh: '三叉神經運動核與主感覺核', en: 'Trigeminal motor & sensory nuclei' }, sector: 'pons_rostral_lateral' },
      { x: 66, y: 126, rx: 10, ry: 6, abbr: 'SCP', name: { zh: '上小腦腳', en: 'Superior cerebellar peduncle' }, sector: 'pons_rostral_lateral' },
      { x: 96, y: 128, rx: 5, ry: 7, abbr: 'MLF', name: { zh: '內側縱束', en: 'Medial longitudinal fasciculus' }, sector: 'pons_rostral_tegmentum' },
      { x: 82, y: 108, rx: 10, ry: 5, abbr: 'ML', name: { zh: '內側蹄系', en: 'Medial lemniscus' }, sector: 'pons_rostral_tegmentum' },
    ],
  },
  {
    id: 'ponsC',
    title: { zh: '橋腦下部（顏面丘高度）', en: 'Lower pons (facial colliculus)' },
    outline: 'M110 24 C74 18 32 30 24 66 C18 100 38 126 62 138 C82 148 98 150 110 150 C122 150 138 148 158 138 C182 126 202 100 196 66 C188 30 146 18 110 24 Z',
    sectors: [
      { base: 'pons_caudal_basis', pts: [[110, 24], [72, 20], [36, 34], [30, 56], [48, 86], [110, 90]] },
      { base: 'pons_caudal_lateral', pts: [[30, 56], [48, 86], [84, 96], [76, 132], [58, 136], [28, 108], [22, 80]] },
      { base: 'pons_caudal_tegmentum', pts: [[48, 86], [110, 90], [110, 150], [90, 148], [76, 132], [84, 96]] },
    ],
    structs: [
      { x: 86, y: 48, rx: 12, ry: 8, abbr: 'CST', name: { zh: '皮質脊髓徑', en: 'Corticospinal tract' }, sector: 'pons_caudal_basis' },
      { x: 58, y: 68, rx: 7, ry: 4, abbr: 'VI f', name: { zh: '外展神經纖維', en: 'Abducens fascicles' }, sector: 'pons_caudal_basis' },
      { x: 96, y: 132, rx: 7, ry: 6, abbr: 'VI', name: { zh: '外展神經核／PPRF', en: 'Abducens nucleus / PPRF' }, sector: 'pons_caudal_tegmentum' },
      { x: 84, y: 112, rx: 8, ry: 5, abbr: 'ML', name: { zh: '內側蹄系', en: 'Medial lemniscus' }, sector: 'pons_caudal_tegmentum' },
      { x: 52, y: 106, rx: 8, ry: 6, abbr: 'VII', name: { zh: '顏面神經核', en: 'Facial nucleus' }, sector: 'pons_caudal_lateral' },
      { x: 40, y: 86, rx: 9, ry: 7, abbr: 'MCP', name: { zh: '小腦中腳', en: 'Middle cerebellar peduncle' }, sector: 'pons_caudal_lateral' },
      { x: 64, y: 126, rx: 8, ry: 5, abbr: 'VIII', name: { zh: '前庭與耳蝸神經核', en: 'Vestibular & cochlear nuclei' }, sector: 'pons_caudal_lateral' },
    ],
  },
  {
    id: 'med',
    title: { zh: '延髓（下橄欖核高度）', en: 'Medulla (inferior olive)' },
    outline: 'M110 26 C84 22 54 30 46 56 C38 84 46 112 62 128 C78 142 96 146 110 146 C124 146 142 142 158 128 C174 112 182 84 174 56 C166 30 136 22 110 26 Z',
    sectors: [
      // the olive belongs to the anterior (ASA / vertebral) territory and is usually spared in
      // Wallenberg syndrome, whose wedge is dorsolateral, behind it (Tatu et al. 1996)
      { base: 'medulla_medial', pts: [[110, 26], [70, 28], [56, 44], [70, 64], [88, 72], [96, 110], [104, 146], [110, 146]] },
      { base: 'medulla_lateral', pts: [[56, 44], [48, 52], [44, 88], [58, 124], [80, 140], [104, 146], [96, 110], [88, 72], [70, 64]] },
    ],
    structs: [
      { x: 101, y: 40, rx: 7, ry: 10, abbr: 'Py', name: { zh: '錐體', en: 'Pyramid' }, sector: 'medulla_medial' },
      { x: 102, y: 76, rx: 5, ry: 12, abbr: 'ML', name: { zh: '內側蹄系', en: 'Medial lemniscus' }, sector: 'medulla_medial' },
      { x: 104, y: 128, rx: 5, ry: 5, abbr: 'XII', name: { zh: '舌下神經核', en: 'Hypoglossal nucleus' }, sector: 'medulla_medial' },
      { x: 76, y: 48, rx: 12, ry: 9, abbr: 'IO', name: { zh: '下橄欖核', en: 'Inferior olive' }, sector: 'medulla_medial' },
      { x: 70, y: 86, rx: 6, ry: 5, abbr: 'NA', name: { zh: '疑核（IX、X）', en: 'Nucleus ambiguus' }, sector: 'medulla_lateral' },
      { x: 56, y: 78, rx: 7, ry: 6, abbr: 'STT', name: { zh: '脊髓視丘徑', en: 'Spinothalamic tract' }, sector: 'medulla_lateral' },
      { x: 56, y: 104, rx: 7, ry: 7, abbr: 'sp V', name: { zh: '三叉神經脊髓束核', en: 'Spinal trigeminal nucleus' }, sector: 'medulla_lateral' },
      { x: 68, y: 122, rx: 8, ry: 6, abbr: 'Vest', name: { zh: '前庭神經核', en: 'Vestibular nuclei' }, sector: 'medulla_lateral' },
      { x: 50, y: 120, rx: 6, ry: 5, abbr: 'ICP', name: { zh: '下小腦腳', en: 'Inferior cerebellar peduncle' }, sector: 'medulla_lateral' },
    ],
  },
];

export function BrainstemSections({ sim }: { sim: SimResult }) {
  const lang = useApp((s) => s.lang);
  const colorMode = useApp((s) => s.colorMode);
  const selected = useApp((s) => s.selected);
  const select = useApp((s) => s.select);
  const tH = TIME_STOPS[useApp((s) => s.tIndex)].h;
  const [tip, setTip] = useState<string | null>(null);

  const fill = (rid: string) => {
    const bed = BED_BY_ID[REGION_BY_ID[rid]?.beds[0] ?? ''];
    if (!bed) return '#444';
    const c =
      colorMode === 'territory'
        ? territoryColor(bed)
        : colorMode === 'anatomy'
          ? regionColor(rid)
          : colorMode === 'edema'
            ? edemaColor(bed, sim.edema.dwi[bed.id], sim.edema.flair[bed.id], sim.edema.swelling[bed.id])
            : stateColor(bed, sim.beds[bed.id], tH);
    return toHex(c);
  };

  return (
    <div className="diagram">
      <p className="muted small">
        {lang === 'en'
          ? 'Axial sections, anterior at top, patient’s right on your left. Colours show each vascular sector; ellipses mark key nuclei and tracts (hover for names, click a sector for details).'
          : '橫切面，前方在上、病人的右側在畫面左側。顏色代表各血管供應區塊；橢圓為主要神經核與路徑（滑過看名稱、點區塊看詳細）。'}
      </p>
      <div className="bs-grid">
        {LEVELS.map((lv) => (
          <figure key={lv.id} className="bs-level">
            <svg viewBox="0 0 220 170" role="img" aria-label={tr(lv.title, lang)}>
              {(['r', 'l'] as const).map((side) =>
                lv.sectors.map((s) => {
                  const rid = `${s.base}_${side}`;
                  const pts = side === 'r' ? s.pts : mirror(s.pts);
                  const sel = selected?.kind === 'region' && selected.id === rid;
                  return (
                    <polygon
                      key={rid}
                      points={poly(pts)}
                      fill={fill(rid)}
                      className={`sector${sel ? ' sel' : ''}`}
                      onClick={() => select({ kind: 'region', id: rid })}
                      onMouseEnter={() => setTip(regionName(REGION_BY_ID[rid], lang))}
                      onMouseLeave={() => setTip(null)}
                    />
                  );
                }),
              )}
              <path d={lv.outline} className="outline" />
              {lv.extra}
              <line x1={CX} y1={10} x2={CX} y2={160} className="midline" />
              {(['r', 'l'] as const).map((side) =>
                lv.structs.map((st) => {
                  const x = side === 'r' ? st.x : 2 * CX - st.x;
                  const rid = `${st.sector}_${side}`;
                  return (
                    <g
                      key={`${side}-${st.abbr}`}
                      className="struct"
                      onMouseEnter={() => setTip(`${tr(st.name, lang)} · ${regionName(REGION_BY_ID[rid], lang)}`)}
                      onMouseLeave={() => setTip(null)}
                      onClick={() => select({ kind: 'region', id: rid })}
                    >
                      <ellipse cx={x} cy={st.y} rx={st.rx} ry={st.ry} />
                      <text x={x} y={st.y + 3} textAnchor="middle">
                        {st.abbr}
                      </text>
                    </g>
                  );
                }),
              )}
              <text x={8} y={14} className="dir">
                {lang === 'en' ? 'R' : '右'}
              </text>
              <text x={204} y={14} className="dir">
                {lang === 'en' ? 'L' : '左'}
              </text>
            </svg>
            <figcaption>{tr(lv.title, lang)}</figcaption>
          </figure>
        ))}
      </div>
      {tip && <div className="diagram-tip">{tip}</div>}
    </div>
  );
}

import { useState } from 'react';
import { VESSEL_BY_ID, vesselName } from '../../anatomy';
import type { SimResult } from '../../engine/simulate';
import { useT } from '../../state/hooks';
import { useApp } from '../../state/store';
import { fmtFlow } from '../../ui/format';
import { vesselVisual } from '../../ui/vesselState';

/**
 * Schematic basal view of the circle of Willis and vertebrobasilar system
 * (anterior at the top; patient's RIGHT on the viewer's LEFT, as in radiology).
 * Each path is drawn in the vessel's nominal direction (from → to).
 */
const SEG: Record<string, string> = {
  // anterior
  aca_a2_r: 'M188 64 L184 16',
  aca_a2_l: 'M232 64 L236 16',
  acomm: 'M188 64 L232 64',
  aca_a1_r: 'M140 118 L188 64',
  aca_a1_l: 'M280 118 L232 64',
  mca_m1_r: 'M140 118 L66 108',
  mca_m1_l: 'M280 118 L354 108',
  mca_m2_sup_r: 'M66 108 L30 80',
  mca_m2_inf_r: 'M66 108 L30 140',
  mca_m2_sup_l: 'M354 108 L390 80',
  mca_m2_inf_l: 'M354 108 L390 140',
  lenticulostriate_r: 'M103 113 L100 90',
  lenticulostriate_l: 'M317 113 L320 90',
  heubner_r: 'M188 64 L160 52',
  heubner_l: 'M232 64 L260 52',
  ica_terminal_r: 'M140 150 L140 118',
  ica_terminal_l: 'M280 150 L280 118',
  ica_ophthalmic_seg_r: 'M140 178 L140 150',
  ica_ophthalmic_seg_l: 'M280 178 L280 150',
  ica_petrous_cavernous_r: 'M140 220 L140 178',
  ica_petrous_cavernous_l: 'M280 220 L280 178',
  ophthalmic_r: 'M140 178 L108 160',
  ophthalmic_l: 'M280 178 L312 160',
  acha_r: 'M140 134 L102 176',
  acha_l: 'M280 134 L318 176',
  pcomm_r: 'M140 150 L168 250',
  pcomm_l: 'M280 150 L252 250',
  // posterior
  pca_p1_r: 'M210 266 L168 250',
  pca_p1_l: 'M210 266 L252 250',
  pca_p2_r: 'M168 250 L92 300',
  pca_p2_l: 'M252 250 L328 300',
  thalamoperforator_r: 'M189 258 L184 232',
  thalamoperforator_l: 'M231 258 L236 232',
  basilar_tip: 'M210 286 L210 266',
  basilar_upper: 'M210 318 L210 286',
  basilar_mid: 'M210 366 L210 318',
  basilar_lower: 'M210 398 L210 366',
  mesencephalic_perf_r: 'M210 276 L198 272',
  mesencephalic_perf_l: 'M210 276 L222 272',
  sca_r: 'M210 286 L128 310',
  sca_l: 'M210 286 L292 310',
  pontine_paramedian_rostral_r: 'M210 302 L198 306',
  pontine_paramedian_rostral_l: 'M210 302 L222 306',
  pontine_paramedian_caudal_r: 'M210 342 L198 346',
  pontine_paramedian_caudal_l: 'M210 342 L222 346',
  aica_r: 'M210 366 L136 388',
  aica_l: 'M210 366 L284 388',
  labyrinthine_r: 'M173 377 L160 362',
  labyrinthine_l: 'M247 377 L260 362',
  va_v4_dist_r: 'M172 440 L210 398',
  va_v4_dist_l: 'M248 440 L210 398',
  va_v4_prox_r: 'M150 490 L172 440',
  va_v4_prox_l: 'M270 490 L248 440',
  pica_r: 'M172 440 L108 468',
  pica_l: 'M248 440 L312 468',
  lat_medullary_perf_r: 'M191 419 L178 412',
  lat_medullary_perf_l: 'M229 419 L242 412',
  asa_root_r: 'M191 419 L210 444',
  asa_root_l: 'M229 419 L210 444',
  asa: 'M210 444 L210 500',
};

const LABELS: [number, number, string][] = [
  [210, 54, 'AComm'],
  [160, 88, 'A1'],
  [260, 88, 'A1'],
  [184, 10, 'A2'],
  [236, 10, 'A2'],
  [96, 126, 'M1'],
  [324, 126, 'M1'],
  [140, 236, 'ICA'],
  [280, 236, 'ICA'],
  [176, 196, 'PComm'],
  [244, 196, 'PComm'],
  [118, 290, 'P2'],
  [302, 290, 'P2'],
  [186, 270, 'P1'],
  [234, 270, 'P1'],
  [226, 340, 'BA'],
  [136, 322, 'SCA'],
  [284, 322, 'SCA'],
  [140, 400, 'AICA'],
  [280, 400, 'AICA'],
  [110, 482, 'PICA'],
  [310, 482, 'PICA'],
  [148, 504, 'VA'],
  [272, 504, 'VA'],
  [226, 500, 'ASA'],
  [98, 152, 'OA'],
  [322, 152, 'OA'],
  [92, 188, 'AChA'],
  [328, 188, 'AChA'],
];

function midAndAngle(d: string): { x: number; y: number; a: number } {
  const n = d.match(/-?\d+(\.\d+)?/g)!.map(Number);
  const [x1, y1, x2, y2] = n;
  return { x: (x1 + x2) / 2, y: (y1 + y2) / 2, a: (Math.atan2(y2 - y1, x2 - x1) * 180) / Math.PI };
}

export function WillisDiagram({ sim }: { sim: SimResult }) {
  const t = useT();
  const lang = useApp((s) => s.lang);
  const occlusions = useApp((s) => s.occlusions);
  const selected = useApp((s) => s.selected);
  const select = useApp((s) => s.select);
  const toggle = useApp((s) => s.toggleOcclusion);
  const [clickToBlock, setClickToBlock] = useState(false);
  const [hover, setHover] = useState<string | null>(null);

  return (
    <div className="diagram">
      <div className="diagram-head">
        <p className="muted small">
          {lang === 'en'
            ? 'Basal view — anterior at top, patient’s right on your left. Arrows show flow direction; numbers are mL/min.'
            : '由腦底往上看——前方在上、病人的右側在畫面左側。箭頭為血流方向，數字單位為 mL/分。'}
        </p>
        <label className="check inline">
          <input type="checkbox" checked={clickToBlock} onChange={(e) => setClickToBlock(e.target.checked)} />
          {lang === 'en' ? 'Click to block / unblock' : '點一下即阻塞／解除'}
        </label>
      </div>
      <svg viewBox="0 0 420 520" className="willis" role="img" aria-label={t.viewWillis}>
        <text x="30" y="30" className="dir">
          {lang === 'en' ? 'R' : '右'}
        </text>
        <text x="380" y="30" className="dir">
          {lang === 'en' ? 'L' : '左'}
        </text>
        <text x="210" y="515" className="dir" textAnchor="middle">
          {lang === 'en' ? 'posterior ↓' : '後 ↓'}
        </text>
        {Object.entries(SEG).map(([id, d]) => {
          const v = VESSEL_BY_ID[id];
          if (!v) return null;
          const vis = vesselVisual(id, sim, occlusions);
          const w = Math.max(1.6, v.r * 3.2);
          const m = midAndAngle(d);
          const sel = selected?.kind === 'vessel' && selected.id === id;
          const showArrow = Math.abs(vis.flow) > 0.4 && vis.state !== 'occluded' && v.r >= 0.5;
          const ang = m.a + (vis.flow < 0 ? 180 : 0);
          return (
            <g
              key={id}
              className={`seg${sel ? ' sel' : ''}${hover === id ? ' hov' : ''}`}
              onClick={() => (clickToBlock ? toggle(id) : select({ kind: 'vessel', id }))}
              onMouseEnter={() => setHover(id)}
              onMouseLeave={() => setHover(null)}
            >
              <path d={d} className="hit" />
              {sel && <path d={d} stroke="#fff" strokeWidth={w + 4} strokeLinecap="round" />}
              <path d={d} stroke={vis.color === '#1c1c1c' ? '#3a3a3a' : vis.color} strokeWidth={w} strokeLinecap="round" strokeDasharray={vis.state === 'collateral_active' ? '4 3' : undefined} />
              {vis.state === 'occluded' && (
                <g transform={`translate(${m.x} ${m.y})`}>
                  <circle r={6} fill="#5c0a14" stroke="#ff2a4a" strokeWidth={1.5} />
                  <path d="M-3 -3 L3 3 M3 -3 L-3 3" stroke="#fff" strokeWidth={1.4} />
                </g>
              )}
              {showArrow && (
                <path
                  d="M-4 -3.2 L4 0 L-4 3.2 Z"
                  transform={`translate(${m.x} ${m.y}) rotate(${ang})`}
                  fill={vis.state === 'reversed' ? '#bfe0ff' : '#ffe9c9'}
                  pointerEvents="none"
                />
              )}
              {(hover === id || sel) && (
                <text x={m.x + 8} y={m.y - 8} className="flow-num">
                  {fmtFlow(vis.flow)}
                </text>
              )}
            </g>
          );
        })}
        {LABELS.map(([x, y, s], i) => (
          <text key={i} x={x} y={y} className="lbl" textAnchor="middle">
            {s}
          </text>
        ))}
      </svg>
      {hover && (
        <div className="diagram-tip">
          {vesselName(VESSEL_BY_ID[hover], lang)} · {fmtFlow(vesselVisual(hover, sim, occlusions).flow)} {t.mlMin}
        </div>
      )}
    </div>
  );
}

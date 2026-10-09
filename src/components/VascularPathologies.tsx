import { useState } from 'react';
import type { Lang } from '../anatomy/types';
import { simulateVenousOutflow, VENOUS_VESSELS, type VenousResult, type VenousVesselId } from '../engine/venous';
import { simulateHemorrhagePressure, type HemorrhagePressureResult } from '../engine/intracranialPressure';
import { PATHOLOGY_UI } from '../i18n/vascularPathologies';

const numberOf = (value: string) => value.trim() === '' ? NaN : Number(value);
const radiusNames: Record<VenousVesselId, keyof typeof PATHOLOGY_UI.en> = {
  sss: 'sss', straight: 'straight', transverse_l: 'tsLeft', transverse_r: 'tsRight',
  sigmoid_l: 'sigmoidLeft', sigmoid_r: 'sigmoidRight', jugular_l: 'ijvLeft', jugular_r: 'ijvRight',
};
function Field({ label, value, change, min, max }: { label: string; value: string; change: (value: string) => void; min?: number; max?: number }) {
  return <label>{label}<input type="number" required step="any" value={value} min={min} max={max} onChange={event => change(event.target.value)} /></label>;
}

function VenousModel({ lang }: { lang: Lang }) {
  const s = PATHOLOGY_UI[lang];
  const [values, setValues] = useState({ flow: '', deep: '', outlet: '' });
  const [radii, setRadii] = useState<Record<string, string>>(() => Object.fromEntries(VENOUS_VESSELS.map(v => [v.id, '1'])));
  const [result, setResult] = useState<VenousResult | null>(null);
  const input = { cerebralFlowMlMin: numberOf(values.flow), deepFraction: numberOf(values.deep), outletPressureMmHg: numberOf(values.outlet), radiusRatios: Object.fromEntries(VENOUS_VESSELS.map(v => [v.id, numberOf(radii[v.id])])) };
  const valid = Number.isFinite(input.cerebralFlowMlMin) && input.cerebralFlowMlMin >= 0 && Number.isFinite(input.deepFraction) && input.deepFraction >= 0 && input.deepFraction <= 1 && Number.isFinite(input.outletPressureMmHg) && Object.values(input.radiusRatios).every(r => Number.isFinite(r) && r >= 0 && r <= 1);
  const solved = result && (result.status === 'ok' || result.status === 'undetermined') ? result : null;
  const pressure = (p: number | null) => p === null ? s.undetermined : `${p.toFixed(3)} mmHg`;
  return <section>
    <h4>{s.venousTitle}</h4>
    <p>{s.venousIntro}</p><p className="rec-caveat small">{s.venousCaveat}</p>
    <form aria-label={s.venousTitle} onChange={() => setResult(null)} onSubmit={event => { event.preventDefault(); setResult(simulateVenousOutflow(input)); }}>
      <Field label={`${s.flow} (mL/min)`} min={0} value={values.flow} change={flow => setValues({ ...values, flow })} />
      <Field label={s.deepFraction} min={0} max={1} value={values.deep} change={deep => setValues({ ...values, deep })} />
      <Field label={`${s.outletPressure} (mmHg)`} value={values.outlet} change={outlet => setValues({ ...values, outlet })} />
      <p className="small">{s.outletNote}</p>
      <fieldset><legend>{s.radiusIntro}</legend>
        {VENOUS_VESSELS.map(v => <Field key={v.id} label={s[radiusNames[v.id]]} min={0} max={1} value={radii[v.id]} change={radius => setRadii({ ...radii, [v.id]: radius })} />)}
      </fieldset>
      <p className="small">{s.ratioCaveat}</p>
      <button type="submit" disabled={!valid}>{s.calculate}</button>
      {!valid && <p className="small muted">{s.inputsIncomplete}</p>}
      <div role="status" aria-live="polite">
        {result && result.status !== 'ok' && <p>{s[result.status]}</p>}
        {solved && <dl>
          <dt>{s.sssPressure}</dt><dd>{pressure(solved.pressuresMmHg.sss)}</dd>
          <dt>{s.straightPressure}</dt><dd>{pressure(solved.pressuresMmHg.straight)}</dd>
          <dt>{s.confluencePressure}</dt><dd>{pressure(solved.pressuresMmHg.confluence)}</dd>
          <dt>{s.drainageLeft}</dt><dd>{solved.flowsMlMin.jugular_l.toFixed(3)} mL/min</dd>
          <dt>{s.drainageRight}</dt><dd>{solved.flowsMlMin.jugular_r.toFixed(3)} mL/min</dd>
        </dl>}
      </div>
    </form>
    <p><a href="https://doi.org/10.1186/s12883-015-0352-y" target="_blank" rel="noreferrer">{s.sourceBoundary}: Marcotti et al. (2015)</a></p>
  </section>;
}

function HemorrhageModel({ lang }: { lang: Lang }) {
  const s = PATHOLOGY_UI[lang];
  const [values, setValues] = useState({ added: '', icp: '', pvi: '', map: '' });
  const [result, setResult] = useState<HemorrhagePressureResult | null>(null);
  const input = { addedVolumeMl: numberOf(values.added), baselineIcpMmHg: numberOf(values.icp), pviMl: numberOf(values.pvi), mapMmHg: numberOf(values.map) };
  const valid = Object.values(input).every(Number.isFinite) && input.addedVolumeMl >= 0 && input.baselineIcpMmHg > 0 && input.pviMl > 0 && input.mapMmHg > 0;
  return <section>
    <h4>{s.hemorrhageTitle}</h4><p>{s.hemorrhageIntro}</p><p className="rec-caveat small">{s.caveat}</p>
    <form aria-label={s.hemorrhageTitle} onChange={() => setResult(null)} onSubmit={event => { event.preventDefault(); setResult(simulateHemorrhagePressure(input)); }}>
      <Field label={`${s.addedVolume} (mL)`} min={0} value={values.added} change={added => setValues({ ...values, added })} />
      <Field label={`${s.baselineIcp} (mmHg)`} min={0} value={values.icp} change={icp => setValues({ ...values, icp })} />
      <Field label={`${s.pvi} (mL)`} min={0} value={values.pvi} change={pvi => setValues({ ...values, pvi })} />
      <Field label={`${s.map} (mmHg)`} min={0} value={values.map} change={map => setValues({ ...values, map })} />
      <button type="submit" disabled={!valid}>{s.calculate}</button>
      {!valid && <p className="small muted">{s.inputsIncomplete}</p>}
      <div role="status" aria-live="polite">
        {result?.status === 'ok' ? <dl><dt>{s.icp}</dt><dd>{result.icpMmHg.toFixed(3)} mmHg</dd><dt>{s.cpp}</dt><dd>{result.cppMmHg.toFixed(3)} mmHg</dd></dl> : result && <p>{s[result.status]}</p>}
      </div>
    </form>
    <p className="small">{s.pressureNote}</p>
    <p><a href="https://doi.org/10.3171/jns.1978.48.3.0332" target="_blank" rel="noreferrer">{s.sourceBoundary}: Marmarou et al. (1978)</a></p>
  </section>;
}

export function VascularPathologies({ lang }: { lang: Lang }) {
  const s = PATHOLOGY_UI[lang];
  return <details className="pathology-models"><summary>{s.title}</summary><p>{s.caseUnchanged}</p><VenousModel lang={lang} /><HemorrhageModel lang={lang} /></details>;
}

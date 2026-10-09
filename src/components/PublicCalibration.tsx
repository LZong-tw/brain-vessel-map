import { useEffect, useRef, useState } from 'react';
import type { Lang } from '../anatomy/types';
import type { calibratePublicM1 } from '../engine/publicCalibration';
import { PUBLIC_CALIBRATION } from '../i18n/publicCalibration';

export function PublicCalibration({ lang }: { lang: Lang }) {
  const s = PUBLIC_CALIBRATION[lang];
  const worker = useRef<Worker | null>(null);
  const [result, setResult] = useState<ReturnType<typeof calibratePublicM1> | null>(null);
  const [state, setState] = useState<'idle' | 'running' | 'done' | 'error'>('idle');
  useEffect(() => () => worker.current?.terminate(), []);
  const run = () => {
    worker.current?.terminate();
    setState('running');
    setResult(null);
    try {
      const active = new Worker(new URL('../engine/publicCalibration.worker.ts', import.meta.url), { type: 'module' });
      worker.current = active;
      active.onmessage = (event: MessageEvent<{ result?: ReturnType<typeof calibratePublicM1>; error?: boolean }>) => {
        setResult(event.data.result ?? null);
        setState(event.data.result ? 'done' : 'error');
        active.terminate();
      };
      active.onerror = () => { setState('error'); active.terminate(); };
      active.postMessage({});
    } catch { setState('error'); }
  };
  return <details className="public-calibration">
    <summary>{s.title}</summary>
    <p>{s.intro}</p>
    <p className="rec-caveat small">{s.warning}</p>
    <p className="small">{s.timing}</p>
    <button onClick={run} disabled={state === 'running'}>{s.run}</button>
    <p role="status">{state === 'running' ? s.running : state === 'error' ? s.error : result ? s.rejected : ''}</p>
    {result && <>
      <p>{s.reference}</p>
      {result.fits.map(fit => <section key={fit.id}>
        <h4>{s[fit.id]}</h4>
        <dl>
          <dt>{s.factor}</dt><dd>{fit.collateralFactor.toFixed(6)}</dd>
          <dt>{s.target}</dt><dd>{fit.targetGrowthMl.toFixed(1)} mL</dd>
          <dt>{s.growth}</dt><dd>{fit.growthMl.toFixed(3)} mL</dd>
          <dt>{s.residual}</dt><dd>{fit.residualMl.toFixed(3)} mL</dd>
          <dt>{s.baseline}</dt><dd>{fit.baselineCoreMl.toFixed(3)} mL</dd>
        </dl>
      </section>)}
    </>}
    <p><a href="https://doi.org/10.1016/j.jstrokecerebrovasdis.2021.106208" target="_blank" rel="noreferrer">{s.source}</a></p>
    <p><a href="https://doi.org/10.1056/NEJMoa1713973" target="_blank" rel="noreferrer">{s.trial}</a></p>
  </details>;
}

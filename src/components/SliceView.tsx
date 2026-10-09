import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { BED_BY_ID, REGION_BY_ID, tr } from '../anatomy';
import type { Lang } from '../anatomy/types';
import type { SimResult } from '../engine/simulate';
import { SLICES } from '../i18n/slices';
import { fractionForBed, loadSlices, slicePixels, sliceShape, sliceVoxel, type SliceData, type SlicePlane } from '../scene/sliceData';

interface SliceViewProps {
  lang: Lang;
  sim: Pick<SimResult, 'beds'>;
  data?: SliceData;
}

export function SliceView({ lang, sim, data: supplied }: SliceViewProps) {
  const strings = SLICES[lang];
  const [data, setData] = useState<SliceData | null>(supplied ?? null);
  const [error, setError] = useState<'load' | 'unsupported' | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [plane, setPlane] = useState<SlicePlane>('axial');
  const [position, setPosition] = useState<number | null>(null);
  const [heatmap, setHeatmap] = useState(true);
  const [outlines, setOutlines] = useState(true);
  const canvas = useRef<HTMLCanvasElement>(null);
  const id = useId();
  useEffect(() => {
    let active = true;
    setError(null);
    if (supplied) { setData(supplied); return; }
    loadSlices().then((loaded) => { if (active) setData(loaded); }).catch((reason: unknown) => { if (active) setError(reason instanceof Error && reason.message === 'Slice decompression unsupported' ? 'unsupported' : 'load'); });
    return () => { active = false; };
  }, [supplied, attempt]);
  const fractions = useMemo(() => Object.fromEntries(Object.entries(sim.beds).map(([bed, state]) => [bed, state.infarct])), [sim]);
  const shape = data ? sliceShape(data.manifest, plane) : [1, 1, 1];
  const [width, height, count] = shape;
  const index = Math.min(count - 1, Math.max(0, position ?? Math.floor(count / 2)));
  const axis = plane === 'axial' ? 2 : plane === 'coronal' ? 1 : 0;
  const millimetres = data ? data.manifest.originMm[axis] + index * data.manifest.spacingMm[axis] : 0;
  const inSlice = useMemo(() => {
    if (!data) return [];
    const seen = new Map<string, number>();
    for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
      const voxel = sliceVoxel(data.manifest, plane, index, x, y);
      const bed = data.manifest.beds[data.bed[voxel] - 1];
      if (bed) seen.set(bed, fractionForBed(data, voxel, fractions));
    }
    return [...seen].sort(([a], [b]) => a.localeCompare(b));
  }, [data, height, width, plane, index, fractions]);
  useEffect(() => {
    if (!data || !canvas.current) return;
    const context = canvas.current.getContext('2d');
    if (!context) return;
    const image = context.createImageData(width, height);
    image.data.set(slicePixels(data, plane, index, fractions, heatmap, outlines));
    context.putImageData(image, 0, 0);
  }, [data, plane, index, width, height, fractions, heatmap, outlines]);
  if (error) return <section className="slice-view"><p role="alert">{error === 'unsupported' ? strings.unsupported : strings.error}</p><button onClick={() => setAttempt((value) => value + 1)}>{strings.retry}</button></section>;
  if (!data) return <section className="slice-view" role="status">{strings.loading}</section>;
  const horizontal = plane === 'sagittal' ? [strings.anterior, strings.posterior] : [strings.right, strings.left];
  const vertical = plane === 'axial' ? [strings.anterior, strings.posterior] : [strings.superior, strings.inferior];
  const change = (step: number) => setPosition(Math.min(count - 1, Math.max(0, index + step)));
  return <section className="slice-view" aria-labelledby={`${id}-title`}>
    <h2 id={`${id}-title`}>{strings.title}</h2>
    <p id={`${id}-limitation`} className="slice-limitation">{strings.limitation}</p>
    <p>{strings.fallback}</p>
    <div className="slice-controls">
      <label>{strings.plane} <select value={plane} onChange={(event) => { setPlane(event.target.value as SlicePlane); setPosition(null); }}>
        {(['axial', 'coronal', 'sagittal'] as const).map((value) => <option key={value} value={value}>{strings[value]}</option>)}
      </select></label>
      <label>{strings.position} <input type="range" min={0} max={count - 1} step={1} value={index} aria-valuetext={`${millimetres.toFixed(1)} mm`} onChange={(event) => setPosition(Number(event.target.value))} /></label>
      <output aria-live="polite">{strings[plane]} · {millimetres.toFixed(1)} mm · {index + 1}/{count}</output>
      <label><input type="checkbox" checked={outlines} onChange={(event) => setOutlines(event.target.checked)} />{strings.outlines}</label>
      <label><input type="checkbox" checked={heatmap} onChange={(event) => setHeatmap(event.target.checked)} />{strings.heatmap}</label>
    </div>
    <div className="slice-image">
      <div className="slice-orientation"><span>{horizontal[0]}</span><span>{vertical[0]}</span><span>{horizontal[1]}</span></div>
      <canvas ref={canvas} width={width} height={height} role="img" aria-label={strings.image} aria-describedby={`${id}-limitation ${id}-legend`} tabIndex={0}
        style={{ aspectRatio: `${width * data.manifest.spacingMm[plane === 'sagittal' ? 1 : 0]} / ${height * data.manifest.spacingMm[plane === 'axial' ? 1 : 2]}` }}
        onKeyDown={(event) => {
          if (['ArrowUp', 'ArrowRight', 'ArrowDown', 'ArrowLeft', 'Home', 'End'].includes(event.key)) {
            event.preventDefault();
            if (event.key === 'Home') setPosition(0);
            else if (event.key === 'End') setPosition(count - 1);
            else change(event.key === 'ArrowUp' || event.key === 'ArrowRight' ? 1 : -1);
          }
        }} />
      <div className="slice-orientation"><span>{vertical[1]}</span></div>
    </div>
    <p id={`${id}-legend`}>{strings.legend}</p><div className="slice-gradient" aria-hidden="true" /><p>{strings.missing}</p>
    {outlines && <ul className="slice-territories">{data.manifest.territories.map((territory) => <li key={territory.id}><span aria-hidden="true" style={{ color: `rgb(${territory.color.join(',')})` }}>● </span>{territory.side === 'l' ? strings.left : strings.right} {territory.code}</li>)}</ul>}
    <details><summary>{strings.visible}</summary>{inSlice.length ? <table><thead><tr><th>{strings.bed}</th><th>{strings.fraction}</th></tr></thead><tbody>{inSlice.map(([bed, fraction]) => {
      const region = BED_BY_ID[bed] ? REGION_BY_ID[BED_BY_ID[bed].region] : undefined;
      return <tr key={bed}><td>{region ? <>{tr(region.name, lang)} <small>({bed})</small></> : bed}</td><td>{(fraction * 100).toFixed(1)}%</td></tr>;
    })}</tbody></table> : <p>{strings.none}</p>}</details>
    <p>{strings.source}: {data.manifest.sources.map((source, i) => <span key={source.url}>{i > 0 && ' · '}<a href={source.url} target="_blank" rel="noreferrer">{source.title}</a></span>)}</p>
  </section>;
}

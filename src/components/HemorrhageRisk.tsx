import { useId, useState } from 'react';
import type { Lang } from '../anatomy/types';
import { ichExpansionRisk } from '../engine/ichExpansion';
import { ICH_EXPANSION } from '../i18n/ichExpansion';

export const ICH_EXPANSION_SOURCE = 'https://doi.org/10.1016/S1474-4422(18)30253-9';

export function HemorrhageRisk({ lang }: { lang: Lang }) {
  const strings = ICH_EXPANSION[lang];
  const id = useId();
  const [volume, setVolume] = useState('');
  const [time, setTime] = useState('');
  const [antiplatelet, setAntiplatelet] = useState('');
  const [anticoagulant, setAnticoagulant] = useState('');
  const [eligible, setEligible] = useState(false);
  const [risk, setRisk] = useState<number | null>(null);
  const ml = Number(volume), hours = Number(time);
  const complete = volume.trim() !== '' && time.trim() !== '' && Number.isFinite(ml) && ml > 0 && ml < 150 && Number.isFinite(hours) && hours >= 0.5 && hours <= 24 && antiplatelet !== '' && anticoagulant !== '' && eligible;
  const medication = (label: string, value: string, setValue: (value: string) => void) => <label>{label}<select value={value} onChange={(event) => setValue(event.target.value)}><option value="">{strings.unknown}</option><option value="yes">{strings.yes}</option><option value="no">{strings.no}</option></select></label>;
  return <details className="hemorrhage-risk">
    <summary>{strings.title}</summary>
    <p>{strings.intro}</p>
    <form aria-label={strings.title} aria-describedby={`${id}-limitations`} onChange={() => setRisk(null)} onSubmit={(event) => {
      event.preventDefault();
      setRisk(complete ? ichExpansionRisk({ baselineVolumeMl: ml, onsetToImagingHours: hours, antiplatelet: antiplatelet === 'yes', anticoagulant: anticoagulant === 'yes', eligiblePopulation: eligible }) : null);
    }}>
      <label>{strings.volume}<input type="number" value={volume} min={0} max={150} step="any" required onChange={(event) => setVolume(event.target.value)} /></label>
      <label>{strings.time}<input type="number" value={time} min={0.5} max={24} step="any" required onChange={(event) => setTime(event.target.value)} /></label>
      {medication(strings.antiplatelet, antiplatelet, setAntiplatelet)}
      {medication(strings.anticoagulant, anticoagulant, setAnticoagulant)}
      <label><input type="checkbox" checked={eligible} onChange={(event) => setEligible(event.target.checked)} />{strings.eligible}</label>
      <button type="submit" disabled={!complete}>{strings.calculate}</button>
      {!complete && <p className="muted small">{strings.incomplete}</p>}
      <output role="status" aria-live="polite">{risk !== null && <>{strings.result}: <strong>{(risk * 100).toFixed(1)}%</strong></>}</output>
    </form>
    <p id={`${id}-limitations`} className="rec-caveat small">{strings.limitation}</p>
    <a href={ICH_EXPANSION_SOURCE} target="_blank" rel="noreferrer">{strings.source}</a>
  </details>;
}

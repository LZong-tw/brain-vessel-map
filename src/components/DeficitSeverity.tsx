import { useId } from 'react';
import type { Lang } from '../anatomy/types';
import { symptomNihssPoints, type SymptomItem } from '../engine/clinical';
import { DEFICIT_SEVERITY } from '../i18n/deficitSeverity';

export function DeficitSeverity({ symptom, lang, unexaminable = false }: { symptom: SymptomItem; lang: Lang; unexaminable?: boolean }) {
  const strings = DEFICIT_SEVERITY[lang];
  const id = useId();
  const supplied = symptom.continuousSeverity;
  const severity = Number.isFinite(supplied) ? Math.max(0, Math.min(3, supplied!)) : symptom.sev;
  const points = unexaminable ? null : symptomNihssPoints(symptom);
  const formatted = severity.toFixed(2);
  return <span className="deficit-severity" title={strings.note}>
    <span>{strings.model}: <span className="num">{formatted}/3</span></span>
    <meter role="meter" min={0} max={3} value={severity} aria-valuemin={0} aria-valuemax={3} aria-valuenow={severity} aria-label={strings.model} aria-valuetext={`${formatted}/3`} aria-describedby={id} />
    {points !== null && <span className="deficit-severity-points">{strings.item}: <span className="num">{points}</span></span>}
    {unexaminable && <span className="deficit-severity-note">{strings.unexaminable}</span>}
    <span id={id} className="sr-only">{strings.note}</span>
  </span>;
}

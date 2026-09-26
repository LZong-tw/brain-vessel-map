import { useState } from 'react';
import { tr } from '../anatomy';
import { TERRITORY_INFO } from '../anatomy/territories';
import { useT } from '../state/hooks';
import { useApp } from '../state/store';
import { STATE_COLORS, VESSEL_COLORS } from '../ui/colors';

export function Legend() {
  const t = useT();
  const lang = useApp((s) => s.lang);
  const mode = useApp((s) => s.colorMode);
  // start folded on short or narrow screens so it doesn't cover the model
  const [open, setOpen] = useState(() => typeof window === 'undefined' || (window.innerHeight >= 980 && window.innerWidth > 900));
  const tissue: [string, string][] =
    mode === 'state'
      ? [
          [STATE_COLORS.core, t.states.core],
          [STATE_COLORS.penumbra, t.states.penumbra],
          [STATE_COLORS.oligemia, t.states.oligemia],
          [STATE_COLORS.salvaged, t.states.salvaged],
          [STATE_COLORS.secondary, t.states.secondary],
          [STATE_COLORS.compressed, t.states.compressed],
          [STATE_COLORS.diaschisis, t.states.diaschisis],
          [STATE_COLORS.degeneration, t.states.degeneration],
        ]
      : mode === 'territory'
        ? (['ACA', 'MCAF', 'MCAT', 'LLS', 'ACTP', 'PCAO', 'PCTP', 'SC', 'IC', 'BA'] as const).map((k) => [
            TERRITORY_INFO[k].color,
            tr(TERRITORY_INFO[k].name, lang),
          ])
        : [];
  const vessels: [string, string][] = [
    [VESSEL_COLORS.artery, lang === 'en' ? 'Normal flow' : '正常血流'],
    [VESSEL_COLORS.occluded, t.states.occluded],
    [VESSEL_COLORS.noFlow, t.noFlow],
    [VESSEL_COLORS.reversed, t.reversedFlow],
    [VESSEL_COLORS.collateral, lang === 'en' ? 'Active collateral' : '啟動的側枝'],
  ];
  return (
    <div className={`legend${open ? '' : ' closed'}`}>
      <button className="legend-toggle" onClick={() => setOpen(!open)} aria-expanded={open}>
        {t.legend} {open ? '▾' : '▸'}
      </button>
      {open && (
        <div className="legend-body">
          {tissue.length > 0 && (
            <ul>
              {tissue.map(([c, l]) => (
                <li key={l}>
                  <span className="sw" style={{ background: c }} />
                  {l}
                </li>
              ))}
            </ul>
          )}
          <ul>
            {vessels.map(([c, l]) => (
              <li key={l}>
                <span className="sw line" style={{ background: c }} />
                {l}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

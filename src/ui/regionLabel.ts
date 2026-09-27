/**
 * The trailing "…%" badge shown next to a region in the "affected regions" list
 * (src/components/RightPanel.tsx).
 *
 * Some regions there are flagged only by a secondary effect — crossed cerebellar diaschisis,
 * Wallerian / hypertrophic olivary degeneration, and the like (see BedEffectKind in
 * src/engine/cascade.ts). They have no infarcted or dysfunctional tissue of their own: the
 * region's dominant-state tag already names the effect, so a literal "0%" beside it reads as
 * "not actually affected" rather than "not directly infarcted". Such regions get no percentage
 * badge at all.
 *
 * Separately, a truly tiny but non-zero share would round down to "0%" and read the same way;
 * it is shown as "<1%" instead.
 */
export function regionAffectedPct(r: { dys: number; infarct: number; effect: unknown }): string | null {
  const level = Math.max(r.dys, r.infarct);
  if (level <= 0) return r.effect ? null : '0%';
  if (level < 0.01) return '<1%';
  return `${Math.round(level * 100)}%`;
}

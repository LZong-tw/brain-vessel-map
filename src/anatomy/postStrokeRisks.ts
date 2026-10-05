/**
 * Problems that are common after a stroke but that the lesion site does not determine, or only
 * weakly: depression, anxiety, fatigue, insomnia, sleep-disordered breathing, apathy …
 *
 * The tissue model cannot tell who will develop them, so they are shown as population figures
 * beside the outcome — how often they occur after a stroke and what is known to raise the risk —
 * never as symptoms of the simulated case, never in the NIHSS or the deficit counts.
 */
import type { L, SymptomSystem } from './types';

export interface PostStrokeRisk {
  id: string;
  /** the function it belongs to (for grouping with the case's symptoms) */
  system: SymptomSystem;
  name: L;
  /** what it is, in plain language */
  desc: L;
  /**
   * share of stroke survivors affected (0–1), from a systematic review or meta-analysis; `low` /
   * `high` are its confidence interval or range when reported
   */
  prevalence: { value: number; low?: number; high?: number };
  /** when after the stroke the figure applies, e.g. "within the first year" */
  window: L;
  /** factors with consistent evidence, and what is (or is not) known about the lesion site */
  factors: L;
  /** citations, each exactly as listed in SCIENTIFIC_REFERENCES (sources.ts) */
  sources: string[];
  /** when it typically starts, hours after the stroke (to place it along the course) */
  typicalOnsetH: number;
}

export const POST_STROKE_RISKS: PostStrokeRisk[] = [];

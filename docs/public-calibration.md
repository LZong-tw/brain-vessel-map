[繁體中文](public-calibration.zh-TW.md) · [简体中文](public-calibration.zh-CN.md) · [English](public-calibration.md) · [Deutsch](public-calibration.de.md) · [日本語](public-calibration.ja.md)

# Experimental public-data calibration

The Details calibration workbench attempts an illustrative anterior-circulation fit to published aggregate infarct-growth observations. **The attempted calibration is rejected:** its fitted factors reverse the expected collateral-quality ordering, one growth target is unreachable, and all baseline volumes disagree markedly with the independent reference. The workbench is an experimental diagnostic, not a new valid collateral profile. Its candidate factors remain separate from the default simulation.

## Published observations

[MacLellan et al., published online in 2021, journal issue 2022](https://doi.org/10.1016/j.jstrokecerebrovasdis.2021.106208) analysed 84 non-reperfused DEFUSE 3 participants from both treatment arms. Infarct growth was measured from baseline imaging to imaging 24 hours after randomization. The published median increases were:

| Baseline perfusion profile | Median growth, mL |
| --- | ---: |
| Both HIR and CBV index favorable | 21.7 |
| One favorable | 40.9 |
| Neither favorable | 108.2 |

The analysis classified HIR at or above 0.34 and CBV index at or below 0.74 as unfavorable. These imaging measurements are not the app's good/moderate/poor collateral setting. Associating their ordered groups with the app's three grades is an explicit modeling assumption. The [primary publisher abstract](https://www.strokejournal.org/article/S1052-3057%2821%2900613-3/abstract) provides the aggregate observations; individual trajectories and a patient-level distribution are not reconstructed.

## Borrowed clock and representative geometry

The workbench needs elapsed times that are not reported for each MacLellan subgroup. It borrows the original DEFUSE 3 medical-arm medians from Table 1 of [Albers et al., 2018](https://doi.org/10.1056/NEJMoa1713973), available in this [copy of the primary paper](https://paramedics.org/storage/news/Albers%20et%20al.pdf). That arm had 90 participants: onset to qualifying imaging was 9 hours 55 minutes, and onset to randomization was 10 hours 44 minutes. Adding the specified 24-hour follow-up gives a representative endpoint of 34 hours 44 minutes after onset. Model growth is the endpoint infarct volume minus the baseline-imaging infarct volume.

These are medians from the original medical arm, not timing measurements for the 84-person non-reperfused analysis or its three perfusion groups. Combining the medians produces an assumed representative clock, not an observed paired trajectory. The endpoint must not be described as 24 hours after onset.

Geometry is the project's isolated right M1 occlusion (`M1_r`), MAP 93 mmHg, without anatomical variants. Treating this full model territory as representative of the heterogeneous trial population is another explicit assumption. The medical arm's 116.1 mL median perfusion lesion does not define this model territory or its eventual infarct boundary. Its 10.1 mL median baseline ischemic core is a reference holdout: it is not fitted, and any mismatch with the modeled baseline must remain visible.

## What is fitted

Only the named-collateral conductance factor, G, is varied for each ordered aggregate target. The research-only API overrides the original `COLL_GRADE` factor for every named vessel with `kind: 'collateral'`, including cerebellar and extracranial collateral vessels. Hidden `BRAINSTEM_PIAL` connections retain their original grade-dependent conductance. Existing tissue thresholds and time constants remain fixed. This broad factor override does not supply posterior-circulation calibration evidence: the experiment's lesion remains isolated right M1. The separate research API leaves ordinary simulation inputs and defaults unchanged. Tests reproduce the calculation and its rejection; passing those tests does not mean the model has been clinically calibrated.

## Rejected fit result

The attempted fit under the stated geometry and clock gives the following model outputs. Residual means modeled growth minus the published target; displayed values are rounded.

| Published perfusion group | Candidate G | Modeled baseline, mL | Modeled growth, mL | Growth residual, mL |
| --- | ---: | ---: | ---: | ---: |
| Both favorable | 0.097422832 | 274.995 | 21.7000004 | approximately 0 |
| One favorable | 0.259092893 | 255.489 | 40.9000072 | approximately 0 |
| Neither favorable | 0.819373662 | 172.040 | 81.916233 | −26.283767 |

Higher candidate G is assigned to the less favorable published groups. This is the opposite of the intended collateral-quality interpretation. Much of the modeled infarction has already occurred by the late assumed baseline: lowering G increases that baseline injury and leaves less remaining volume to grow over the measured interval. Two matching growth differences therefore conceal very large baseline errors. None of the modeled baselines approaches the independent 10.1 mL reference, and the 108.2 mL growth target is not reached.

These failures reject the proposed geometry/clock/G-only calibration together. They do not establish a physiological reversal of collateral benefit, justify changing tissue constants to force a fit, or validate a replacement default profile. Additional measurements and a better-supported population/geometry representation would be needed for a defensible calibration.

A fitted point is not a uniquely identified physiological conductance. Occlusion geometry, blood pressure, collateral architecture and tissue kinetics can affect the same volume endpoint. Three aggregate medians do not supply uncertainty intervals for G, patient variability, independent validation, or a calibrated infarct-growth curve between measurements. The workbench must report fit residuals and the baseline reference comparison without implying clinical accuracy. No synthetic patient distribution, treatment-effect estimate, functional-outcome conversion or lesion boundary is supplied by these papers.

## Remaining calibration scope

This experiment does not recalibrate posterior circulation or two-segment basilar occlusions; cerebellar or medullary injury kinetics; lacunar injury kinetics; the 48-hour penumbra convention; anatomical symmetry of the circle of Willis and posterior-fossa arteries; or the separate posterior-parietal, temporo-occipital and temporal leptomeningeal anastomoses. Those domains remain unvalidated and retain their existing assumptions. Extending the fit requires explicit additional evidence and tests, rather than transferring an anterior aggregate fit as though it validated them.

## Additional early-growth attempt: not adopted

[Wheeler et al. (2015)](https://pmc.ncbi.nlm.nih.gov/articles/PMC4478123/)
reports initial growth as baseline infarct volume divided by onset-to-imaging
time, rather than an instantaneous derivative. Its M1 subgroup (33 patients)
has median 2.9 mL/h, IQR 1.3–7.6. This is a closer anatomical comparison than
the late, mixed-population DEFUSE 3 targets, but it still lacks public paired
M1-specific clocks, complete trajectories and regional tissue injury measurements.

The reproducible `diagnoseEarlyGrowthCalibration()` experiment assumes a
3.7-hour whole-cohort clock for that subgroup, isolated right M1, moderate
collaterals, MAP 93 mmHg and no variants. None of those representative settings
is inferred as a patient-level joint distribution. It searches a shared
multiplier of lag and tissue time constants; the search interval 0.001–10,000
and 80 iterations are numerical choices, not clinical parameter ranges.

| Experiment | Result | Decision |
|---|---|---|
| Existing model | 24.728457 mL/h at the assumed clock | Disagreement remains visible |
| Multiply every tissue's times | 10.284395× gives 2.9 mL/h, 10.73 mL at 3.7 h | Reject transfer across tissue classes |
| Slow only default tissue indefinitely | Unchanged deep/perforator injury leaves 3.779299 mL/h | Target cannot be reached |

The numerical match would shift the internal-capsule lag from 2.5 to about
25.7 hours and its time constant from 1.75 to about 18.0 hours. Those changes
have no supporting regional measurements and conflict with the much earlier
capsular injury discussed in `tissueParams.ts`; an aggregate volume match
does not validate them. The existing regional curves themselves retain their
documented probability-to-tissue-fraction assumptions.

ICA and representative superior-M2 comparisons give 4.433152 and 0.097242
mL/h versus published aggregate medians 6.2 and 0.4. The published subtypes
are not the exact model occlusions, and their clocks are not independently
paired; these comparisons are not validation. No timing multiplier is applied
to the model. Tests reproduce both rejections and confirm unchanged ordinary
simulation results and regional parameters. Calibration stays unchecked until
anatomically and temporally paired data can support a defensible applied fit.

# Continuous model deficits and ordinal examination grades

The model preserves its compensated deficit magnitude as
`SymptomItem.continuousSeverity`, between 0 and 3. This is an internal
educational model value, not a measured clinical scale or a probability.
`deadContinuousSeverity` preserves the corresponding magnitude attributed to
permanent tissue injury for comparisons. Existing tissue, compensation,
noticeability and symptom thresholds remain unchanged. The legacy `sev` value
(1, 2 or 3 for a listed symptom) remains available for existing symptom rules.
There is no additional hysteresis or time-dependent grading state.

## NIHSS is an ordinal bedside examination

The [NINDS NIH Stroke Scale](https://www.ninds.nih.gov/sites/default/files/2025-03/KnowStroke_NIHStrokeScale_March2025_508c.pdf)
defines examination categories. The inspected
[American Stroke Association copy of the NIHSS instructions](https://www.stroke.org/-/media/Data-Import/downloadables/5/2/3/NIH-Stroke-Scale-UCM_490144.pdf?rev=c72312713d574cf494fc406be288c3f6)
requires scoring the patient's observed performance during examination.
Its motor items progress from holding the limb without drift (0), through
drift (1), limited antigravity effort (2), loss of antigravity effort (3), to
absence of movement (4). Its sensory item distinguishes normal sensation (0),
partial impairment (1) and severe or complete impairment (2).

The source's motor labels include “No drift”, “Some effort against gravity”,
“No effort against gravity”, and “No movement”. These describe the examination,
not an infarct-volume cutoff.

These ordered categories do not establish equal distances between grades:
a one-point difference is not a fixed amount of strength or sensation.
Arithmetic interpolation is therefore a model presentation choice, not a
clinical interpretation supplied by the NIHSS instructions. A patient's NIHSS
cannot be calculated from an infarct map, tissue volume or arterial occlusion
alone. Bedside findings and the prescribed examination determine the score.

## Motor presentation uses existing anchors

For arm and leg weakness, the presentation projects continuous model severity
through the existing `nihss.pts` anchors in `src/anatomy/symptoms.ts`:

| Model magnitude | Motor projection anchor |
| --- | --- |
| 0 | 0 |
| 1 | Existing mild item points, `pts[0]` |
| 2 | Existing moderate item points, `pts[1]` |
| 3 | Existing severe item points, `pts[2]` |

Between adjacent anchors, the projection is linear. The displayed motor grade
is rounded to the nearest integer. A positive, listed motor deficit retains at
least its existing mild anchor, `pts[0]`. For the existing common `[1, 3, 4]`
weakness anchors, the intermediate grade 2 is available between the mild and
moderate anchors. Symptoms with different existing motor anchors keep those
anchors; none are recalibrated. The maximum grade does not require model
magnitude to reach exactly 3 or imply that all relevant tract tissue is damaged.

This quantization preserves the existing lesion calibration and does not
reclassify established classical syndromes solely because some tissue remains.
It does not validate the category as a predicted bedside finding. In particular,
displaying the highest motor grade is an illustrative model estimate, not proof
that a particular patient has no voluntary movement. The continuous magnitude
can change while the estimated integer grade remains unchanged.

The anchors and projection are heuristic. No empirical lesion-to-strength
threshold, new lesion boundary, treatment effect size or patient calibration is
introduced. A small anatomical change can alter the continuous model value;
that alone does not establish categorical benefit for a patient.

## Other examination items and limits

The existing ordinal NIHSS rules remain in place for other items. The official
item ranges include sensory 0–2, facial movement 0–3, language 0–3,
articulation 0–2, visual fields 0–3, horizontal gaze 0–2, limb coordination
0–2 and extinction/inattention 0–2. The catalogue's existing `pts` arrays are
educational associations with these categories, not clinically calibrated
lesion thresholds. Examination dependencies, including consciousness and
inability to perform requested actions, remain part of the existing estimator.

The estimated NIHSS remains integer-valued, so category and total-score changes
can still occur in steps, including for adjacent model values on opposite sides
of a rounding boundary. Existing scoring guards against treating a tiny
bilateral change as a large aggregate motor-score benefit remain in place.
The uncollapsed continuous magnitude supports recovery comparisons and the
deficit display independently of ordinal quantization. It is kept separately rather
than reported as a fractional NIHSS. Neither value supplies a modified Rankin
Scale conversion, an individual prognosis or a measured treatment benefit.

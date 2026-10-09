# Intracerebral hemorrhage expansion risk

This separate educational calculator reproduces the four-predictor model in
Al-Shahi Salman et al., *Lancet Neurology* (2018),
[DOI 10.1016/S1474-4422(18)30253-9](https://doi.org/10.1016/S1474-4422(18)30253-9).
The [publisher PDF](https://www.pure.ed.ac.uk/ws/portalfiles/portal/74826881/PIIS1474442218302539.pdf)
provides eligibility on page 3 and the equation and validation on page 7.
It is independent of the arterial infarction simulation.

## Published equation

```text
PI = -4.426 - 0.230 * t - 0.0776 * V
     + 1.196 * sqrt(V) + 0.310 * A + 1.065 * C
p = 1 / (1 + exp(-PI))
```

`t` is time from symptom onset to baseline imaging, in hours. `V` is the
hematoma volume on that baseline scan, in mL. `A` and `C` independently record
antiplatelet and anticoagulant therapy at symptom onset: yes is 1 and no is 0.
They do not record medication subsequently given or withdrawn. Unknown inputs
do not stand for zero, and no clinical defaults or risk-category cutoffs are
added.

The source defines expansion as an increase of “more than 6 mL” between
baseline and repeat imaging. Repeat imaging occurred fewer than six days after
onset; more than 80% of patients had repeat imaging within 48 hours. The output
is therefore not a fixed 24-hour probability.

## Population and input domain

The source included adults aged 18 or older with spontaneous, nontraumatic
intracerebral hemorrhage probably due to cerebral small-vessel disease, without
an underlying structural cause identified on imaging. Baseline scans were
obtained from 0.5 through 24 hours after onset, and baseline hematoma volume was
less than 150 mL. The calculator requires a positive measured volume below
150 mL and a known imaging time within that inclusive time window.

Patients receiving acute treatment that might reduce hematoma volume were
excluded: surgical evacuation, hemostatic therapy or blood-pressure lowering.
The equation cannot estimate the effect of those treatments. It does not
apply to traumatic bleeding, a structural vascular lesion, hemorrhagic
transformation, venous hemorrhage or Duret hemorrhage by analogy.

The medication predictors are binary indicators as published. The model does
not provide a drug-specific coefficient or establish DOAC-specific calibration.

## Validation and interpretation

The four-predictor model was developed using 2,381 patients from ten cohorts,
with a C-index of 0.75 (95% CI 0.73–0.78), and validated using 895 patients from
five cohorts, with a C-index of 0.74 (0.71–0.78). The authors reported good
calibration. The full eligible meta-analysis contained 5,435 patients from
36 cohorts; that larger count is not the model's development sample.

This is an expansion-risk estimate in the source population. It does not
predict the amount of volume growth, the location or boundary of a lesion,
symptoms, mRS, or treatment benefit. It does not add blood or tissue damage to
the 3D or slice views. Reproducing its equation is distinct from validating the
application as a clinical decision tool.

## Remaining source checks for the roadmap

- **Venous pressure/outflow:** [Marcotti 2015](https://pmc.ncbi.nlm.nih.gov/articles/PMC4476203/)
  supplies a steady Poiseuille network and published geometry. The legacy
  geometry supplement has now been retrieved and transcribed for a reduced
  eight-edge calculator. Inlet flow, its deep-drainage fraction, and outlet
  pressure are entered by the user rather than assigned unverified defaults.
  See [venous and hemorrhage pressure models](venous-hemorrhage.md) for source
  provenance and the remaining limits. This does not generate venous lesions.
- **Spinal recovery:** [Robertson 2012](https://pmc.ncbi.nlm.nih.gov/articles/PMC3466672/)
  documents long-term functional recovery through cohort outcomes; it does
  not supply a continuous C1–C3 deficit-recovery curve. A quantitative mapping
  from those outcomes to this model remains unspecified.
- **Calibration:** [DEFUSE 3](https://pmc.ncbi.nlm.nih.gov/articles/PMC6628906/)
  provides collateral-group infarct distributions, while
  [Wilson 2023](https://pmc.ncbi.nlm.nih.gov/articles/PMC10169426/) describes
  lesion-group language trajectories. Mapping these selected cohorts and
  measured outcomes into model conductance or lesion-fraction parameters
  remains unverified; their summary statistics are not direct replacements
  for those parameters.
- **Central herniation:** [Ropper 1993](https://pmc.ncbi.nlm.nih.gov/articles/PMC1015157/)
  and [Wijdicks 1997](https://pubmed.ncbi.nlm.nih.gov/9153493/) describe
  secondary injury without a displacement-and-duration equation for its
  damaged tissue fraction. Automatically creating that fraction would add
  unsupported calibration.
- **MRA vessel replacement:** the license and alignment of a candidate
  replacement dataset have not been verified. Existing slice-atlas provenance
  does not establish permission or registration for a new vessel tree.

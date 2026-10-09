# Venous outflow and observed hematoma pressure

These independent research calculators appear in Details. They do not alter
the current arterial case, tissue damage, symptoms, 3D geometry or slice views.
All clinical inputs start empty. Radius ratios start at 1, a normalized open
reference configuration rather than a patient measurement.

## Reduced venous network

The source is Marcotti et al. (2015),
[DOI 10.1186/s12883-015-0352-y](https://doi.org/10.1186/s12883-015-0352-y).
Its steady network uses Poiseuille resistance and published vessel geometry.
The article is CC BY 4.0; the data are CC0 unless otherwise stated. The retrieved
legacy geometry DOCX has SHA-256
`d9254e9f2a4208fad9ab2261f537502d126607997f544c4d8bae0cdbfb172207`.
The [legacy supplement](https://static-content.springer.com/esm/art%3A10.1186%2Fs12883-015-0352-y/MediaObjects/12883_2015_352_MOESM1_ESM.docx) provides these lengths and diameters in cm:

| Vessel | Length | Diameter |
|---|---:|---:|
| Superior sagittal sinus | 19.22 | 0.45 |
| Straight sinus | 3.96 | 0.17 |
| Each transverse sinus | 5.25 | 0.88 |
| Each sigmoid sinus | 12.25 | 0.53 |
| Each internal jugular vein | 15 | 1.7 |

Source viscosity is 3 cP (0.003 Pa·s). Resistance is
`128 × viscosity × length / (π × diameter⁴)`, using SI dimensions internally.
Diameter is divided by two for radius. The published zero outlet is a gauge
reference, not patient central venous pressure.

This application reduces that network to eight edges: superior sagittal sinus
and straight sinus feeding a confluence, then bilateral transverse sinuses,
sigmoid sinuses and internal jugular veins feeding a common outlet. It omits
the source's additional spinal and collateral pathways. It is not a reproduction
of the full published network or its validation results.

The user supplies total cerebral venous flow, the fraction entering the straight
sinus, and common outlet pressure. The deep fraction lies in [0, 1]. Each
remaining lumen-radius ratio lies in [0, 1]. For fixed geometry and viscosity,
conductance scales as the fourth power of that ratio. Interpreting an entered
ratio as a thrombosis effect is an assumption; it is not a clot-burden scale.
No clinical inlet-flow or outlet-pressure default is inferred from the paper.

The calculation imposes steady inflow and solves pressures and bilateral
drainage. It assumes rigid vessels, laminar flow and fixed viscosity. It does
not couple venous pressure back into cerebral arterial perfusion or model
vascular collapse, compliance, recanalization, tissue injury or clinical outcome.
Omitted collateral routes can change the response to obstruction.

If imposed flow cannot leave a disconnected component, no finite steady pressure
solution exists. This reports a disconnected model, not infinite patient ICP.
A disconnected zero-flow component has undetermined pressure. Numerical overflow
is reported explicitly rather than replaced with a capped pressure.

## Observed hematoma pressure effect

The pressure–volume relationship follows Marmarou et al. (1978),
[DOI 10.3171/jns.1978.48.3.0332](https://doi.org/10.3171/jns.1978.48.3.0332):

```text
ICP = baselineICP × 10^(observedAddedHematomaVolume / enteredPVI)
CPP = enteredMAP − ICP
```

PVI is the volume required to increase pressure tenfold in this relationship.
Volume and PVI use mL; ICP and MAP use mmHg. Added volume must be nonnegative;
baseline ICP, PVI and MAP must be positive. The entered additional volume is
observed, not predicted by the separate ICH expansion-risk calculator.

The original model was validated experimentally in cats. A later adult study
reported PVI 25.9 ± 3.7 mL in seven adults without mass lesions
([Shapiro et al., 1980](https://doi.org/10.1002/ana.410070603)); that small,
different population supplies context, not a default or permissible range.

Applying the relationship immediately to hematoma volume in a fixed compartment
is **unvalidated for intracerebral hemorrhage**. The calculator does not model
CSF displacement or reserve, dynamic compensated flow, edema, lesion boundaries,
symptoms, treatment effects or clinical outcome. Negative CPP denotes a negative
pressure gradient in this scalar calculation; it does not predict negative blood
flow. Overflow is a numerical status rather than a clinical pressure estimate.

## Remaining work

Spatial venous infarction, hemorrhagic lesions, symptoms and dynamic coupling
remain outside these calculators. The roadmap completion scope is the reduced
outflow and observed-volume pressure calculation only.

## Spatial coupling source audit

Access and label meanings were checked against the official sources on
2026-10-09. An outflow-pressure solution alone cannot identify injured voxels:
it supplies neither patient venous drainage territories nor the history of
perfusion, oxygen delivery, thrombosis, collateral recruitment and tissue injury.
No pressure-to-injury threshold or lesion boundary is inferred from this network.
No paired CVST pressure/outflow measurements, lesion masks, timing and verified
template registration were identified for implementing that coupling.

- [PhysioNet CT-ICH v1.3.0](https://physionet.org/content/ct-ich/1.3.0/)
  retains CC BY 4.0 metadata but explicitly states that its files are no longer
  available. [v1.3.1](https://physionet.org/content/ct-ich/1.3.1/) requires
  registration and a restricted health-data agreement. No restricted files or
  unofficial mirrors are used. The cohort is traumatic brain injury with mixed
  hemorrhage subtypes, not a spontaneous ICH pressure-validation cohort.
- [PHE-SICH-CT-IDS v4](https://doi.org/10.6084/m9.figshare.23957937.v4)
  is available under CC BY 4.0 from the official Figshare record. Its
  [primary publication](https://doi.org/10.1016/j.compbiomed.2024.108342)
  specifies **perihematomal edema** labels, not hematoma segmentations. A
  range-based archive inspection verified the ZIP CRCs of case 0001's native CT
  and binary mask. Both have dimensions 512 × 512 × 32, matching affines and
  CT voxel spacing 0.5078125 × 0.5078125 × 5 mm. The mask contains 7,962 positive
  voxels, giving a geometric labeled-region volume of 10.265945434570312 mL.
  This is **edema-region volume, neither blood volume nor net added water**.
  It is not passed to the PVI calculator. No template registration or clinical
  injury labels are manufactured from it.
- [BHSD's official repository](https://github.com/White65534/BHSD)
  states noncommercial, no-derivatives restrictions and prohibits modifying it
  for another dataset. Those permissions do not support distributing transformed
  masks as this application's new assets.
- [INSTANCE's official participation rules](https://instance.grand-challenge.org/Participation/)
  require a signed data agreement and restrict use to the challenge, explicitly
  prohibiting redistribution and other uses. No annotations were obtained.

The inspected Figshare archive file is `63081925`,
`PHE-SICH-CT-IDS.zip`, 1,300,209,108 bytes. The publisher reports MD5
`a2c3f32f11478167b975d5036edbb510`; the complete archive was not downloaded,
so that whole-file digest was not independently verified. Extracted case hashes:

| Source entry | SHA-256 |
|---|---|
| `SubdatasetA_NIFIT/NIFIT/set/0001.nii.gz` | `152328fd8bcee0467544bc24630decdf0ea3955440e074f98e621aa382825f7d` |
| `SubdatasetA_NIFIT/NIFIT/label/0001.nii.gz` | `287e3622f24195c08baf7f296d0c679402f3e1a6e64912194ef5ec18bbd421c2` |

Observed-mask visualization would require explicit label semantics, physical
units and image/mask alignment. Coupling a mask to anatomical deficit rules also
requires a verified atlas transform and evidence that its label denotes the
relevant injury. These checks are not supplied by a pressure formula.

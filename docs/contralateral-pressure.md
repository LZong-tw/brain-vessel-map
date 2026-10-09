# Contralateral pressure safeguard

This is a scoped numerical safeguard for the educational flow model. It is not
a new physiological autoregulation model or a universal claim that an opposite
hemisphere occlusion cannot benefit another territory.

## Why use a numerical fallback?

Ursino and Lodi describe approximately stable flow in a “CPP range of
50–150 mmHg” in their
[1998 cerebral autoregulation model](https://journals.physiology.org/doi/abs/10.1152/ajpheart.1998.274.5.H1715).
That range concerns cerebral perfusion pressure, not a direct MAP cutoff for
every vessel in the graph. Their proximal pial regulation and distal flow
regulation act through vessel mechanics.

A [published implementation of this model family](https://pmc.ncbi.nlm.nih.gov/articles/PMC2673531/)
lists proximal gain “G₁ = 0.02 mmHg⁻¹” in Table 1. At steady state its regulator
uses deviation of arterial-minus-intracranial pressure from a reference value.
Activation changes smooth muscle tension; radius is then determined by wall
mechanics, and resistance depends on the fourth power of radius. These values
do not define a gain directly multiplying named ICA, ACA or MCA resistances.

The current network lacks that compartment-level wall-mechanics coupling.
Using the published gain as a direct resistance multiplier would invent the
missing calibration. Consequently, this change uses the authorized numerical
fallback and preserves existing tissue constants and lesion calibration.

## Scoped counterfactual comparison

The safeguard applies when hemisphere-specific occlusions are paired on
opposite sides. For each recipient hemisphere, a reference circuit retains
its own hemisphere's occlusions while removing the opposite hemisphere's
occlusions. Vertebral, basilar and other shared vascular occlusions remain in
the reference; they are not treated as removable opposite-side lesions.

References use the same MAP, anatomical variants and collateral grade as the
paired circuit. Positive forward collateral flow in each reference supplies a
reciprocal bound: each hemisphere can be both donor and recipient. Actual
collateral conductance is reduced when needed to exclude a pressure-derived
increase above that reference. A route with no positive forward reference flow,
including a newly reversed route, retains its original conductance.

The safeguard also applies numerical recipient-pressure ceilings through the
conductances of named arteries feeding each hemisphere. These ceilings use the
corresponding reference pressures; they are not physiological autoregulation
thresholds. Conductance can relax back toward its original value when a bound
no longer requires reduction, but cannot exceed that original value. No
physiological gain is inferred or added.

The entire circuit is solved again with the adjusted conductances. Pressure or
flow is not overwritten after the solve, and conservation remains an explicit
requirement. The conservation diagnostic's boundary inflow includes the
existing hidden arch-to-arm supply as well as the displayed vascular routes.

Only positive pressure-derived gain is limited. A loss of collateral support
is preserved. In particular, a combined occlusion can remove collateral donor
support and legitimately increase the new lesion's own infarct core compared
with that lesion in isolation. A real newly available collateral route is not
removed merely because another lesion exists. This comparison is a model-specific safeguard
against an unintended benefit from pressure redistribution; it does not model
the underlying autoregulatory mechanism or establish a clinical treatment rule.

## Verification boundary

Regression tests should demonstrate the targeted paired-hemisphere behavior,
retain effects of shared occlusions and genuine collateral pathways, and check
flow conservation with the adjusted conductances. Existing single-occlusion,
reperfusion and tissue-calibration regressions remain required. The roadmap
item is completed only after those tests pass.

# MRA-derived communicating vessel shapes

Three communicating vessel render curves derive from actual segmented MRA
centerlines, not a vessel probability atlas: TopCoW MRA case 008, published by
Musio et al., *Circle of Willis Centerline Graphs: A Dataset and Baseline
Algorithm* (2025 preprint, [arXiv:2510.13720](https://arxiv.org/abs/2510.13720)),
[dataset released 2025-10-15](https://zenodo.org/records/17358162).
The source and derivatives are **CC-BY-NC-4.0**, separately from software;
see `src/anatomy/generated/MRA_LICENSE.txt`.

## Scope and assumptions

Only the right PCom (label 8), left PCom (label 9), and ACom (label 10)
render shapes are prepared. Distal branches remain authored. This is not a
whole patient vascular tree or validated registration to MNI space.
Source physical units and absolute orientation have not been independently
established. No source lengths or radii are used as physiological parameters.

Each selected path is connected, acyclic and unique between named source
boundaries. PCom boundaries touch the correctly sided ICA and PCA labels.
ACom follows the right-to-left ACA path; the source third-A2 side branch,
including two label-10 stub edges, is excluded explicitly.

Placement applies one **proper similarity transform per curve**: rotation
(no reflection), translation and uniform scale. No individual points are warped.
An approximate global five-landmark rotation seeds axial orientation; source
MCA endpoints are only approximate correspondences to project M1 endpoints.
Each curve then aligns its endpoint direction and uniformly scales to the
existing model attachment separation. This is an unvalidated display assumption,
not a physical anatomical measurement or source-template registration.

Attachment anchors use the actual parent render paths when available, otherwise
parent physiological paths. Currently the ICA terminal, PCA P1 and ACA A1
anchors have no separate render overrides and match the existing communicating
path endpoints. The authored tuberothalamic child render connectors follow the new PCom
polyline half-arclength point. Only each connector first point changes; remaining
points are retained. These connectors are explicitly classified as authored,
not measured MRA geometry. Simulation paths, topology, lengths, radii and flow
parameters are untouched. Uniform scales differ between curves and must not be interpreted
as measured vessel dimensions.

## Reproduction and verification

From the repository root, with Python and NumPy installed:

```sh
python tools/build_mra_communicating.py
```

The generator fetches only pinned ZIP entries using HTTP ranges when absent
from the ignored cache. It checks each decoded entry's size, CRC32 and pinned
SHA256. **The whole archive MD5 has not been verified.** Original graph and node
descriptions, source hashes, source point IDs, transforms, attachment anchors,
variant and geometry checks are retained in `mraCommunicatingAudit.json`.
The generator verifies unique paths, proper orthogonal rotations, exact endpoint
placement and uniform segment scaling. Generated coordinate values are rounded
to ten decimal places; this does not change physiological model geometry.

Public-facing wording: **MRA-derived communicating vessel shapes; placement
unvalidated; distal branches authored.**

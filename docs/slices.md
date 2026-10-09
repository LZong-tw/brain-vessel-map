# MRI slices and territory references

The slice background is the real 1 mm ICBM 152 nonlinear asymmetric 2009c T1
template distributed by [TemplateFlow](https://github.com/templateflow/tpl-MNI152NLin2009cAsym).
Its [template metadata](https://github.com/templateflow/tpl-MNI152NLin2009cAsym/blob/master/template_description.json)
specifies a 193 × 229 × 193 grid, 1 mm spacing and origin (-96, -132, -78) mm.
The exporter checks the downloaded NIfTI affine against that RAS grid. Display
intensity is linearly quantized to eight bits using the source maximum.

Territory outlines come from [Liu et al.'s arterial atlas](https://github.com/Chin-Fu-Liu/Arterial_Atlas),
derived from lesion distributions in 1,298 patients; see the
[original Scientific Data paper](https://doi.org/10.1038/s41597-022-01923-0).
The publisher's repository identifies 30 arterial parcels and ventricular labels. Only the 30 arterial
labels are displayed; nonarterial labels are mapped to zero. The source revision
is pinned in the exporter, and every downloaded input's SHA-256 is recorded in
the generated manifest. Nearest-neighbour sampling preserves arterial label IDs.

## Alignment and interpretation

Liu's source describes its space as MNI, not specifically MNI2009c. This view
reuses the existing project's approximate atlas-to-template mapping:
`atlas voxel = (89 - RAS x, RAS y + 126, RAS z + 72)`.
It does not claim newly verified clinical registration. The exporter reports
left/right label centroids, atlas overlap with the template aseg segmentation,
and template coverage so reviewers can inspect this approximation.

These outlines are **population atlas reference territories**, not predicted
patient lesion boundaries. The separate heatmap repeats the model's current
bed-level infarct fraction across every voxel assigned to that bed. It neither
localizes the damaged fraction inside the bed nor applies a lesion threshold.
Voxel beds are reconstructed using the existing asset builder, checked against
all committed bed IDs and volumes, and reordered to the existing mesh bed list.
This is the project's functional bed assignment, including its anatomical
heuristics; it is not a newly measured voxel lesion mask. Existing meshes,
generated beds and medical parameters are not rewritten.

## Rebuilding and binary layout

Install `tools/requirements.txt`, then run `python tools/build_slices.py`.
Source NIfTI files are cached in `tools/.cache`; downloads are validated and
published atomically. A corrupt cache entry is downloaded again. Rebuilding
fails if the bed IDs, volumes or template affine differ from existing assets.

`public/data/slices.bin.gz` is a gzip stream containing three concatenated arrays
on the same full-resolution grid: T1 uint8, territory uint8, then little-endian
bed uint16. Arrays are x-fastest: `x + nx * (y + ny * z)`. Manifest offsets refer
to decompressed bytes. Bed zero is unassigned; bed n indexes `beds[n - 1]`.
The manifest records compressed SHA-256, lengths, provenance and validation.
Browser loading requires gzip decompression support and reports unsupported
browsers explicitly.

## Attribution and license

The derived `slices.json` and `slices.bin.gz` are distributed under
[CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/), including
Liu's atlas attribution: Digital 3D Brain MRI Arterial Territories Atlas,
© 2021 The Johns Hopkins University; Liu CF et al., Scientific Data 2023;10:74.
The bed mapping also derives from DKT31 (Klein & Tourville 2012, CC BY 4.0) and
MIAL67 (Najdenovska et al. 2018, CC BY 4.0). See `public/data/LICENSE.txt`.

The template's [MNI license](https://github.com/templateflow/tpl-MNI152NLin2009cAsym/blob/master/LICENSE)
requires the following notice:

Copyright (C) 1993–2004 Louis Collins, McConnell Brain Imaging Centre,
Montreal Neurological Institute, McGill University. Permission to use, copy,
modify, and distribute this software and its documentation for any purpose and
without fee is hereby granted, provided that the above copyright notice appear
in all copies. The authors and McGill University make no representations about
the suitability of this software for any purpose. It is provided “as is” without
express or implied warranty. The authors are not responsible for any data loss,
equipment damage, property loss, or injury to subjects or patients resulting
from the use or misuse of this software package.

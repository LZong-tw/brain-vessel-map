[繁體中文](mra-distal.zh-TW.md) · [简体中文](mra-distal.zh-CN.md) · [English](mra-distal.md) · [Deutsch](mra-distal.de.md) · [日本語](mra-distal.ja.md)

# Individual MRA distal vessel reference

This reference contains actual individual MRA-derived arterial geometry from
**Bravissima BG0001**, rather than a population probability atlas. The source
converts BraVa reconstructions into individual NIfTI volumes and uses SPM8
normalization to MNI152. [Project and Attribution license](https://www.nitrc.org/projects/bravissima/);
[source README](https://www.nitrc.org/docman/view.php/1266/78741/Readme43).

It includes the central pre-Willis/CoW group and all six left/right ACA, MCA and
PCA families. The source does not name individual distal branches such as the
angular or calcarine arteries. No such correspondence is invented, and these
reference points have no simulated branch perfusion or occlusion state.
Physiological paths, topology, radii and model parameters are unchanged.

In the optional 3D reference mode, source geometry replaces the authored vessel
display. Simulation vessel hit targets, clot markers and flow particles are
hidden because no named-branch correspondence exists. The embolus lifecycle
continues invisibly, so changing anatomy view does not pause an existing case.
Brain colors still describe the current arterial simulation, not a predicted
lesion in this reference subject. The mode starts off and loads on demand;
failed loading retains the simulation display and offers retry. It does not
change case parameters or variants to match the source subject.

Family selection and camera navigation have keyboard controls, visible focus
indicators and five-language labels. Hidden hemisphere families and families
fully outside the clipping plane are excluded from focus targets. The source
placement limitation remains visible even when the controls are folded.

## Geometry and limitations

All finite voxels with source family labels 1–7 are retained, including isolated
voxels and disconnected components. Zero, NaN and infinite values are excluded.
Coordinates are zero-based voxel centers transformed by the source NIfTI affine.
The 1 mm source volume uses LAS voxel axes; its affine converts indices to world
coordinates, with positive x on the right. No additional placement transform is
applied. Registration to this project's MNI152NLin2009cAsym brain is **unvalidated**.

The supplied line segments connect only existing labeled voxels in the immediate
26-neighborhood. This is an explicit **rendering adjacency assumption**, not the
original SWC parent graph. Adjacent vessels can generate extra edges or cycles.
No gaps are bridged and no points are smoothed, thinned, resampled or moved.
The asset therefore preserves measured source voxel geometry without claiming
an exact connected anatomical tree or validated small-branch identities.

`public/data/mra-distal.json` contains points, per-point family labels, adjacent
point-index pairs, family counts and component statistics. Isolated points remain
in the points array even though they occur in no segment. The accompanying
provenance JSON records the original affine, decoding rules, source README,
license, hashes and source-specific assumptions.

## Reproduction

With Python, NumPy and nibabel installed, run from the repository root:

```sh
python tools/build_bravissima.py
```

The generator checks the pinned SHA256 of the complete 12 MB source archive,
outer ZIP CRCs, the selected nested ZIP entry CRC, and its pinned SHA256. It uses
the individual `srcgBG0001.nii` group volume, not the averaged group atlases.
Output is deterministic and contains no non-finite JSON numbers. Cached source
files remain under the ignored `tools/.cache/bravissima/` directory.

## Attribution

Herron TJ, Dronkers N, Turken AU. *BraVa cerebral artery database converted to
NIFTI MRI format* (2017 poster; not peer reviewed).
[DOI10.7490/f1000research.1114378.1](https://doi.org/10.7490/f1000research.1114378.1).

Original BraVa: Wright et al. *Digital reconstruction and morphometric analysis
of human brain arterial vasculature from magnetic resonance angiography*.
NeuroImage82 (2013), 170–181.
[DOI10.1016/j.neuroimage.2013.05.089](https://doi.org/10.1016/j.neuroimage.2013.05.089);
[BraVa](http://cng.gmu.edu/brava).

The source specifies **Attribution**, without identifying a Creative Commons
version. Preserve the exact source terms in `public/data/MRA_DISTAL_LICENSE.txt`;
these data are separate from the application's software license and from the
TopCoW CC-BY-NC data. No endorsement by the source authors is implied.

#!/usr/bin/env python3
"""Export real template MRI and reference atlas volumes without rebuilding meshes."""
from __future__ import annotations

import gzip
import hashlib
import json
from pathlib import Path
import urllib.request

import nibabel as nib
import numpy as np

import build_assets as assets

LIU_REVISION = 'eb9839d16a060f287a7d8a1e7a481d049a3401a9'
LIU_SHA256 = '78ecdefd9e25e6831e24d2a0e703c984914308f5a9f1efb529bf3f7f5c4012de'


def fetch_checked(key: str) -> Path:
    """Validate cached NIfTI files and publish downloads only after validation."""
    url, name = assets.SOURCES[key]
    path = assets.CACHE / name
    if path.exists():
        try:
            np.asarray(nib.load(str(path)).dataobj)
            if key == 'liu' and hashlib.sha256(path.read_bytes()).hexdigest() != LIU_SHA256:
                raise ValueError('Cached atlas differs from pinned revision')
            return path
        except (ValueError, OSError, EOFError, nib.filebasedimages.ImageFileError):
            path.unlink()
    assets.CACHE.mkdir(parents=True, exist_ok=True)
    temporary = path.with_name('download-' + name)
    request = urllib.request.Request(url, headers={'User-Agent': 'brain-vessel-map-slice-builder'})
    try:
        with urllib.request.urlopen(request, timeout=600) as response, temporary.open('wb') as output:
            while block := response.read(1024 * 1024):
                output.write(block)
        np.asarray(nib.load(str(temporary)).dataobj)
        if key == 'liu' and hashlib.sha256(temporary.read_bytes()).hexdigest() != LIU_SHA256:
            raise ValueError('Downloaded atlas differs from pinned revision')
        temporary.replace(path)
    finally:
        if temporary.exists():
            temporary.unlink()
    return path


def main():
    assets.fetch = fetch_checked
    assets.SOURCES['liu'] = (
        f'https://raw.githubusercontent.com/Chin-Fu-Liu/Arterial_Atlas/{LIU_REVISION}/data/Atlas/ArterialAtlas.nii',
        assets.SOURCES['liu'][1],
    )
    volumes = assets.build_label_volumes()
    region, territory, border, cerebellum = assets.assign_beds(volumes)
    voxel_beds, rebuilt = assets.make_beds(region, territory, border, cerebellum)
    existing = json.loads((assets.GENERATED / 'beds.json').read_text())
    mesh_beds = json.loads((assets.PUBLIC / 'brain.json').read_text())['beds']
    expected = {bed['id']: bed for bed in existing}
    if set(expected) != {bed['id'] for bed in rebuilt}:
        raise RuntimeError('Voxel reconstruction differs from checked-in bed IDs')
    for bed in rebuilt:
        if bed['volume'] != expected[bed['id']]['volume']:
            raise RuntimeError(f"Voxel volume differs for {bed['id']}")
    if set(mesh_beds) != set(expected):
        raise RuntimeError('Mesh and model bed IDs differ')
    lookup = {bed: index + 1 for index, bed in enumerate(mesh_beds)}
    remap = np.array([0] + [lookup[bed['id']] for bed in rebuilt], dtype='<u2')
    voxel_beds = remap[voxel_beds]

    t1_image = nib.load(str(assets.fetch('t1')))
    shape = volumes['aseg'].shape
    target_affine = np.eye(4)
    target_affine[:3, 3] = assets.ORIGIN
    if t1_image.shape != shape or not np.allclose(t1_image.affine, target_affine):
        raise RuntimeError('T1 template does not match the project 1 mm RAS grid')
    t1 = np.asarray(t1_image.dataobj, dtype=np.float32)
    if not np.isfinite(t1).all() or t1.max() <= 0:
        raise RuntimeError('Invalid T1 intensities')
    # Display-only intensity quantization; no clinical or atlas threshold is used.
    intensity_max = float(t1.max())
    t1_u8 = np.round(np.clip(t1 / intensity_max, 0, 1) * 255).astype(np.uint8)
    labels = volumes['liu']
    if labels.min() < 0 or labels.max() > 255:
        raise RuntimeError('Atlas labels do not fit uint8')
    labels = labels.astype(np.uint8)
    # Ventricular/nonarterial parcels remain in the source but are not territory outlines.
    labels[~np.isin(labels, list(assets.LIU))] = 0
    brain = volumes['aseg'] > 0
    labelled = labels > 0
    left = labelled & (labels < 31) & (labels % 2 == 1)
    right = labelled & (labels < 31) & (labels % 2 == 0)
    metrics = {
        'leftLabelMeanXmm': float(volumes['X'][left].mean()),
        'rightLabelMeanXmm': float(volumes['X'][right].mean()),
        'atlasVoxelCount': int(labelled.sum()),
        'atlasWithinAsegFraction': float((labelled & brain).sum() / labelled.sum()),
        'asegCoveredByAtlasFraction': float((labelled & brain).sum() / brain.sum()),
        'bedVoxelCount': int((voxel_beds > 0).sum()),
        'verifiedBedCount': len(mesh_beds),
    }
    assert metrics['leftLabelMeanXmm'] < 0 < metrics['rightLabelMeanXmm']
    assert metrics['atlasVoxelCount'] > 0 and metrics['bedVoxelCount'] > 0
    assert (labelled & brain).any()

    raw = b''.join(array.tobytes(order='F') for array in (t1_u8, labels, voxel_beds))
    count = int(np.prod(shape))
    packed = gzip.compress(raw, compresslevel=9, mtime=0)
    names = {
        'ACA': 'Anterior cerebral artery', 'MLS': 'Medial lenticulostriate',
        'LLS': 'Lateral lenticulostriate', 'MCAF': 'MCA frontal',
        'MCAP': 'MCA parietal', 'MCAT': 'MCA temporal', 'MCAO': 'MCA occipital',
        'MCAI': 'MCA insular', 'PCAT': 'PCA temporal', 'PCAO': 'PCA occipital',
        'PCTP': 'Posterior choroidal and thalamoperforating',
        'ACTP': 'Anterior choroidal and thalamoperforating', 'BA': 'Basilar artery',
        'SC': 'Superior cerebellar', 'IC': 'Inferior cerebellar',
    }
    colors = [(230, 130, 75), (185, 115, 225), (225, 100, 155), (90, 160, 230),
              (80, 185, 160), (90, 175, 215), (105, 145, 225), (90, 205, 190),
              (205, 180, 75), (230, 200, 75), (200, 155, 90), (220, 145, 110),
              (160, 130, 210), (130, 190, 120), (100, 170, 125)]
    territories = [
        {'id': label, 'name': ('Left ' if label % 2 else 'Right ') + names[code],
         'code': code, 'side': 'l' if label % 2 else 'r', 'color': colors[(label - 1) // 2]}
        for label, code in assets.LIU.items()
    ]
    for label in sorted(set(np.unique(labels)) - {0} - set(assets.LIU)):
        territories.append({'id': int(label), 'name': 'Atlas nonarterial label',
                            'code': 'NONARTERIAL', 'color': [130, 130, 130]})
    manifest = {
        'version': 1, 'dimensions': list(shape), 'spacingMm': [1, 1, 1],
        'originMm': assets.ORIGIN.tolist(), 'ordering': 'x-fastest',
        'space': 'MNI152NLin2009cAsym RAS mm', 'compression': 'gzip',
        'uncompressedByteLength': len(raw), 'compressedByteLength': len(packed),
        'sha256': hashlib.sha256(packed).hexdigest(),
        't1': {'offset': 0, 'type': 'u8', 'sourceIntensityMax': intensity_max},
        'territory': {'offset': count, 'type': 'u8'},
        'bed': {'offset': count * 2, 'type': 'u16', 'byteOrder': 'little-endian'},
        'beds': mesh_beds, 'territories': territories,
        'bedMapping': 'existing-voxel-bed-assignment',
        'alignment': {
            'method': 'existing-project-transform', 'approximate': True,
            'worldToAtlasVoxel': [[-1, 0, 0, 89], [0, 1, 0, 126], [0, 0, 1, 72]],
            'note': 'Approximate Liu atlas-to-template alignment; reference territories are not patient lesion boundaries.',
            'sampling': 'nearest-neighbour; source label IDs preserved',
        },
        'validation': metrics,
        'sourceFiles': {
            key: {'url': assets.SOURCES[key][0],
                  'sha256': hashlib.sha256(assets.fetch(key).read_bytes()).hexdigest()}
            for key in ('aseg', 'gm', 'wm', 'dkt', 'liu', 'mial', 't1')
        },
        'sources': [
            {'title': 'ICBM 152 nonlinear asymmetric template 2009c (Fonov et al.)',
             'url': 'https://github.com/templateflow/tpl-MNI152NLin2009cAsym',
             'license': 'MNI copyright and permission notice; see docs/slices.md'},
            {'title': 'Arterial territory atlas (Liu et al., 2023)',
             'url': 'https://github.com/Chin-Fu-Liu/Arterial_Atlas',
             'revision': LIU_REVISION,
             'license': 'CC-BY-SA-4.0'},
        ],
    }
    assets.PUBLIC.mkdir(parents=True, exist_ok=True)
    (assets.PUBLIC / 'slices.bin.gz').write_bytes(packed)
    (assets.PUBLIC / 'slices.json').write_text(json.dumps(manifest, indent=2) + '\n')
    print(json.dumps(metrics, indent=2))
    print(f'Slice asset: {len(raw):,} bytes raw, {len(packed):,} bytes gzip')


if __name__ == '__main__':
    main()

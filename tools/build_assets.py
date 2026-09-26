#!/usr/bin/env python3
"""
Build the anatomical assets used by the web app.

Inputs (downloaded & cached in tools/.cache, see SOURCES for licences):
  * MNI ICBM152 2009c asymmetric template (TemplateFlow): tissue probability maps, aseg segmentation
  * DKT31 gyral labels in the same space (Mindboggle / TemplateFlow)
  * MIAL67 probabilistic thalamic nuclei atlas (Najdenovska et al. 2018)
  * Arterial territory atlas (Liu et al. 2023)
  * Statistical cerebral artery atlas (Mouches & Forkert 2019)
  * tools/.cache/anatomy-export.json produced by `npx vite-node tools/export-anatomy.ts`

Outputs:
  * public/data/brain.bin + public/data/brain.json   meshes (quantised) + per-vertex perfusion bed ids
  * src/anatomy/generated/beds.json                  perfusion beds with voxel-measured volumes
  * src/anatomy/generated/vesselPaths.json           refined vessel centrelines (MNI mm)
  * tools/.cache/report.txt                          validation report

Usage:  pip install -r tools/requirements.txt && python3 tools/build_assets.py
"""
from __future__ import annotations

import json
import sys
import time
import urllib.request
from pathlib import Path

import fast_simplification
import nibabel as nib
import numpy as np
import trimesh
from scipy import ndimage as ndi
from scipy.spatial import cKDTree
from skimage.measure import marching_cubes

ROOT = Path(__file__).resolve().parent.parent
CACHE = ROOT / 'tools' / '.cache'
PUBLIC = ROOT / 'public' / 'data'
GENERATED = ROOT / 'src' / 'anatomy' / 'generated'

TF = 'https://templateflow.s3.amazonaws.com/tpl-MNI152NLin2009cAsym/tpl-MNI152NLin2009cAsym'
SOURCES = {
    'aseg': (f'{TF}_res-01_seg-aseg_dseg.nii.gz', 'aseg.nii.gz'),
    'gm': (f'{TF}_res-01_label-GM_probseg.nii.gz', 'gm.nii.gz'),
    'wm': (f'{TF}_res-01_label-WM_probseg.nii.gz', 'wm.nii.gz'),
    't1': (f'{TF}_res-01_T1w.nii.gz', 't1_2009c.nii.gz'),
    'dkt': (f'{TF}_res-02_desc-DKT31_dseg.nii.gz', 'dkt31.nii.gz'),
    'mial': (f'{TF}_res-01_atlas-MIAL67ThalamicNuclei_dseg.nii.gz', 'mial67.nii.gz'),
    't1_nlin6': (
        'https://templateflow.s3.amazonaws.com/tpl-MNI152NLin6Asym/tpl-MNI152NLin6Asym_res-01_T1w.nii.gz',
        't1_nlin6.nii.gz',
    ),
    'liu': (
        'https://raw.githubusercontent.com/Chin-Fu-Liu/Arterial_Atlas/main/data/Atlas/ArterialAtlas.nii',
        'liu_ArterialAtlas.nii',
    ),
    'mouches_prob': ('https://ndownloader.figshare.com/files/14460467', 'mouches_vesselProbabilities.nii.gz'),
    'mouches_radius': ('https://ndownloader.figshare.com/files/14475920', 'mouches_vesselRadius.nii.gz'),
}

# 2009c res-01 grid
ORIGIN = np.array([-96.0, -132.0, -78.0])
REPORT: list[str] = []


def log(*a):
    msg = ' '.join(str(x) for x in a)
    print(msg, flush=True)
    REPORT.append(msg)


def fetch(key: str) -> Path:
    url, name = SOURCES[key]
    p = CACHE / name
    if not p.exists():
        log(f'downloading {key} …')
        CACHE.mkdir(parents=True, exist_ok=True)
        req = urllib.request.Request(url, headers={'User-Agent': 'brain-vessel-map-asset-builder'})
        with urllib.request.urlopen(req, timeout=600) as r, open(p, 'wb') as f:
            f.write(r.read())
    return p


def load(key: str, dtype=np.float32) -> np.ndarray:
    return np.asarray(nib.load(str(fetch(key))).dataobj).astype(dtype)


# ───────────────────────────── label definitions (FreeSurfer aseg) ─────────────────────────────
L_WM, R_WM = 2, 41
L_CTX, R_CTX = 3, 42
L_THAL, R_THAL = 10, 49
L_CAUD, R_CAUD = 11, 50
L_PUT, R_PUT = 12, 51
L_PAL, R_PAL = 13, 52
L_HIP, R_HIP = 17, 53
L_AMY, R_AMY = 18, 54
L_ACC, R_ACC = 26, 58
L_VDC, R_VDC = 28, 60
L_CBWM, R_CBWM = 7, 46
L_CBCTX, R_CBCTX = 8, 47
BRAINSTEM = 16
CC = [251, 252, 253, 254, 255]
CSF_LIKE = [4, 5, 14, 15, 24, 31, 43, 44, 63, 72]
LEFT_HEMI = [L_WM, L_CTX, L_THAL, L_CAUD, L_PUT, L_PAL, L_HIP, L_AMY, L_ACC, L_VDC, 30]
RIGHT_HEMI = [R_WM, R_CTX, R_THAL, R_CAUD, R_PUT, R_PAL, R_HIP, R_AMY, R_ACC, R_VDC, 62]

# DKT31 (FreeSurfer numbering, +1000 left / +2000 right)
DKT = {
    2: 'caudalanteriorcingulate', 3: 'caudalmiddlefrontal', 5: 'cuneus', 6: 'entorhinal', 7: 'fusiform',
    8: 'inferiorparietal', 9: 'inferiortemporal', 10: 'isthmuscingulate', 11: 'lateraloccipital',
    12: 'lateralorbitofrontal', 13: 'lingual', 14: 'medialorbitofrontal', 15: 'middletemporal',
    16: 'parahippocampal', 17: 'paracentral', 18: 'parsopercularis', 19: 'parsorbitalis',
    20: 'parstriangularis', 21: 'pericalcarine', 22: 'postcentral', 23: 'posteriorcingulate',
    24: 'precentral', 25: 'precuneus', 26: 'rostralanteriorcingulate', 27: 'rostralmiddlefrontal',
    28: 'superiorfrontal', 29: 'superiorparietal', 30: 'superiortemporal', 31: 'supramarginal',
    34: 'transversetemporal', 35: 'insula',
}

# Liu et al. level-1 labels → territory code (odd = left, even = right)
LIU = {1: 'ACA', 2: 'ACA', 3: 'MLS', 4: 'MLS', 5: 'LLS', 6: 'LLS', 7: 'MCAF', 8: 'MCAF', 9: 'MCAP', 10: 'MCAP',
       11: 'MCAT', 12: 'MCAT', 13: 'MCAO', 14: 'MCAO', 15: 'MCAI', 16: 'MCAI', 17: 'PCAT', 18: 'PCAT',
       19: 'PCAO', 20: 'PCAO', 21: 'PCTP', 22: 'PCTP', 23: 'ACTP', 24: 'ACTP', 25: 'BA', 26: 'BA',
       27: 'SC', 28: 'SC', 29: 'IC', 30: 'IC'}
TERR_CODES = ['NONE', 'ACA', 'MLS', 'LLS', 'MCAF', 'MCAP', 'MCAT', 'MCAO', 'MCAI', 'PCAT', 'PCAO', 'PCTP', 'ACTP',
              'BA', 'SC', 'IC']
TERR_IDX = {c: i for i, c in enumerate(TERR_CODES)}
FAMILY = {'ACA': 'ACA', 'MLS': 'MLS', 'LLS': 'LLS', 'MCAF': 'MCA', 'MCAP': 'MCA', 'MCAT': 'MCA', 'MCAO': 'MCA',
          'MCAI': 'MCA', 'PCAT': 'PCA', 'PCAO': 'PCA', 'PCTP': 'PCTP', 'ACTP': 'ACTP'}
BORDER_PAIRS = [('ACA', 'MCA'), ('MCA', 'PCA'), ('ACA', 'PCA'), ('LLS', 'MCA')]
BORDER_MM = 4.0

# ───────────────────────────── geometry helpers ─────────────────────────────
GRID = None  # world coordinates of every voxel, filled lazily


def world_grid(shape):
    i, j, k = np.meshgrid(np.arange(shape[0]), np.arange(shape[1]), np.arange(shape[2]), indexing='ij')
    return i + ORIGIN[0], j + ORIGIN[1], k + ORIGIN[2]


def w2i(p):
    return np.asarray(p) - ORIGIN


def resample_to_grid(vol, vol_to_world_inv, shape, order=0):
    """Sample `vol` on the 2009c 1 mm grid. vol_to_world_inv maps world (N,3) -> voxel (N,3)."""
    X, Y, Z = world_grid(shape)
    pts = np.stack([X.ravel(), Y.ravel(), Z.ravel()], 1)
    vox = vol_to_world_inv(pts)
    out = ndi.map_coordinates(vol, vox.T, order=order, mode='constant', cval=0)
    return out.reshape(shape)


def nearest_fill(labels, mask, restrict=None):
    """Give every voxel in `mask` the label of the nearest voxel with labels>0 (optionally within `restrict`)."""
    src = labels > 0
    if restrict is not None:
        src &= restrict
    idx = ndi.distance_transform_edt(~src, return_distances=False, return_indices=True)
    filled = labels[idx[0], idx[1], idx[2]]
    out = labels.copy()
    out[mask & ~src] = filled[mask & ~src]
    return out


def taubin(mesh, iters=8):
    trimesh.smoothing.filter_taubin(mesh, lamb=0.5, nu=-0.53, iterations=iters)
    return mesh


def mesh_from_field(field, level, target_faces, sigma=0.0, keep_largest=True, smooth_iters=6, name=''):
    t = time.time()
    f = ndi.gaussian_filter(field.astype(np.float32), sigma) if sigma > 0 else field.astype(np.float32)
    nz = np.argwhere(f > level * 0.5)
    if len(nz) == 0:
        raise RuntimeError(f'empty field for {name}')
    lo = np.maximum(nz.min(0) - 2, 0)
    hi = np.minimum(nz.max(0) + 3, np.array(f.shape))
    sub = f[lo[0]:hi[0], lo[1]:hi[1], lo[2]:hi[2]]
    v, faces, _, _ = marching_cubes(sub, level)
    v = v + lo + ORIGIN
    m = trimesh.Trimesh(v, faces, process=True)
    if keep_largest:
        parts = m.split(only_watertight=False)
        m = max(parts, key=lambda p: len(p.faces))
    if len(m.faces) > target_faces:
        v2, f2 = fast_simplification.simplify(m.vertices.astype(np.float32), m.faces.astype(np.int64),
                                              target_count=target_faces)
        m = trimesh.Trimesh(v2, f2, process=True)
    if smooth_iters:
        taubin(m, smooth_iters)
    m.fix_normals()
    log(f'  mesh {name}: {len(m.vertices)} v / {len(m.faces)} f  ({time.time() - t:.1f}s)')
    return m


# ───────────────────────────── functional region rules ─────────────────────────────
def cortical_region(dkt_name, x, y, z):
    ax = abs(x)
    occipital = dkt_name in ('cuneus', 'pericalcarine', 'lingual', 'lateraloccipital')
    if occipital and y < -93:
        return 'occipital_pole'
    if dkt_name in ('superiorfrontal', 'rostralmiddlefrontal') and y > 58:
        return 'frontopolar_orbital_medial'
    table = {
        'medialorbitofrontal': 'frontopolar_orbital_medial',
        'lateralorbitofrontal': 'orbitofrontal_lateral',
        'parsorbitalis': 'orbitofrontal_lateral',
        'rostralmiddlefrontal': 'prefrontal_dorsolateral',
        'caudalmiddlefrontal': 'prefrontal_dorsolateral',
        'parsopercularis': 'broca',
        'parstriangularis': 'broca',
        'superiorfrontal': 'medial_frontal',
        'caudalanteriorcingulate': 'cingulate',
        'rostralanteriorcingulate': 'cingulate',
        'posteriorcingulate': 'cingulate',
        'isthmuscingulate': 'cingulate',
        'paracentral': 'paracentral',
        'superiorparietal': 'superior_parietal',
        'supramarginal': 'supramarginal',
        'inferiorparietal': 'angular',
        'precuneus': 'precuneus',
        'transversetemporal': 'superior_temporal_posterior',
        'fusiform': 'inferior_temporal_fusiform',
        'parahippocampal': 'parahippocampal',
        'entorhinal': 'parahippocampal',
        'insula': 'insula',
        'cuneus': 'cuneus',
        'lingual': 'lingual',
        'lateraloccipital': 'lateral_occipital',
    }
    if dkt_name in ('precentral', 'postcentral'):
        if ax < 18 and z > 45:
            return 'paracentral'
        return 'precentral_face_arm' if dkt_name == 'precentral' else 'postcentral_face_arm'
    if dkt_name == 'superiortemporal':
        if y > 5:
            return 'temporal_pole'
        return 'superior_temporal_posterior' if y < -18 else 'temporal_lateral'
    if dkt_name == 'middletemporal':
        return 'temporal_pole' if y > 5 else 'temporal_lateral'
    if dkt_name == 'inferiortemporal':
        if y > 5:
            return 'temporal_pole'
        return 'temporal_lateral' if ax > 50 else 'inferior_temporal_fusiform'
    return table.get(dkt_name)


# ───────────────────────────── main steps ─────────────────────────────
def build_label_volumes():
    log('loading volumes …')
    aseg = load('aseg', np.int32)
    shape = aseg.shape
    X, Y, Z = world_grid(shape)
    gm, wm = load('gm'), load('wm')

    # --- DKT at 1 mm (nearest), then nearest-cortex fill per hemisphere
    dkt_img = nib.load(str(fetch('dkt')))
    dkt2 = np.asarray(dkt_img.dataobj).astype(np.int32)
    dinv = np.linalg.inv(dkt_img.affine)
    dkt = resample_to_grid(dkt2, lambda p: (p @ dinv[:3, :3].T + dinv[:3, 3]), shape, order=0).astype(np.int32)
    dkt[(dkt < 1000) | (dkt > 2999)] = 0

    # --- Liu territories (181x217x181, x flipped; origin fitted against the 2009c brain mask)
    liu = np.asarray(nib.load(str(fetch('liu'))).dataobj)[..., 0].astype(np.int32)
    liu1 = resample_to_grid(liu, lambda p: np.stack([89 - p[:, 0], p[:, 1] + 126, p[:, 2] + 72], 1), shape, order=0)
    liu1 = liu1.astype(np.int32)
    # sanity: odd (left) labels must sit at x<0
    lx = X[(liu1 % 2 == 1) & (liu1 > 0) & (liu1 < 31)].mean()
    rx = X[(liu1 % 2 == 0) & (liu1 > 0) & (liu1 < 31)].mean()
    log(f'Liu left-label mean x = {lx:.1f}, right-label mean x = {rx:.1f}')
    assert lx < 0 < rx

    mial = load('mial', np.int32)
    return dict(aseg=aseg, gm=gm, wm=wm, dkt=dkt, liu=liu1, mial=mial, X=X, Y=Y, Z=Z)


def assign_beds(V):
    """Voxel-wise functional region + territory → perfusion beds."""
    aseg, dkt, liu, mial = V['aseg'], V['dkt'], V['liu'], V['mial']
    X, Y, Z = V['X'], V['Y'], V['Z']
    shape = aseg.shape
    region = np.full(shape, '', dtype=object)

    right = np.isin(aseg, RIGHT_HEMI) | (np.isin(aseg, CC + [77, 85]) & (X > 0))
    left = np.isin(aseg, LEFT_HEMI) | (np.isin(aseg, CC + [77, 85]) & (X <= 0))

    # ---- corpus callosum: extrude the midline profile laterally within white matter
    cc_mid = np.isin(aseg, CC)
    prof = cc_mid.any(axis=0)  # (y,z)
    prof = ndi.binary_dilation(prof, iterations=1)
    wm_any = np.isin(aseg, [L_WM, R_WM] + CC)
    cc = wm_any & (np.abs(X) <= 8) & prof[None, :, :]
    # ---- internal capsule: white matter between caudate/thalamus and lentiform nucleus
    medial = np.isin(aseg, [L_CAUD, R_CAUD, L_THAL, R_THAL])
    lateral = np.isin(aseg, [L_PUT, R_PUT, L_PAL, R_PAL])
    d_med = ndi.distance_transform_edt(~medial)
    d_lat = ndi.distance_transform_edt(~lateral)
    ic = np.isin(aseg, [L_WM, R_WM]) & (d_med <= 7) & (d_lat <= 5) & (Z >= -8) & (Z <= 22) & (np.abs(X) >= 8) & \
        (np.abs(X) <= 32) & (Y <= 22) & (Y >= -32)
    # ---- dentate nucleus: ellipsoid in cerebellar white matter
    dent = np.isin(aseg, [L_CBWM, R_CBWM, L_CBCTX, R_CBCTX]) & \
        ((((np.abs(X) - 14.5) / 6.5) ** 2 + ((Y + 57) / 9.5) ** 2 + ((Z + 34) / 6.5) ** 2) <= 1)

    def side_of(x):
        return np.where(x > 0, 'r', 'l')

    # ---- deep grey
    deep_map = {
        L_PUT: 'putamen', R_PUT: 'putamen', L_PAL: 'globus_pallidus', R_PAL: 'globus_pallidus',
        L_HIP: 'hippocampus', R_HIP: 'hippocampus', L_AMY: 'amygdala', R_AMY: 'amygdala',
        L_ACC: 'caudate_head', R_ACC: 'caudate_head',
    }
    for lab, name in deep_map.items():
        m = aseg == lab
        region[m] = [f'{name}_{s}' for s in side_of(X[m])]
    for lab in (L_CAUD, R_CAUD):
        m = aseg == lab
        region[m] = [f"{'caudate_head' if y > 0 else 'caudate_body'}_{s}" for y, s in zip(Y[m], side_of(X[m]))]
    # thalamus via MIAL nuclei (nearest-filled)
    thal = np.isin(aseg, [L_THAL, R_THAL])
    mial_f = nearest_fill(mial, thal)
    nuc = {1: 'posterior', 2: 'anterior', 3: 'paramedian', 4: 'ventrolateral', 5: 'posterior', 6: 'ventrolateral',
           7: 'ventrolateral'}
    mx_left = X[(mial > 0) & (mial <= 7)].mean()
    log(f'MIAL left-nuclei mean x = {mx_left:.1f}')
    assert mx_left < 0
    m = thal
    region[m] = [f"thalamus_{nuc[((v - 1) % 7) + 1]}_{s}" for v, s in zip(mial_f[m], side_of(X[m]))]
    # IC
    m = ic & (region == '')
    part = np.where(Y > 2, 'ic_anterior_limb', np.where(Y > -3, 'ic_genu', 'ic_posterior_limb'))
    region[m] = [f'{p}_{s}' for p, s in zip(part[m], side_of(X[m]))]
    # CC
    m = cc & (region == '')
    part = np.where(Y < -28, 'splenium', 'corpus_callosum')
    region[m] = [f'{p}_{s}' for p, s in zip(part[m], side_of(X[m]))]

    # ---- territories for cerebral voxels (needed for the deep white matter split)
    cereb = (right | left)
    terr_liu = np.where((liu > 0) & (liu < 25), liu, 0)
    terr_f = nearest_fill(terr_liu, cereb)
    # ---- deep white matter in perforator territories → corona radiata
    deep_terr = np.isin(terr_f, [3, 4, 5, 6, 21, 22, 23, 24])
    m = np.isin(aseg, [L_WM, R_WM, 77]) & deep_terr & (region == '')
    region[m] = [f"corona_radiata_{'r' if x > 0 else 'l'}" for x in X[m]]
    # ---- cortex + white matter via nearest DKT label (per hemisphere)
    ctx_tissue = (right | left) & np.isin(aseg, [L_WM, R_WM, L_CTX, R_CTX, 77] + CC) & (region == '')
    # pericalcarine → cuneus (upper bank) / lingual (lower bank) by proximity
    d = dkt.copy()
    for base in (1000, 2000):
        peri = d == base + 21
        cl = np.where((d == base + 5) | (d == base + 13), d, 0)
        near = nearest_fill(cl, peri)
        d[peri] = near[peri]
    fill = np.zeros_like(d)
    for base, hemi in ((2000, right), (1000, left)):
        src = np.where((d >= base) & (d < base + 1000), d, 0)
        f = nearest_fill(src, hemi, restrict=hemi)
        fill[hemi] = f[hemi]
    m = ctx_tissue & (fill > 0)
    names = [DKT.get(int(v) % 1000) for v in fill[m]]
    xs, ys, zs = X[m], Y[m], Z[m]
    out = []
    for nm, x, y, z in zip(names, xs, ys, zs):
        r = cortical_region(nm, x, y, z) if nm else None
        out.append(f"{r}_{'r' if x > 0 else 'l'}" if r else '')
    region[m] = out

    # ---- brainstem sectors
    bs = aseg == BRAINSTEM
    zs_all = np.arange(shape[2]) + ORIGIN[2]
    yc = np.full(shape[2], np.nan)
    for k in range(shape[2]):
        sl = bs[:, :, k]
        if sl.any():
            yc[k] = (np.nonzero(sl)[1] + ORIGIN[1]).mean()
    valid = ~np.isnan(yc)
    yc = np.interp(np.arange(shape[2]), np.nonzero(valid)[0], yc[valid])
    yc = ndi.uniform_filter1d(yc, 5)
    m = bs
    x, y, z = X[m], Y[m], Z[m]
    v = y - yc[(z - ORIGIN[2]).astype(int)]
    ax = np.abs(x)
    s = np.where(x > 0.5, 'r', np.where(x < -0.5, 'l', np.where((y.astype(int) % 2) == 0, 'r', 'l')))
    lvl = np.where(z >= -20, 'mid', np.where(z >= -34, 'ponsR', np.where(z >= -48, 'ponsC', 'med')))
    names = np.empty(len(x), dtype=object)
    mid_ = lvl == 'mid'
    names[mid_] = np.where(v[mid_] < -4, 'midbrain_tectum',
                           np.where((v[mid_] > 1) & (ax[mid_] > 3), 'midbrain_peduncle',
                                    np.where(ax[mid_] <= 4, 'midbrain_paramedian', 'midbrain_lateral')))
    for tag, pre in (('ponsR', 'pons_rostral'), ('ponsC', 'pons_caudal')):
        q = lvl == tag
        names[q] = np.where((v[q] > -3) & (ax[q] <= 14), f'{pre}_basis',
                            np.where(ax[q] <= 6, f'{pre}_tegmentum', f'{pre}_lateral'))
    q = lvl == 'med'
    names[q] = np.where(ax[q] <= 3.5, 'medulla_medial', 'medulla_lateral')
    region[m] = [f'{n}_{sd}' for n, sd in zip(names, s)]

    # ---- cerebellum
    cb = np.isin(aseg, [L_CBWM, R_CBWM, L_CBCTX, R_CBCTX])
    liu_cb = np.where(np.isin(liu, [25, 26, 27, 28, 29, 30]), liu, 0)
    liu_cb = nearest_fill(liu_cb, cb)
    m = cb
    x, y, z, t = X[m], Y[m], Z[m], liu_cb[m]
    ax = np.abs(x)
    sc = np.isin(t, [27, 28])
    names = np.where(ax <= 6, np.where(sc, 'vermis_superior', 'vermis_inferior'),
                     np.where(sc, 'cerebellum_superior',
                              np.where((y > -55) & (ax > 14), 'cerebellum_anterior_inferior',
                                       'cerebellum_posterior_inferior')))
    names = np.where(np.isin(t, [25, 26]) & (ax > 6), 'cerebellum_anterior_inferior', names)
    region[m] = [f"{n}_{'r' if xx > 0 else 'l'}" for n, xx in zip(names, x)]
    m = dent
    region[m] = [f"dentate_{'r' if xx > 0 else 'l'}" for xx in X[m]]

    # ---- territory codes for cerebral voxels
    terr = np.zeros(shape, dtype=np.int16)
    for lab, code in LIU.items():
        terr[terr_f == lab] = TERR_IDX[code]

    # border zones
    border = np.zeros(shape, dtype=np.int16)  # territory idx of the other side of a watershed
    fam_masks = {f: np.zeros(shape, bool) for f in set(FAMILY.values())}
    for code, fam in FAMILY.items():
        fam_masks[fam] |= (terr == TERR_IDX[code]) & cereb
    for a, b in BORDER_PAIRS:
        for f1, f2 in ((a, b), (b, a)):
            dist, idx = ndi.distance_transform_edt(~fam_masks[f2], return_indices=True)
            near = (dist <= BORDER_MM) & fam_masks[f1] & (border == 0)
            other = terr[idx[0], idx[1], idx[2]]
            border[near] = other[near]
    return region, terr, border, cereb


def make_beds(region, terr, border, cereb):
    log('grouping voxels into perfusion beds …')
    ids = np.zeros(region.shape, dtype=np.int32)
    has = region != ''
    keys = {}
    bed_list = []
    reg_flat = region[has]
    ter_flat = terr[has]
    bor_flat = border[has]
    cer_flat = cereb[has]
    cortical_regions = {
        'frontopolar_orbital_medial', 'orbitofrontal_lateral', 'prefrontal_dorsolateral', 'broca', 'medial_frontal',
        'cingulate', 'precentral_face_arm', 'postcentral_face_arm', 'paracentral', 'superior_parietal',
        'supramarginal', 'angular', 'precuneus', 'superior_temporal_posterior', 'temporal_lateral', 'temporal_pole',
        'insula', 'inferior_temporal_fusiform', 'parahippocampal', 'cuneus', 'lingual', 'occipital_pole',
        'lateral_occipital', 'corona_radiata'}
    out = np.zeros(len(reg_flat), dtype=np.int32)
    for i, (r, t, b, c) in enumerate(zip(reg_flat, ter_flat, bor_flat, cer_flat)):
        base = r[:-2]
        if base in cortical_regions and c:
            t1 = TERR_CODES[int(t)]
            if b > 0:
                t2 = TERR_CODES[int(b)]
                terrs = tuple(sorted({t1, t2}))
            else:
                terrs = (t1,)
            key = (r, terrs)
        else:
            key = (r, ())
        j = keys.get(key)
        if j is None:
            j = len(bed_list)
            keys[key] = j
            bed_list.append({'region': r, 'terr': list(key[1]), 'n': 0})
        bed_list[j]['n'] += 1
        out[i] = j + 1
    ids[has] = out

    # merge tiny beds (<0.4 mL) into the largest bed of the same region
    by_region = {}
    for j, b in enumerate(bed_list):
        by_region.setdefault(b['region'], []).append(j)
    remap = np.arange(len(bed_list) + 1)
    for r, js in by_region.items():
        big = max(js, key=lambda j: bed_list[j]['n'])
        for j in js:
            if j != big and bed_list[j]['n'] < 400:
                remap[j + 1] = big + 1
                bed_list[big]['n'] += bed_list[j]['n']
                bed_list[j]['n'] = 0
    ids = remap[ids]
    # compact
    keep = [j for j, b in enumerate(bed_list) if b['n'] > 0]
    newidx = np.zeros(len(bed_list) + 1, dtype=np.int32)
    beds = []
    for n, j in enumerate(keep):
        newidx[j + 1] = n + 1
        b = bed_list[j]
        suffix = ('__' + '-'.join(b['terr'])) if b['terr'] else ''
        beds.append({'id': b['region'] + suffix, 'region': b['region'], 'terr': b['terr'],
                     'volume': round(b['n'] / 1000.0, 3)})
    ids = newidx[ids]
    log(f'  {len(beds)} beds')
    return ids, beds


# ───────────────────────────── meshes ─────────────────────────────
def build_meshes(V, bed_ids):
    aseg, gm, wm, X = V['aseg'], V['gm'], V['wm'], V['X']
    tissue = gm + wm
    meshes = {}
    log('building meshes …')
    for side, labels, sign in (('r', RIGHT_HEMI, 1), ('l', LEFT_HEMI, -1)):
        hemi = np.isin(aseg, labels) | (np.isin(aseg, CC + [77, 85]) & (sign * X > 0))
        hemi = ndi.binary_dilation(hemi, iterations=2)
        w = ndi.gaussian_filter(hemi.astype(np.float32), 0.8)
        ramp = np.clip((sign * X - 0.2) / 1.6, 0, 1)
        deep = ndi.gaussian_filter(np.isin(aseg, labels).astype(np.float32), 1.0)
        field = np.maximum(tissue, deep) * w * ramp
        meshes[f'hemi_{side}'] = ('cortex', mesh_from_field(field, 0.5, 90000, sigma=0.5, name=f'hemi_{side}'))
    cb = np.isin(aseg, [L_CBWM, R_CBWM, L_CBCTX, R_CBCTX])
    field = tissue * ndi.gaussian_filter(ndi.binary_dilation(cb, iterations=1).astype(np.float32), 0.8)
    meshes['cerebellum'] = ('cerebellum', mesh_from_field(field, 0.5, 60000, sigma=0.5, name='cerebellum'))
    bs = aseg == BRAINSTEM
    meshes['brainstem'] = ('brainstem', mesh_from_field(bs, 0.5, 16000, sigma=1.0, name='brainstem'))
    deep = [('thalamus', (L_THAL, R_THAL), 4000), ('caudate', (L_CAUD, R_CAUD), 2500),
            ('putamen', (L_PUT, R_PUT), 2500), ('pallidum', (L_PAL, R_PAL), 1500),
            ('hippocampus', (L_HIP, R_HIP), 2500), ('amygdala', (L_AMY, R_AMY), 1200),
            ('accumbens', (L_ACC, R_ACC), 800)]
    for name, (ll, rl), tgt in deep:
        for side, lab in (('l', ll), ('r', rl)):
            meshes[f'{name}_{side}'] = ('deep', mesh_from_field(aseg == lab, 0.5, tgt, sigma=0.9, name=f'{name}_{side}'))
    # derived structures from the bed volume
    for base, tgt in (('ic', 3000), ('corpus_callosum', 3000), ('dentate', 1500)):
        for side in ('l', 'r'):
            m = region_mask(bed_ids, base, side)
            if m.sum() < 50:
                continue
            meshes[f'{base}_{side}'] = ('deep', mesh_from_field(m, 0.5, tgt, sigma=1.0, name=f'{base}_{side}'))
    vent = np.isin(aseg, [4, 43, 14, 15, 5, 44])
    meshes['ventricles'] = ('ventricle', mesh_from_field(vent, 0.5, 10000, sigma=0.9, keep_largest=False, name='ventricles'))
    return meshes


BEDS_GLOBAL: list[dict] = []


def region_mask(bed_ids, base, side):
    prefix = {'ic': ('ic_anterior_limb', 'ic_genu', 'ic_posterior_limb'),
              'corpus_callosum': ('corpus_callosum', 'splenium')}.get(base, (base,))
    wanted = [i + 1 for i, b in enumerate(BEDS_GLOBAL) if b['region'] in {f'{p}_{side}' for p in prefix}]
    return np.isin(bed_ids, wanted)


def label_vertices(mesh, bed_ids, allowed_regions=None, inward=1.2):
    """Nearest bed id for each vertex, sampled slightly inside the surface."""
    src = bed_ids > 0
    if allowed_regions is not None:
        allow_ids = [i + 1 for i, b in enumerate(BEDS_GLOBAL) if allowed_regions(b['region'])]
        src &= np.isin(bed_ids, allow_ids)
    coords = np.argwhere(src)
    tree = cKDTree(coords + ORIGIN)
    p = mesh.vertices - mesh.vertex_normals * inward
    _, j = tree.query(p)
    c = coords[j]
    return bed_ids[c[:, 0], c[:, 1], c[:, 2]].astype(np.int32) - 1


# ───────────────────────────── vessel centrelines ─────────────────────────────
def registration_nlin6_to_2009c():
    """Affine mapping 2009c RAS → NLin6 RAS (Mouches atlas space)."""
    cache = CACHE / 'nlin6_affine.npy'
    if cache.exists():
        return np.load(cache)
    import SimpleITK as sitk
    fixed = sitk.Shrink(sitk.ReadImage(str(fetch('t1')), sitk.sitkFloat32), [2, 2, 2])
    moving = sitk.Shrink(sitk.ReadImage(str(fetch('t1_nlin6')), sitk.sitkFloat32), [2, 2, 2])
    init = sitk.CenteredTransformInitializer(fixed, moving, sitk.AffineTransform(3),
                                             sitk.CenteredTransformInitializerFilter.GEOMETRY)
    R = sitk.ImageRegistrationMethod()
    R.SetMetricAsMattesMutualInformation(50)
    R.SetMetricSamplingStrategy(R.RANDOM)
    R.SetMetricSamplingPercentage(0.2, seed=1)
    R.SetInterpolator(sitk.sitkLinear)
    R.SetOptimizerAsRegularStepGradientDescent(1.0, 1e-4, 300, relaxationFactor=0.6)
    R.SetOptimizerScalesFromPhysicalShift()
    R.SetShrinkFactorsPerLevel([2, 1])
    R.SetSmoothingSigmasPerLevel([1, 0])
    R.SetInitialTransform(init, inPlace=False)
    tx = R.Execute(fixed, moving)
    if tx.GetName() == 'CompositeTransform':
        tx = tx.GetNthTransform(0)
    A = sitk.AffineTransform(tx)
    Mx = np.array(A.GetMatrix()).reshape(3, 3)
    c = np.array(A.GetCenter())
    t = np.array(A.GetTranslation())
    F = np.diag([-1.0, -1.0, 1.0])
    M = np.eye(4)
    M[:3, :3] = F @ Mx @ F
    M[:3, 3] = F @ (-Mx @ c + c + t)
    np.save(cache, M)
    log(f'registration NLin6←2009c affine:\n{np.round(M, 4)}')
    return M


class Mouches:
    def __init__(self):
        self.P = np.asarray(nib.load(str(fetch('mouches_prob'))).dataobj).astype(np.float32)
        self.R = np.asarray(nib.load(str(fetch('mouches_radius'))).dataobj).astype(np.float32)
        self.M = registration_nlin6_to_2009c()

    def _vox(self, p):
        q = p @ self.M[:3, :3].T + self.M[:3, 3]
        return np.stack([(90.25 - q[:, 0]) / 0.5, (q[:, 1] + 126.25) / 0.5, (q[:, 2] + 72.25) / 0.5], 1)

    def prob(self, p):
        return ndi.map_coordinates(self.P, self._vox(p).T, order=1, mode='constant', cval=0)

    def radius(self, p):
        return ndi.map_coordinates(self.R, self._vox(p).T, order=1, mode='constant', cval=0)


def catmull(points, spacing=1.0):
    P = np.asarray(points, float)
    if len(P) < 2:
        return P
    P = np.vstack([2 * P[0] - P[1], P, 2 * P[-1] - P[-2]])
    out = [P[1]]
    for i in range(1, len(P) - 2):
        p0, p1, p2, p3 = P[i - 1], P[i], P[i + 1], P[i + 2]
        seg = np.linalg.norm(p2 - p1)
        n = max(2, int(np.ceil(seg / spacing)))
        for t in np.linspace(0, 1, n + 1)[1:]:
            t2, t3 = t * t, t * t * t
            out.append(0.5 * ((2 * p1) + (-p0 + p2) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t2 +
                              (-p0 + 3 * p1 - 3 * p2 + p3) * t3))
    return np.array(out)


def resample(pts, spacing):
    d = np.r_[0, np.cumsum(np.linalg.norm(np.diff(pts, axis=0), axis=1))]
    if d[-1] < 1e-6:
        return pts[:1].repeat(2, 0)
    n = max(2, int(round(d[-1] / spacing)) + 1)
    s = np.linspace(0, d[-1], n)
    return np.stack([np.interp(s, d, pts[:, k]) for k in range(3)], 1)


def smooth_path(pts, pin_start=True, pin_end=True, win=5, iters=1):
    p = pts.copy()
    for _ in range(iters):
        q = ndi.uniform_filter1d(p, win, axis=0, mode='nearest')
        if pin_start:
            q[0] = p[0]
        if pin_end:
            q[-1] = p[-1]
        p = q
    return p


def perp_basis(t):
    t = t / (np.linalg.norm(t, axis=1, keepdims=True) + 1e-9)
    a = np.where(np.abs(t[:, [0]]) < 0.9, np.array([[1.0, 0, 0]]), np.array([[0, 1.0, 0]]))
    e1 = np.cross(t, a)
    e1 /= np.linalg.norm(e1, axis=1, keepdims=True)
    e2 = np.cross(t, e1)
    return e1, e2


def snap_to_ridge(pts, mo: Mouches, pin_start, pin_end, radius=4.0, thr=5.0, pmin=12.0, maxdisp=6.0):
    orig = pts.copy()
    g = np.arange(-radius, radius + 1e-6, 0.5)
    A, B = np.meshgrid(g, g, indexing='ij')
    A, B = A.ravel(), B.ravel()
    p = pts.copy()
    for _ in range(6):
        t = np.gradient(p, axis=0)
        e1, e2 = perp_basis(t)
        S = p[:, None, :] + A[None, :, None] * e1[:, None, :] + B[None, :, None] * e2[:, None, :]
        pr = mo.prob(S.reshape(-1, 3)).reshape(len(p), -1)
        w = np.clip(pr - thr, 0, None) ** 2
        ok = (pr.max(1) >= pmin) & (w.sum(1) > 0)
        tgt = (S * w[:, :, None]).sum(1) / (w.sum(1)[:, None] + 1e-9)
        newp = np.where(ok[:, None], p + 0.7 * (tgt - p), p)
        disp = newp - orig
        n = np.linalg.norm(disp, axis=1, keepdims=True)
        newp = np.where(n > maxdisp, orig + disp / n * maxdisp, newp)
        if pin_start:
            newp[0] = p[0]
        if pin_end:
            newp[-1] = p[-1]
        p = smooth_path(newp, pin_start, pin_end, win=5)
    return p


class TissueDepth:
    def __init__(self, aseg):
        tissue = (aseg > 0) & ~np.isin(aseg, CSF_LIKE)
        self.depth = ndi.distance_transform_edt(tissue).astype(np.float32)
        self.grad = np.stack(np.gradient(ndi.gaussian_filter(self.depth, 1.0)), 0)

    def sample(self, p):
        v = w2i(p).T
        d = ndi.map_coordinates(self.depth, v, order=1)
        g = np.stack([ndi.map_coordinates(self.grad[k], v, order=1) for k in range(3)], 1)
        return d, g


def push_out(pts, td: TissueDepth, r, pin_start, pin_end, tol=0.8):
    p = pts.copy()
    for _ in range(4):
        d, g = td.sample(p)
        n = np.linalg.norm(g, axis=1, keepdims=True) + 1e-6
        move = (d > tol)[:, None] * (-(g / n) * (d + r * 0.6)[:, None])
        if pin_start:
            move[0] = 0
        if pin_end:
            move[-1] = 0
        p = smooth_path(p + move, pin_start, pin_end, win=3)
    return p


def drape(pts, surf, r, start_frac, pin_start, pin_end):
    verts, normals, tree = surf
    p = pts.copy()
    n = len(p)
    s0 = int(start_frac * (n - 1))
    ramp = np.clip((np.arange(n) - s0) / 6.0, 0, 1)
    for _ in range(3):
        _, j = tree.query(p)
        tgt = verts[j] + normals[j] * (r + 0.8)
        q = p + ramp[:, None] * (tgt - p)
        if pin_start:
            q[0] = p[0]
        if pin_end:
            q[-1] = p[-1]
        p = smooth_path(q, pin_start, pin_end, win=5)
    return p


PRIORITY = ['ica_cervical', 'ica_petrous_cavernous', 'ica_ophthalmic_seg', 'ica_terminal', 'mca_m1', 'aca_a1', 'acomm',
            'aca_a2', 'va_extracranial', 'va_v4_prox', 'va_v4_dist', 'basilar_lower', 'basilar_mid', 'basilar_upper',
            'basilar_tip', 'pca_p1', 'pca_p2', 'pcomm', 'mca_m2_sup', 'mca_m2_inf']
CEREBELLAR = ('pica', 'aica', 'sca', 'lepto_pica', 'lepto_aica', 'lepto_sca')


def refine_vessels(export, surfaces, td, mo):
    vessels = export['vessels']
    byid = {v['id']: v for v in vessels}

    def base(vid):
        return vid[:-2] if vid[-2:] in ('_r', '_l') else vid

    def prio(v):
        b = base(v['id'])
        if b in PRIORITY:
            return (0, PRIORITY.index(b))
        return ({'trunk': 1, 'branch': 2, 'perforator': 3, 'communicating': 4, 'collateral': 5}[v['kind']], 0)

    order = sorted(vessels, key=prio)
    junction: dict[str, np.ndarray] = {}
    done: dict[str, np.ndarray] = {}
    report = []

    def node_pos(node):
        if node.endswith('@mid'):
            vid = node[:-4]
            if vid in done:
                P = done[vid]
                d = np.r_[0, np.cumsum(np.linalg.norm(np.diff(P, axis=0), axis=1))]
                s = d[-1] / 2
                return np.array([np.interp(s, d, P[:, k]) for k in range(3)])
            return None
        return junction.get(node)

    pending = list(order)
    guard = 0
    while pending and guard < 5:
        guard += 1
        nxt = []
        for v in pending:
            fr = v['from']
            if fr.endswith('@mid') and fr[:-4] not in done and fr[:-4] in byid:
                nxt.append(v)
                continue
            wp = np.array(v['path'], float)
            ps, pe = node_pos(fr), node_pos(v['to'])
            if ps is not None:
                wp[0] = ps
            if pe is not None:
                wp[-1] = pe
            pts = resample(catmull(wp, 0.5), 1.0)
            pin_s, pin_e = ps is not None, pe is not None
            before = None
            mode = v['pathMode']
            if mode == 'cistern' and not v['visualOnly']:
                before = mo.prob(pts).mean()
                if v['r'] >= 0.6:
                    pts = snap_to_ridge(pts, mo, pin_s, pin_e)
                pts = push_out(pts, td, v['r'], pin_s, pin_e)
            elif mode == 'surface':
                key = 'cerebellum' if base(v['id']).startswith(CEREBELLAR) else ('hemi_l' if v['side'] == 'l' else 'hemi_r')
                if v['side'] == 'm' and not base(v['id']).startswith(CEREBELLAR):
                    key = 'hemi_r'
                pts = drape(pts, surfaces[key], v['r'], v['surfaceFrom'], pin_s, pin_e)
            done[v['id']] = pts
            junction.setdefault(fr, pts[0]) if not fr.endswith('@mid') else None
            junction.setdefault(v['to'], pts[-1])
            if before is not None:
                after = mo.prob(pts).mean()
                d, _ = td.sample(pts)
                rad = mo.radius(pts)
                rad = np.median(rad[rad > 0]) if (rad > 0).any() else 0
                report.append(f"{v['id']:32s} prob {before:5.1f}→{after:5.1f}  deep>{v['r']:.1f}mm: "
                              f"{(d > v['r'] + 1).mean() * 100:4.0f}%  atlas r≈{rad:.2f} (model {v['r']})")
        pending = nxt

    # enforce continuity after all are placed
    out = {}
    for v in vessels:
        P = done[v['id']].copy()
        ps, pe = node_pos(v['from']), node_pos(v['to'])
        if ps is not None:
            P[0] = ps
        if pe is not None:
            P[-1] = pe
        spacing = 1.2 if v['r'] < 0.5 else 2.0
        P = resample(P, spacing)
        if len(P) > 90:
            P = resample(P, np.linalg.norm(np.diff(P, axis=0), axis=1).sum() / 89)
        out[v['id']] = np.round(P, 1).tolist()
    log('vessel refinement (cisternal vessels):')
    for line in report:
        log('  ' + line)
    return out


# ───────────────────────────── output ─────────────────────────────
def write_binary(meshes, bed_labels):
    PUBLIC.mkdir(parents=True, exist_ok=True)
    chunks = []
    manifest = []
    offset = 0

    def add(arr):
        nonlocal offset
        b = arr.tobytes()
        pad = (-len(b)) % 4
        chunks.append(b + b'\0' * pad)
        o = offset
        offset += len(b) + pad
        return o

    for name, (kind, m) in meshes.items():
        v = m.vertices
        q = np.round(v * 100).astype(np.int16)
        idx = m.faces.astype(np.uint16 if len(v) < 65536 else np.uint32).ravel()
        entry = {
            'name': name, 'kind': kind, 'vertexCount': int(len(v)), 'indexCount': int(len(idx)),
            'position': add(q), 'index': add(idx), 'indexType': 'u16' if idx.dtype == np.uint16 else 'u32',
            'bounds': [np.round(v.min(0), 1).tolist(), np.round(v.max(0), 1).tolist()],
        }
        if name in bed_labels:
            entry['bed'] = add(bed_labels[name].astype(np.uint16))
        manifest.append(entry)
    data = b''.join(chunks)
    (PUBLIC / 'brain.bin').write_bytes(data)
    (PUBLIC / 'brain.json').write_text(json.dumps({
        'version': 1,
        'positionScale': 0.01,
        'meshes': manifest,
        'beds': [b['id'] for b in BEDS_GLOBAL],
        'space': 'MNI152NLin2009cAsym (RAS, mm)',
    }, separators=(',', ':')))
    log(f'wrote brain.bin ({len(data) / 1e6:.2f} MB), {len(manifest)} meshes')


def main():
    global BEDS_GLOBAL
    t0 = time.time()
    export_path = CACHE / 'anatomy-export.json'
    if not export_path.exists():
        sys.exit('run `npx vite-node tools/export-anatomy.ts` first')
    export = json.loads(export_path.read_text())

    V = build_label_volumes()
    region, terr, border, cereb = assign_beds(V)
    bed_ids, beds = make_beds(region, terr, border, cereb)
    BEDS_GLOBAL = beds
    known = {r['id'] for r in export['regions']}
    unknown = sorted({b['region'][:-2] for b in beds} - known)
    if unknown:
        sys.exit(f'pipeline produced regions unknown to the app: {unknown}')

    meshes = build_meshes(V, bed_ids)
    labels = {}
    for name, (kind, m) in meshes.items():
        if kind == 'ventricle':
            continue
        if name.startswith('hemi_'):
            side = name[-1]
            labels[name] = label_vertices(m, bed_ids, lambda r, s=side: r.endswith('_' + s) and not r.startswith(
                ('thalamus', 'caudate', 'putamen', 'globus', 'hippocampus', 'amygdala', 'ic_', 'dentate')))
        elif kind == 'cerebellum':
            labels[name] = label_vertices(m, bed_ids, lambda r: r.startswith(('cerebellum', 'vermis')))
        elif kind == 'brainstem':
            labels[name] = label_vertices(m, bed_ids, lambda r: r.startswith(('midbrain', 'pons', 'medulla')))
        else:
            stem = name[:-2]
            side = name[-1]
            pref = {'thalamus': ('thalamus',), 'caudate': ('caudate',), 'putamen': ('putamen',),
                    'pallidum': ('globus_pallidus',), 'hippocampus': ('hippocampus',), 'amygdala': ('amygdala',),
                    'accumbens': ('caudate_head',), 'ic': ('ic_',), 'corpus_callosum': ('corpus_callosum', 'splenium'),
                    'dentate': ('dentate',)}[stem]
            labels[name] = label_vertices(m, bed_ids, lambda r, p=pref, s=side: r.startswith(p) and r.endswith('_' + s),
                                          inward=0.8)

    # vessel centrelines
    log('refining vessel centrelines …')
    surfaces = {}
    for key in ('hemi_r', 'hemi_l', 'cerebellum'):
        m = meshes[key][1]
        surfaces[key] = (m.vertices, m.vertex_normals, cKDTree(m.vertices))
    td = TissueDepth(V['aseg'])
    mo = Mouches()
    paths = refine_vessels(export, surfaces, td, mo)

    GENERATED.mkdir(parents=True, exist_ok=True)
    (GENERATED / 'vesselPaths.json').write_text(json.dumps(paths, separators=(',', ':')))
    (GENERATED / 'beds.json').write_text(json.dumps(beds, separators=(',', ':')))
    write_binary(meshes, labels)

    # region volume summary
    vols = {}
    for b in beds:
        vols[b['region']] = vols.get(b['region'], 0) + b['volume']
    log('region volumes (mL):')
    for r in sorted(vols):
        log(f'  {r:40s} {vols[r]:7.2f}')
    log(f'done in {time.time() - t0:.0f}s')
    (CACHE / 'report.txt').write_text('\n'.join(REPORT))


if __name__ == '__main__':
    main()

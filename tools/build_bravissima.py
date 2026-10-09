"""Build a measured MRA voxel reference, without changing simulation anatomy.

Run from the repository root: python tools/build_bravissima.py.
Requires NumPy and nibabel. Source data use the Bravissima Attribution license.
"""
from collections import Counter, deque
import hashlib
import io
import itertools
import json
from pathlib import Path
import urllib.request
import zipfile

import nibabel as nib
import numpy as np

DOWNLOAD = "https://www.nitrc.org/frs/download.php/10589/OHBM2017Spm.zip/?i_agree=1&download_now=1"
ARCHIVE_SHA256 = "a90f65a08fa141973d94edf55a03c630b9dafe45d03fb3ffee0292b373898a79"
VOLUME_SHA256 = "6349b4dc25ab9a860d11f02c45ce40da35d073bffd82485a03712db5cd456e9a"
VOLUME_NAME = "srcgBG0001.nii"
CACHE = Path(__file__).resolve().parent / ".cache" / "bravissima"
OUTPUT = Path(__file__).resolve().parent.parent / "public" / "data"
GROUPS = [
    {"id": 1, "family": "CoW", "side": "m", "sourceName": "pre-Willis/CoW"},
    {"id": 2, "family": "ACA", "side": "l", "sourceName": "Left ACA"},
    {"id": 3, "family": "MCA", "side": "l", "sourceName": "Left MCA"},
    {"id": 4, "family": "MCA", "side": "r", "sourceName": "Right MCA"},
    {"id": 5, "family": "ACA", "side": "r", "sourceName": "Right ACA"},
    {"id": 6, "family": "PCA", "side": "l", "sourceName": "Left PCA"},
    {"id": 7, "family": "PCA", "side": "r", "sourceName": "Right PCA"},
]


def digest(data):
    return hashlib.sha256(data).hexdigest()


def load_source():
    CACHE.mkdir(parents=True, exist_ok=True)
    archive_path = CACHE / "OHBM2017Spm.zip"
    if not archive_path.exists():
        with urllib.request.urlopen(DOWNLOAD, timeout=60) as response:
            archive_path.write_bytes(response.read())
    archive_bytes = archive_path.read_bytes()
    if digest(archive_bytes) != ARCHIVE_SHA256:
        raise ValueError("Bravissima archive SHA256 does not match the verified source")
    with zipfile.ZipFile(io.BytesIO(archive_bytes)) as archive:
        failed = archive.testzip()
        if failed is not None:
            raise ValueError(f"Outer ZIP CRC check failed: {failed}")
        readme = archive.read("README_43_2017.txt").decode("utf8")
        normalization_script = archive.read("norman.m")
        with zipfile.ZipFile(io.BytesIO(archive.read("Brava43Subs.zip"))) as subjects:
            volume_bytes = subjects.read(VOLUME_NAME)  # ZipFile verifies this entry CRC.
            entry_crc = subjects.getinfo(VOLUME_NAME).CRC
    if digest(volume_bytes) != VOLUME_SHA256:
        raise ValueError("Individual group volume SHA256 does not match the verified source")
    volume_path = CACHE / VOLUME_NAME
    volume_path.write_bytes(volume_bytes)
    return nib.load(volume_path), readme, normalization_script, entry_crc


def build_reference(image):
    data = np.asanyarray(image.dataobj)
    finite = np.isfinite(data)
    supported = np.isin(data, [group["id"] for group in GROUPS])
    if np.any(finite & (data > 0) & ~supported):
        raise ValueError("Unexpected positive anatomical family label")
    indices = np.argwhere(finite & supported)
    labels = data[tuple(indices.T)].astype(int)
    points = nib.affines.apply_affine(image.affine, indices)
    if not np.all(np.isfinite(points)):
        raise ValueError("Non-finite transformed voxel coordinates")
    lookup = {tuple(voxel): index for index, voxel in enumerate(indices)}
    # One half of the 26-neighborhood emits each existing voxel pair once.
    offsets = [offset for offset in itertools.product([-1, 0, 1], repeat=3) if offset > (0, 0, 0)]
    segments = []
    adjacency = [[] for _ in indices]
    for first, voxel in enumerate(indices):
        for offset in offsets:
            neighbor = tuple(int(value + step) for value, step in zip(voxel, offset))
            second = lookup.get(neighbor)
            if second is not None:
                segments.append([first, second])
                adjacency[first].append(second)
                adjacency[second].append(first)
    seen = set()
    components = []
    for initial in range(len(indices)):
        if initial in seen:
            continue
        queue = deque([initial])
        seen.add(initial)
        count = 0
        while queue:
            current = queue.popleft()
            count += 1
            for neighbor in adjacency[current]:
                if neighbor not in seen:
                    seen.add(neighbor)
                    queue.append(neighbor)
        components.append(count)
    group_counts = Counter(labels.tolist())
    groups = [{**group, "voxelCount": group_counts[group["id"]]} for group in GROUPS]
    summary = {
        "voxelCount": len(indices), "segmentCount": len(segments),
        "isolatedVoxelCount": sum(not neighbors for neighbors in adjacency),
        "componentCount": len(components), "componentSizes": sorted(components, reverse=True),
        "boundsMm": [points.min(axis=0).tolist(), points.max(axis=0).tolist()],
    }
    asset = {
        "version": 1, "subject": "BG0001", "coordinateSpace": "source SPM-normalized MNI152",
        "spacingMm": [float(value) for value in image.header.get_zooms()],
        "groups": groups, "points": points.tolist(), "labels": labels.tolist(),
        "segments": segments, "summary": summary,
    }
    decoding = {
        "dimensions": list(image.shape), "affine": image.affine.tolist(),
        "voxelAxes": list(nib.aff2axcodes(image.affine)),
        "qformCode": int(image.header["qform_code"]), "sformCode": int(image.header["sform_code"]),
        "dtype": str(data.dtype), "nanVoxelCount": int(np.isnan(data).sum()),
        "infiniteVoxelCount": int(np.isinf(data).sum()),
        "selection": "isfinite(groupVolume) AND groupVolume in {1,2,3,4,5,6,7}; zero, NaN and infinity excluded",
        "pointOrder": "lexicographic voxel indices x, then y, then z (numpy.argwhere)",
        "worldCoordinates": "NIfTI affine multiplied by zero-based voxel-center [i,j,k,1]; no additional transform",
        "adjacency": "undirected 26-neighbor existing selected voxel pairs, emitted once; no gap filling",
        "adjacencyLimitation": "Rendering adjacency assumption, not original SWC parent topology; touching vessels can create extra edges or cycles",
        "isolatedPoints": "All selected points retained even when no neighboring selected voxel exists",
    }
    return asset, decoding


def build():
    image, readme, script, entry_crc = load_source()
    asset, decoding = build_reference(image)
    encoded = (json.dumps(asset, separators=(",", ":"), allow_nan=False) + "\n").encode("utf8")
    provenance = {
        "version": 1, "subject": "BG0001", "modality": "MRA-derived individual arterial reconstruction",
        "project": "https://www.nitrc.org/projects/bravissima/", "download": DOWNLOAD,
        "release": "OHBM 2017 SPM-normalized 43 subjects, distributed 2018-04-19",
        "license": "Attribution (source does not specify a Creative Commons version)",
        "licenseSource": "https://www.nitrc.org/docman/view.php/1266/78741/Readme43",
        "licenseText": readme[readme.index("License: Attribution"):].strip(),
        "citation": "Herron TJ, Dronkers N, Turken AU. BraVa cerebral artery database converted to NIFTI MRI format (2017 poster; not peer reviewed). DOI10.7490/f1000research.1114378.1",
        "originalCitation": "Wright et al. Digital reconstruction and morphometric analysis of human brain arterial vasculature from magnetic resonance angiography. NeuroImage82(2013)170-181. DOI10.1016/j.neuroimage.2013.05.089; http://cng.gmu.edu/brava",
        "archive": {"name": "OHBM2017Spm.zip", "sha256": ARCHIVE_SHA256, "outerZipCrcVerified": True},
        "sourceVolume": {"entry": "Brava43Subs.zip/" + VOLUME_NAME, "sha256": VOLUME_SHA256, "crc32": entry_crc},
        "normalizationScriptSha256": digest(script), "sourceReadmeSha256": digest(readme.encode("utf8")),
        "sourceReadme": readme, "assetSha256": digest(encoded), "decoding": decoding,
        "groupMapping": "norman.m outputs BravaACAlh43 group2, MCAlh group3, MCArh group4, ACArh group5, PCAlh group6, PCArh group7; BG0001 is not a subject marked for lateral flip",
        "placement": "Source SPM8-normalized MNI152 coordinates retained. Alignment to this project's 2009c template is unvalidated; no registration is claimed.",
        "namedBranchMapping": False, "simulationParametersChanged": False,
        "changes": "Selected all finite family-labeled voxel centers and generated adjacent-voxel display segments; no smoothing, thinning, resampling, gap repair or invented connections",
        "summary": asset["summary"],
    }
    OUTPUT.mkdir(parents=True, exist_ok=True)
    (OUTPUT / "mra-distal.json").write_bytes(encoded)
    (OUTPUT / "mra-distal-provenance.json").write_text(json.dumps(provenance, indent=2, allow_nan=False) + "\n", encoding="utf8")
    print(json.dumps(asset["summary"]))
    print("Asset SHA256:", provenance["assetSha256"])


if __name__ == "__main__":
    build()

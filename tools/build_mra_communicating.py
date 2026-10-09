"""Build render-only TopCoW MRA008 communicating shapes. Requires NumPy.
Run from the repository root: python tools/build_mra_communicating.py.
Source and derivative data are CC-BY-NC-4.0.
"""
import base64
import binascii
from collections import defaultdict, deque
import hashlib
import json
from pathlib import Path
import struct
import urllib.request
import xml.etree.ElementTree as ET
import zlib

import numpy as np

SOURCE_URL = "https://zenodo.org/api/records/17358162/files/CoW_Centerline_Data.zip/content"
SOURCE_FILES = {
    "topcow_mr_008.vtp": {
        "entry": "CoW_Centerline_Data/cow_graphs/topcow_mr_008.vtp",
        "compression": 8,
        "crc32": 4214297323,
        "compressedSize": 35648,
        "size": 49387,
        "offset": 4210332,
        "sha256": "c06b3ca58e43097832cadf822ab392d05ce5ae6871306c2064687ae5d01c5ae4"
    },
    "topcow_mr_008-nodes.json": {
        "entry": "CoW_Centerline_Data/cow_nodes/topcow_mr_008.json",
        "compression": 8,
        "crc32": 1435723397,
        "compressedSize": 1125,
        "size": 13284,
        "offset": 372740318,
        "sha256": "3239d0619ecb21a2769882b8ec5429c3aeaad4181eeae707cd42f1e59e5c79e4"
    },
    "selected-variant.json": {
        "entry": "CoW_Centerline_Data/cow_variants/topcow_mr_008.json",
        "compression": 8,
        "crc32": 3773479216,
        "compressedSize": 131,
        "size": 445,
        "offset": 372895789,
        "sha256": "609ce5a79e799f6d407d374e456e84b9b3df43f8ff9b3db2349af6f38654c048"
    },
    "README.txt": {
        "entry": "CoW_Centerline_Data/README.txt",
        "compression": 8,
        "crc32": 3999794058,
        "compressedSize": 1736,
        "size": 4295,
        "offset": 372927014,
        "sha256": "5e4a7c822b8bcde012196d8031f25b5b65b5bc2db6be567b7cc6faa6a63c26be"
    }
}

CACHE = Path(__file__).resolve().parent / ".cache" / "topcow-audit"
OUTPUT = Path("src/anatomy/generated")
ATTACHMENTS = {
    "pcomm_r": [("ica_terminal_r", 0), ("pca_p1_r", -1)],
    "pcomm_l": [("ica_terminal_l", 0), ("pca_p1_l", -1)],
    "acomm": [("aca_a1_r", -1), ("aca_a1_l", -1)],
}
LANDMARKS = [
    ("1", "BA bifurcation", "pca_p1_r", 0),
    ("4", "ICA bifurcation", "mca_m1_r", 0),
    ("6", "ICA bifurcation", "mca_m1_l", 0),
    ("5", "MCA end", "mca_m1_r", -1),
    ("7", "MCA end", "mca_m1_l", -1),
]


def fetch_range(start, end):
    request = urllib.request.Request(SOURCE_URL, headers={"Range": f"bytes={start}-{end}"})
    with urllib.request.urlopen(request, timeout=60) as response:
        if response.status != 206:
            raise ValueError("Source must support HTTP range downloads")
        result = response.read()
    if len(result) != end - start + 1:
        raise ValueError("Truncated source range")
    return result


def verified_sources():
    CACHE.mkdir(parents=True, exist_ok=True)
    for name, metadata in SOURCE_FILES.items():
        path = CACHE / name
        if not path.exists():
            offset = metadata["offset"]
            header = struct.unpack("<4s5H3I2H", fetch_range(offset, offset + 29))
            if header[0] != b"PK\x03\x04":
                raise ValueError("Invalid ZIP local header")
            start = offset + 30 + header[9] + header[10]
            compressed = fetch_range(start, start + metadata["compressedSize"] - 1)
            data = zlib.decompress(compressed, -15) if metadata["compression"] == 8 else compressed
            path.write_bytes(data)
        data = path.read_bytes()
        if (len(data) != metadata["size"]
                or binascii.crc32(data) & 0xffffffff != metadata["crc32"]
                or hashlib.sha256(data).hexdigest() != metadata["sha256"]):
            raise ValueError(f"Source integrity check failed: {name}")


def decode_vtk_array(node, appended):
    encoded = appended[int(node.attrib["offset"]):]
    blocks = struct.unpack("<I", base64.b64decode(encoded[:24])[:4])[0]
    header_chars = ((3 + blocks) * 4 + 2) // 3 * 4
    header = base64.b64decode(encoded[:header_chars])
    sizes = struct.unpack_from("<" + "I" * blocks, header, 12)
    position = header_chars
    decoded = []
    for size in sizes:
        characters = (size + 2) // 3 * 4
        decoded.append(zlib.decompress(base64.b64decode(encoded[position:position + characters])))
        position += characters
    return b"".join(decoded)


def read_graph():
    root = ET.parse(CACHE / "topcow_mr_008.vtp").getroot()
    appended = "".join(root.find("AppendedData").text.split())[1:]
    points = decode_vtk_array(root.find(".//Points/DataArray"), appended)
    labels = decode_vtk_array(root.find('.//CellData/DataArray[@Name="labels"]'), appended)
    edges = decode_vtk_array(root.find('.//Lines/DataArray[@Name="connectivity"]'), appended)
    return (np.array(list(struct.iter_unpack("<3f", points))),
            np.array(list(struct.iter_unpack("<i", labels))).ravel(),
            list(struct.iter_unpack("<2q", edges)))


def unique_path(edges, labels, label, start, end):
    adjacency = defaultdict(set)
    all_labels = defaultdict(set)
    for (first, second), edge_label in zip(edges, labels):
        all_labels[first].add(int(edge_label))
        all_labels[second].add(int(edge_label))
        if edge_label == label:
            adjacency[first].add(second)
            adjacency[second].add(first)
    edge_count = sum(map(len, adjacency.values())) // 2
    assert edge_count == len(adjacency) - 1, "Selected label must be acyclic"
    parents = {start: None}
    queue = deque([start])
    while queue:
        current = queue.popleft()
        for neighbor in sorted(adjacency[current]):
            if neighbor not in parents:
                parents[neighbor] = current
                queue.append(neighbor)
    assert len(parents) == len(adjacency) and end in parents
    path = []
    current = end
    while current is not None:
        path.append(current)
        current = parents[current]
    path.reverse()
    return path, edge_count, [sorted(all_labels[start]), sorted(all_labels[end])]


def global_rotation(nodes, model):
    source = np.array([nodes[label][name][0]["coords"] for label, name, _, _ in LANDMARKS])
    target = np.array([model[key][index] for _, _, key, index in LANDMARKS])
    left, _, right = np.linalg.svd((source - source.mean(0)).T @ (target - target.mean(0)))
    handedness = np.eye(3)
    handedness[-1, -1] = np.linalg.det(left @ right)
    return (left @ handedness @ right).T


def place_curve(source, target, seed):
    source_axis = source[-1] - source[0]
    target_axis = target[-1] - target[0]
    scale = np.linalg.norm(target_axis) / np.linalg.norm(source_axis)
    initial = seed @ source_axis
    initial /= np.linalg.norm(initial)
    desired = target_axis / np.linalg.norm(target_axis)
    cross = np.cross(initial, desired)
    cosine = np.dot(initial, desired)
    if cosine < -0.999999:
        axis = np.cross(initial, np.eye(3)[np.argmin(np.abs(initial))])
        axis /= np.linalg.norm(axis)
        correction = 2 * np.outer(axis, axis) - np.eye(3)
    else:
        skew = np.array([[0, -cross[2], cross[1]], [cross[2], 0, -cross[0]], [-cross[1], cross[0], 0]])
        correction = np.eye(3) + skew + skew @ skew / (1 + cosine)
    rotation = correction @ seed
    translation = target[0] - scale * rotation @ source[0]
    placed = scale * (source @ rotation.T) + translation
    assert abs(np.linalg.det(rotation) - 1) < 1e-10
    assert np.allclose(rotation.T @ rotation, np.eye(3), atol=1e-10)
    assert np.allclose(placed[[0, -1]], target, atol=1e-10)
    segment_ratios = np.linalg.norm(np.diff(placed, axis=0), axis=1) / np.linalg.norm(np.diff(source, axis=0), axis=1)
    assert np.allclose(segment_ratios, scale, atol=1e-10)
    return placed, {
        "scale": float(scale), "rotationColumnVector": rotation.tolist(),
        "translation": translation.tolist(), "rotationDeterminant": float(np.linalg.det(rotation)),
        "endpointMaxError": float(np.max(np.abs(placed[[0, -1]] - target))),
        "uniformSegmentScaleMaxError": float(np.max(np.abs(segment_ratios - scale))),
    }


def half_arclength(curve):
    lengths = np.linalg.norm(np.diff(curve, axis=0), axis=1)
    half = lengths.sum() / 2
    index = int(np.searchsorted(np.cumsum(lengths), half))
    fraction = (half - lengths[:index].sum()) / lengths[index]
    return curve[index] + (curve[index + 1] - curve[index]) * fraction


def build():
    verified_sources()
    points, labels, edges = read_graph()
    nodes = json.loads((CACHE / "topcow_mr_008-nodes.json").read_text())
    model = json.loads((OUTPUT / "vesselPaths.json").read_text())
    render = json.loads((OUTPUT / "vesselRenderPaths.json").read_text())
    seed = global_rotation(nodes, model)
    specifications = [("pcomm_r", 8, "ICA boundary", "PCA boundary"),
                      ("pcomm_l", 9, "ICA boundary", "PCA boundary"),
                      ("acomm", 10, "R-ACA boundary", "L-ACA boundary")]
    curves = {}
    audit = {}
    for key, label, start_name, end_name in specifications:
        start = nodes[str(label)][start_name][0]["id"]
        end = nodes[str(label)][end_name][0]["id"]
        path, edge_count, adjacent_labels = unique_path(edges, labels, label, start, end)
        source = points[path]
        for name, index in [(start_name, 0), (end_name, -1)]:
            assert np.linalg.norm(source[index] - nodes[str(label)][name][0]["coords"]) < 1e-4
        anchors = ATTACHMENTS[key]
        target = np.array([render.get(parent, model[parent])[index] for parent, index in anchors])
        assert np.allclose(target, np.array([model[key][0], model[key][-1]]), atol=1e-10), "Rendered attachment changed; review placement"
        placed, transform = place_curve(source, target, seed)
        curves[key] = np.round(placed, 10).tolist()
        audit[key] = {
            "targetAttachments": anchors, "targetCoordinates": target.tolist(),
            "targetPathSources": ["vesselRenderPaths" if parent in render else "vesselPaths" for parent, _ in anchors],
            "label": label, "sourceStart": start_name, "sourceEnd": end_name,
            "sourcePointIds": path, "sourceEndpointAdjacentLabels": adjacent_labels,
            "sourceLabelEdges": edge_count, "selectedEdges": len(path) - 1,
            "omittedLabelEdges": edge_count - len(path) + 1, **transform,
        }
    connectors = {}
    for side in ["r", "l"]:
        parent = "pcomm_" + side
        child = "tuberothalamic_" + side
        midpoint = half_arclength(np.array(curves[parent]))
        connector = np.array(render.get(child, model[child]), dtype=float)
        original = connector[0].copy()
        connector[0] = midpoint
        curves[child] = np.round(connector, 10).tolist()
        connectors[child] = {
            "classification": "authored render connector, not measured MRA",
            "parent": parent, "attachment": "parent polyline half arclength",
            "oldStart": original.tolist(), "newStart": midpoint.tolist(),
            "remainingPointsUnchanged": True,
        }
    provenance = {
        "sourceRecord": "https://zenodo.org/records/17358162", "sourceArchive": SOURCE_URL,
        "sourceFiles": SOURCE_FILES,
        "integrity": "Extracted entry CRC32 and pinned SHA256 verified; whole archive MD5 not verified",
        "modality": "MRA", "case": "008", "license": "CC-BY-NC-4.0",
        "citation": "Musio et al., Circle of Willis Centerline Graphs: A Dataset and Baseline Algorithm (2025 preprint, arXiv:2510.13720); dataset released 2025-10-15",
        "placement": "Per-vessel proper similarity; global approximate landmark rotation seeds axial orientation. Unvalidated placement, not MNI registration. Source physical units/orientation not independently established.",
        "globalSeedLandmarks": LANDMARKS, "globalSeedRotationColumnVector": seed.tolist(),
        "simulationParametersChanged": False,
        "thirdA2": "Source ACom side branch and label15 excluded; unique R-to-L main path only",
        "variant": json.loads((CACHE / "selected-variant.json").read_text()),
        "originalGraphVtp": (CACHE / "topcow_mr_008.vtp").read_text(),
        "originalNodes": nodes, "branches": audit, "authoredConnectors": connectors,
    }
    (OUTPUT / "mraCommunicatingPaths.json").write_text(json.dumps(curves, separators=(",", ":")) + "\n", encoding="utf8")
    (OUTPUT / "mraCommunicatingAudit.json").write_text(json.dumps(provenance, indent=2) + "\n", encoding="utf8")
    for key, details in audit.items():
        print(key, len(details["sourcePointIds"]), "points; endpoint error", details["endpointMaxError"])


if __name__ == "__main__":
    build()

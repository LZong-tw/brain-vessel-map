[繁體中文](slices.zh-TW.md) · [简体中文](slices.zh-CN.md) · [English](slices.md) · [Deutsch](slices.de.md) · [日本語](slices.ja.md)

<!-- source-doc: docs/slices.md; sha256: 37bb92d75e33cf151acbdf7addf21d125076a6336b19d260ba45380f9bc2e387 -->

<a id="mri-slices-and-territory-references"></a>
# MRT-Schnitte und Referenzterritorien

Der Hintergrund der Schnittansicht ist die reale nichtlineare asymmetrische 1 mm-T1-Vorlage ICBM 152 von 2009c, vertrieben durch [TemplateFlow](https://github.com/templateflow/tpl-MNI152NLin2009cAsym). Ihre [Vorlagenmetadaten](https://github.com/templateflow/tpl-MNI152NLin2009cAsym/blob/master/template_description.json) nennen ein Gitter von 193 × 229 × 193, Abstand 1 mm und Ursprung (-96, -132, -78) mm. Der Exporter prüft die heruntergeladene affine NIfTI-Matrix gegen dieses RAS-Gitter. Die Anzeigeintensität wird mit dem Quellmaximum linear auf acht Bit quantisiert.

Die Territoriumsumrisse stammen aus dem [arteriellen Atlas von Liu et al.](https://github.com/Chin-Fu-Liu/Arterial_Atlas), abgeleitet aus Läsionsverteilungen von 1,298 Patienten; siehe [Originalarbeit in Scientific Data](https://doi.org/10.1038/s41597-022-01923-0). Das Repository des Herausgebers benennt 30 arterielle Parzellen und Ventrikellabels. Angezeigt werden nur die 30 arteriellen Labels; nichtarterielle Labels werden auf null abgebildet. Die Quellrevision ist im Exporter festgelegt; die SHA-256 jeder heruntergeladenen Eingabe wird im erzeugten Manifest dokumentiert. Nächste-Nachbar-Abtastung erhält die arteriellen Label-IDs.

<a id="alignment-and-interpretation"></a>
## Ausrichtung und Interpretation

Lius Quelle beschreibt ihren Raum als MNI, nicht ausdrücklich als MNI2009c. Diese Ansicht verwendet die bestehende ungefähre Atlas-Vorlagen-Zuordnung des Projekts:
`atlas voxel = (89 - RAS x, RAS y + 126, RAS z + 72)`.
Sie behauptet keine neu geprüfte klinische Registrierung. Der Exporter berichtet linke/rechte Labelzentroide, die Atlasüberlappung mit der aseg-Segmentierung der Vorlage und die Vorlagenabdeckung, damit Prüfer diese Näherung beurteilen können.

Diese Umrisse sind **Referenzterritorien eines Populationsatlas**, keine vorhergesagten Läsionsgrenzen eines Patienten. Die getrennte Heatmap wiederholt den aktuellen Infarktanteil des Modells auf Ebene der Perfusionseinheit über jedes dieser Einheit zugeordnete Voxel. Sie lokalisiert den geschädigten Anteil innerhalb der Einheit nicht und verwendet keine Läsionsschwelle. Voxel-Perfusionseinheiten werden mit dem bestehenden Asset-Generator rekonstruiert, gegen sämtliche eingecheckten IDs und Volumina geprüft und entsprechend der bestehenden Mesh-Liste angeordnet. Dies ist die funktionelle Zuordnung des Projekts einschließlich anatomischer Heuristiken, keine neu gemessene voxelbasierte Läsionsmaske. Bestehende Meshes, erzeugte Perfusionseinheiten und medizinische Parameter werden nicht umgeschrieben.

<a id="rebuilding-and-binary-layout"></a>
## Neuerstellung und Binärlayout

`tools/requirements.txt` installieren, anschließend `python tools/build_slices.py` ausführen. Quell-NIfTI-Dateien werden in `tools/.cache` zwischengespeichert; Downloads werden validiert und atomar veröffentlicht. Ein beschädigter Cache-Eintrag wird erneut heruntergeladen. Die Neuerstellung scheitert, wenn IDs, Volumina oder affine Vorlagenmatrix von den vorhandenen Assets abweichen.

`public/data/slices.bin.gz` ist ein gzip-Datenstrom mit drei aneinandergehängten Arrays auf demselben Gitter voller Auflösung: T1 uint8, Territorium uint8, anschließend Perfusionseinheit uint16 in Little-Endian. x läuft am schnellsten: `x + nx * (y + ny * z)`. Manifest-Offsets beziehen sich auf dekomprimierte Bytes. Perfusionseinheit null ist nicht zugeordnet; Einheit n indiziert `beds[n - 1]`. Das Manifest dokumentiert komprimierte SHA-256, Längen, Herkunft und Validierung. Das Laden im Browser benötigt gzip-Dekompressionsunterstützung und meldet nicht unterstützte Browser ausdrücklich.

<a id="attribution-and-license"></a>
## Quellenangabe und Lizenz

Die abgeleiteten `slices.json` und `slices.bin.gz` werden unter [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/) verteilt, einschließlich der Quellenangabe für Lius Atlas: Digital 3D Brain MRI Arterial Territories Atlas, © 2021 The Johns Hopkins University; Liu CF et al., Scientific Data 2023;10:74. Die Zuordnung der Perfusionseinheiten leitet sich außerdem von DKT31 (Klein & Tourville 2012, CC BY 4.0) und MIAL67 (Najdenovska et al. 2018, CC BY 4.0) ab. Siehe `public/data/LICENSE.txt`.

Die [MNI-Lizenz](https://github.com/templateflow/tpl-MNI152NLin2009cAsym/blob/master/LICENSE) der Vorlage verlangt folgenden **unveränderten ursprünglichen Lizenzhinweis**; die vorstehenden Erläuterungen sind übersetzt:

Copyright (C) 1993–2004 Louis Collins, McConnell Brain Imaging Centre,
Montreal Neurological Institute, McGill University. Permission to use, copy,
modify, and distribute this software and its documentation for any purpose and
without fee is hereby granted, provided that the above copyright notice appear
in all copies. The authors and McGill University make no representations about
the suitability of this software for any purpose. It is provided “as is” without
express or implied warranty. The authors are not responsible for any data loss,
equipment damage, property loss, or injury to subjects or patients resulting
from the use or misuse of this software package.

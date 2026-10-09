[繁體中文](mra-distal.zh-TW.md) · [简体中文](mra-distal.zh-CN.md) · [English](mra-distal.md) · [Deutsch](mra-distal.de.md) · [日本語](mra-distal.ja.md)

<!-- source-doc: docs/mra-distal.md; sha256: 0d90349629731f2d16e164fcaecdf044aec8c7e3592fe4507a479a3fac629ad8 -->

<a id="individual-mra-distal-vessel-reference"></a>
# Individuelle MRA-Referenz distaler Gefäße

Diese Referenz enthält tatsächlich individuelle, aus MRA abgeleitete arterielle Geometrie von **Bravissima BG0001**, keinen populationsbezogenen Wahrscheinlichkeitsatlas. Die Quelle wandelt BraVa-Rekonstruktionen in individuelle NIfTI-Volumina um und verwendet eine SPM8-Normalisierung auf MNI152. [Projekt und Attribution-Lizenz](https://www.nitrc.org/projects/bravissima/); [Quell-README](https://www.nitrc.org/docman/view.php/1266/78741/Readme43).

Enthalten sind die zentrale pre-Willis/CoW-Gruppe und sämtliche sechs linken/rechten ACA-, MCA- und PCA-Familien. Die Quelle benennt keine einzelnen distalen Äste wie A. angularis oder A. calcarina. Solche Zuordnungen werden nicht erfunden; diese Referenzpunkte besitzen keinen simulierten Perfusions- oder Verschlusszustand eines benannten Astes. Physiologische Pfade, Topologie, Radien und Modellparameter bleiben unverändert.

Im optionalen 3D-Referenzmodus ersetzt die Quellgeometrie die manuell modellierte Gefäßdarstellung. Trefferziele der Simulationsgefäße, Thrombusmarker und Flusspartikel werden ausgeblendet, weil keine Zuordnung zu benannten Ästen besteht. Der Emboluslebenszyklus läuft unsichtbar weiter; ein Wechsel der Anatomieansicht pausiert einen bestehenden Fall daher nicht. Die Gehirnfarben beschreiben weiterhin die aktuelle arterielle Simulation und keine vorhergesagte Läsion in dieser Referenzperson. Der Modus ist zunächst ausgeschaltet und lädt bei Bedarf; bei einem Ladefehler bleibt die Simulationsdarstellung erhalten und ein erneuter Versuch wird angeboten. Fallparameter oder Varianten werden nicht an die Quellperson angepasst.

Familienauswahl und Kameranavigation besitzen Tastatursteuerung, sichtbare Fokusindikatoren und Beschriftungen in fünf Sprachen. Familien ausgeblendeter Hemisphären und vollständig außerhalb der Schnittebene liegende Familien werden aus den Fokuszielen ausgeschlossen. Die Einschränkung der Quellplatzierung bleibt sichtbar, auch wenn die Bedienelemente eingeklappt sind.

<a id="geometry-and-limitations"></a>
## Geometrie und Grenzen

Alle endlichen Voxel mit den Quellfamilienlabels 1–7 bleiben erhalten, einschließlich isolierter Voxel und getrennter Komponenten. Null, NaN und unendliche Werte werden ausgeschlossen. Koordinaten sind nullbasierte Voxelmittelpunkte, transformiert mit der ursprünglichen affinen NIfTI-Matrix. Das 1 mm-Quellvolumen verwendet LAS-Voxelachsen; seine affine Matrix wandelt Indizes in Weltkoordinaten um, wobei positives x rechts liegt. Es wird keine zusätzliche Platzierungstransformation angewendet. Die Registrierung auf das Gehirn MNI152NLin2009cAsym dieses Projekts ist **unvalidiert**.

Die bereitgestellten Liniensegmente verbinden ausschließlich vorhandene beschriftete Voxel in der unmittelbaren 26-Nachbarschaft. Dies ist eine ausdrückliche **Annahme zur Darstellungsnachbarschaft**, nicht der ursprüngliche SWC-Elterngraph. Benachbarte Gefäße können zusätzliche Kanten oder Zyklen erzeugen. Lücken werden nicht überbrückt; Punkte werden weder geglättet, ausgedünnt, neu abgetastet noch verschoben. Das Asset erhält somit die gemessene Quellvoxelgeometrie, ohne einen exakt zusammenhängenden anatomischen Baum oder validierte Identitäten kleiner Äste zu behaupten.

`public/data/mra-distal.json` enthält Punkte, Familienlabels je Punkt, benachbarte Punktindexpaare, Familienzahlen und Komponentenstatistiken. Isolierte Punkte bleiben im Punktarray erhalten, obwohl sie in keinem Segment vorkommen. Das begleitende Herkunfts-JSON dokumentiert die ursprüngliche affine Matrix, Dekodierungsregeln, Quell-README, Lizenz, Hashes und quellenspezifische Annahmen.

<a id="reproduction"></a>
## Reproduktion

Mit installiertem Python, NumPy und nibabel aus dem Repository-Hauptverzeichnis:

```sh
python tools/build_bravissima.py
```

Der Generator prüft die festgelegte SHA256 des vollständigen 12 MB-Quellarchivs, die CRCs des äußeren ZIP, die CRC des ausgewählten verschachtelten ZIP-Eintrags sowie dessen festgelegte SHA256. Verwendet wird das individuelle Gruppenvolumen `srcgBG0001.nii`, nicht die gemittelten Gruppenatlanten. Die Ausgabe ist deterministisch und enthält keine nichtendlichen JSON-Zahlen. Zwischengespeicherte Quelldateien bleiben im ignorierten Verzeichnis `tools/.cache/bravissima/`.

<a id="attribution"></a>
## Quellenangabe

Herron TJ, Dronkers N, Turken AU. *BraVa cerebral artery database converted to NIFTI MRI format* (Poster 2017; nicht begutachtet). [DOI10.7490/f1000research.1114378.1](https://doi.org/10.7490/f1000research.1114378.1).

Ursprüngliches BraVa: Wright et al. *Digital reconstruction and morphometric analysis of human brain arterial vasculature from magnetic resonance angiography*. NeuroImage82 (2013), 170–181. [DOI10.1016/j.neuroimage.2013.05.089](https://doi.org/10.1016/j.neuroimage.2013.05.089); [BraVa](http://cng.gmu.edu/brava).

Die Quelle nennt **Attribution**, ohne eine Creative-Commons-Version festzulegen. Die exakten Quellbedingungen in `public/data/MRA_DISTAL_LICENSE.txt` müssen erhalten bleiben; diese Daten sind von der Softwarelizenz der Anwendung und den TopCoW-Daten unter CC-BY-NC getrennt. Eine Unterstützung durch die Quellautoren wird nicht impliziert.

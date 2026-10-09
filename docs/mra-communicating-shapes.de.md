[繁體中文](mra-communicating-shapes.zh-TW.md) · [简体中文](mra-communicating-shapes.zh-CN.md) · [English](mra-communicating-shapes.md) · [Deutsch](mra-communicating-shapes.de.md) · [日本語](mra-communicating-shapes.ja.md)

<!-- source-doc: docs/mra-communicating-shapes.md; sha256: b5221bd573f65557c3c4049216a9b292f86f3cb7844fd35f33f1e30b9c38588c -->

<a id="mra-derived-communicating-vessel-shapes"></a>
# MRA-abgeleitete Formen kommunizierender Gefäße

Drei dargestellte Kurven kommunizierender Gefäße stammen aus tatsächlich segmentierten MRA-Mittellinien, nicht aus einem Gefäßwahrscheinlichkeitsatlas: TopCoW-MRA-Fall 008, veröffentlicht von Musio et al., *Circle of Willis Centerline Graphs: A Dataset and Baseline Algorithm* (Preprint 2025, [arXiv:2510.13720](https://arxiv.org/abs/2510.13720)), [Datensatz veröffentlicht am 2025-10-15](https://zenodo.org/records/17358162). Quelle und Ableitungen verwenden **CC-BY-NC-4.0**, getrennt von der Software; siehe `src/anatomy/generated/MRA_LICENSE.txt`.

<a id="scope-and-assumptions"></a>
## Umfang und Annahmen

Vorbereitet werden nur die dargestellten Formen der rechten PCom (Label 8), linken PCom (Label 9) und ACom (Label 10). Distale Äste bleiben manuell modelliert. Dies ist weder ein vollständiger Gefäßbaum eines Patienten noch eine validierte Registrierung im MNI-Raum. Physikalische Einheiten und absolute Orientierung der Quelle wurden nicht unabhängig festgestellt. Keine Quelllängen oder -radien werden als physiologische Parameter verwendet.

Jeder gewählte Pfad ist zusammenhängend, azyklisch und zwischen den benannten Quellgrenzen eindeutig. Die PCom-Grenzen berühren die ICA- und PCA-Labels der korrekten Seite. ACom folgt dem ACA-Pfad von rechts nach links; der dritte A2-Seitenast der Quelle wird einschließlich zweier kurzer Kanten mit Label 10 ausdrücklich ausgeschlossen.

Die Platzierung verwendet **eine eigentliche Ähnlichkeitstransformation je Kurve**: Rotation ohne Spiegelung, Translation und einheitliche Skalierung. Einzelne Punkte werden nicht verformt. Eine angenäherte globale Rotation anhand von fünf Landmarken liefert den Ausgangswert für die axiale Orientierung; die MCA-Endpunkte der Quelle entsprechen den M1-Endpunkten des Projekts nur näherungsweise. Jede Kurve richtet anschließend ihre Endpunktachse aus und skaliert einheitlich auf den Abstand der bestehenden Modellanschlüsse. Dies ist eine unvalidierte Darstellungsannahme, keine physikalische anatomische Messung oder Registrierung der Quelle auf die Vorlage.

Als Anschlussanker dienen, soweit vorhanden, die tatsächlich dargestellten Elternpfade, andernfalls die physiologischen Elternpfade. Derzeit besitzen die Anker des ICA-Terminals, der PCA P1 und der ACA A1 keine getrennten Darstellungsüberschreibungen und stimmen mit den vorhandenen Endpunkten der kommunizierenden Pfade überein. Die manuell modellierten dargestellten Verbindungsstücke der tuberothalamischen Tochtergefäße folgen dem Punkt bei halber Bogenlänge der neuen PCom-Polylinie. Nur der erste Punkt jedes Verbindungsstücks ändert sich; die übrigen Punkte bleiben erhalten. Diese Verbindungsstücke sind ausdrücklich als manuell modelliert klassifiziert, nicht als gemessene MRA-Geometrie. Simulationspfade, Topologie, Längen, Radien und Flussparameter bleiben unverändert. Die einheitlichen Skalierungsfaktoren unterscheiden sich zwischen den Kurven und dürfen nicht als gemessene Gefäßabmessungen interpretiert werden.

<a id="reproduction-and-verification"></a>
## Reproduktion und Überprüfung

Mit installiertem Python und NumPy aus dem Repository-Hauptverzeichnis:

```sh
python tools/build_mra_communicating.py
```

Der Generator lädt nur festgelegte ZIP-Einträge mittels HTTP-Bereichsanfragen, wenn diese im ignorierten Cache fehlen. Er prüft Größe, CRC32 und festgelegte SHA256 jedes dekodierten Eintrags. **Die MD5 des gesamten Archivs wurde nicht geprüft.** Ursprünglicher Graph und Knotenbeschreibungen, Quellhashes, Quellpunkt-IDs, Transformationen, Anschlussanker, Variante und Geometrieprüfungen bleiben in `mraCommunicatingAudit.json` erhalten. Der Generator prüft eindeutige Pfade, eigentliche orthogonale Rotationen, exakte Endpunktplatzierung und einheitliche Segmentskalierung. Erzeugte Koordinaten werden auf zehn Dezimalstellen gerundet; dies verändert die physiologische Modellgeometrie nicht.

Öffentliche Formulierung: **MRA-abgeleitete Formen kommunizierender Gefäße; Platzierung unvalidiert; distale Äste manuell modelliert.**

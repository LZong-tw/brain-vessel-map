[繁體中文](THIRD_PARTY_NOTICES.zh-TW.md) · [简体中文](THIRD_PARTY_NOTICES.zh-CN.md) · [English](THIRD_PARTY_NOTICES.md) · [Deutsch](THIRD_PARTY_NOTICES.de.md) · [日本語](THIRD_PARTY_NOTICES.ja.md)

<!-- source-doc: THIRD_PARTY_NOTICES.md; sha256: 4099e9c0792f13faafa0657b11ca785fbdff57f2d0939615c5b999cbf40f7851 -->

<a id="third-party-notices--第三方授權聲明"></a>
# Hinweise zu Drittanbieterrechten

Der **Quellcode** dieses Projekts steht unter MIT (siehe `LICENSE`). Es enthält außerdem **von Drittanbieteratlanten abgeleitete Daten** und verwendet Open-Source-Bibliotheken. Deren Lizenzen und erforderliche Hinweise sind unten aufgeführt. Dieselbe Liste erscheint in der App unter „Quellen und Lizenzen“ und steht in `src/anatomy/sources.ts`.

---

<a id="1-licence-of-the-derived-data--衍生資料的授權"></a>
## 1. Lizenz der abgeleiteten Daten

Dateien: `public/data/brain.json`, `public/data/brain.bin`, `src/anatomy/generated/beds.json`, `src/anatomy/generated/vesselPaths.json` sowie die beim Build in `dist/` gebündelten Kopien.

Die T1-Schnittdaten und abgetasteten arteriellen Labels (`public/data/slices.json` und `public/data/slices.bin.gz`) verwenden dieselbe Datenlizenz und dieselben Hinweise. T1-Intensitäten werden für die Anzeige quantisiert; Liu-Labels verwenden die ungefähre Atlas-Vorlagen-Zuordnung des Projekts. Siehe [Herkunft und Grenzen der Schnittansicht](docs/slices.de.md). Diese Labels beschreiben Referenzterritorien; sie lokalisieren keine individuelle simulierte Läsion.

Diese Dateien sind **bearbeitetes Material** der Atlanten in Abschnitt 2, insbesondere des *Digital 3D Brain MRI Arterial Territories Atlas*, der unter CC BY-SA 4.0 steht. Sie werden deshalb unter **Creative Commons Attribution-ShareAlike 4.0 International** verteilt (<https://creativecommons.org/licenses/by-sa/4.0/>), zusätzlich unter Beachtung des MNI/McGill-Urheberrechtshinweises in Abschnitt 2.1. Wer diese Dateien weiterverteilt oder bearbeitet, muss die folgenden Quellenangaben erhalten und Bearbeitungen unter CC BY-SA 4.0 oder einer kompatiblen Lizenz teilen.

**Änderungen, die für jede folgende Quelle gelten:** Volumina wurden bei Bedarf auf MNI152NLin2009cAsym neu abgetastet/registriert; Oberflächen wurden mit Marching Cubes extrahiert, reduziert und geglättet; Labels wurden zu funktionellen Regionen × arteriellen Territorien kombiniert; Gefäßmittellinien wurden an Maxima der Gefäßwahrscheinlichkeit angepasst und auf die Hirnoberfläche gelegt. Die Originale werden nicht weiterverteilt; `tools/build_assets.py` lädt sie von den folgenden URLs.

Der Anwendungscode, also der übrige Code im Repository, bleibt MIT-lizenziert; die Datendateien sind davon getrennte, gemeinsam ausgelieferte Werke. Für die zusätzlichen MRA-Daten gelten die unten separat genannten Lizenzen.

---

<a id="2-data-sources--資料來源"></a>
## 2. Datenquellen

<a id="21-mni-icbm-152-nonlinear-asymmetric-2009c-template-via-templateflow"></a>
### 2.1 MNI ICBM 152 Nonlinear Asymmetric 2009c template (via TemplateFlow)

Verwendung: Oberflächen von Großhirn, Kleinhirn, Hirnstamm und tiefen Kernen aus T1w-Bild, GM/WM-Wahrscheinlichkeitskarten und der mit der Vorlage vertriebenen FreeSurfer-`aseg`-Segmentierung; Koordinatenraum des gesamten Projekts.

Quelle: <https://www.templateflow.org/> (`tpl-MNI152NLin2009cAsym`), ursprünglich <http://nist.mni.mcgill.ca/icbm-152-nonlinear-atlases-2009/>. Die T1w-Vorlage NLin6Asym unter derselben Lizenz wurde ausschließlich zur Registrierung des Gefäßatlas (2.5) im 2009c-Raum verwendet.

Erforderlicher **unveränderter Originalhinweis**, wörtlich aus der `LICENSE`-Datei der Vorlage übernommen; die umgebenden Erläuterungen sind übersetzt:

> Copyright (C) 1993–2004 Louis Collins, McConnell Brain Imaging Centre, Montreal Neurological Institute,
> McGill University.
> Permission to use, copy, modify, and distribute this software and its documentation for any purpose and
> without fee is hereby granted, provided that the above copyright notice appear in all copies. The authors
> and McGill University make no representations about the suitability of this software for any purpose. It is
> provided "as is" without express or implied warranty. The authors are not responsible for any data loss,
> equipment damage, property loss, or injury to subjects or patients resulting from the use or misuse of this
> software package.

Literaturangaben:

- Fonov V, Evans AC, Botteron K, Almli CR, McKinstry RC, Collins DL. Unbiased average age-appropriate atlases for pediatric studies. *NeuroImage* 2011;54(1):313–327.
- Fonov VS, Evans AC, McKinstry RC, Almli CR, Collins DL. Unbiased nonlinear average age-appropriate brain templates from birth to adulthood. *NeuroImage* 2009;47:S102.
- Ciric R, Thompson WH, Lorenz R, et al. TemplateFlow: FAIR-sharing of multi-scale, multi-species brain models. *Nat Methods* 2022;19:1568–1571.
- Fischl B, et al. Whole brain segmentation: automated labeling of neuroanatomical structures in the human brain. *Neuron* 2002;33:341–355 (FreeSurfer `aseg`).

<a id="22-dkt31-cortical-parcellation-mindboggle"></a>
### 2.2 DKT31 cortical parcellation (Mindboggle)

Verwendung: Zuordnung jedes kortikalen Oberflächenpunkts zu einem Gyrus/einer funktionellen Region.
Datei: `tpl-MNI152NLin2009cAsym_res-02_desc-DKT31_dseg.nii.gz` (TemplateFlow).
Lizenz: **CC BY 4.0** — <https://creativecommons.org/licenses/by/4.0/> (Mindboggle-Daten, <https://mindboggle.info/data>).

- Klein A, Tourville J. 101 labeled brain images and a consistent human cortical labeling protocol. *Front Neurosci* 2012;6:171.

<a id="23-mial67-probabilistic-atlas-of-the-thalamic-nuclei"></a>
### 2.3 MIAL67 probabilistic atlas of the thalamic nuclei

Verwendung: Unterteilung des Thalamus in anteriore, paramediane, ventrolaterale und posteriore arterielle Sektoren.
Datei: `tpl-MNI152NLin2009cAsym_res-01_atlas-MIAL67ThalamicNuclei_dseg.nii.gz` (TemplateFlow).
Lizenz: **CC BY 4.0** laut TemplateFlow-Begleitdatei; Originaldaten <https://doi.org/10.5281/zenodo.1241074>.

- Najdenovska E, Alemán-Gómez Y, Battistella G, et al. In-vivo probabilistic atlas of human thalamic nuclei based on diffusion-weighted magnetic resonance imaging. *Sci Data* 2018;5:180270.

<a id="24-digital-3d-brain-mri-arterial-territories-atlas"></a>
### 2.4 Digital 3D Brain MRI Arterial Territories Atlas

Verwendung: arterielle Territorien jedes Gewebevoxels einschließlich ACA-, MCA- und PCA-Unterteilungen, lentikulostriärer, choroidaler und vertebrobasilärer/zerebellärer Gebiete sowie Grenzzonen. Die Volumina der Perfusionseinheiten in `beds.json` und Territoriumslabels je Vertex in `brain.bin` sind daraus abgeleitet.
Datei: `data/Atlas/ArterialAtlas.nii` aus <https://github.com/Chin-Fu-Liu/Arterial_Atlas>, ebenfalls auf NITRC.
Lizenz: **CC BY-SA 4.0** — <https://creativecommons.org/licenses/by-sa/4.0/>.

- Digital 3D Brain MRI Arterial Territories Atlas © 2021 The Johns Hopkins University.
- Liu CF, Hsu J, Xu X, et al. Digital 3D brain MRI arterial territories atlas. *Sci Data* 2023;10:74.

<a id="25-statistical-atlas-of-cerebral-arteries-mouches--forkert"></a>
### 2.5 Statistical atlas of cerebral arteries (Mouches & Forkert)

Verwendung: Anpassung manuell modellierter arterieller Mittellinien an statistisch reale Positionen und Kontrolle der Radien, etwa Circulus Willisii, A. basilaris, Vertebralarterien, M1/M2, A1/A2 und P1/P2.
Dateien: *Vessel Occurrence Probability Atlas* (figshare 7026179) und *Average vessel radius atlas* (figshare 7026185), Sammlung <https://doi.org/10.6084/m9.figshare.c.4215089>.
Lizenz: **CC0 1.0** (Widmung an die Gemeinfreiheit). Quellenangabe aus Höflichkeit:

- Mouches P, Forkert ND. A statistical atlas of cerebral arteries generated using multi-center MRA datasets from healthy subjects. *Sci Data* 2019;6:29.

---

<a id="3-open-source-projects-consulted-no-code-copied--參考的開源專案未複製程式碼"></a>
## 3. Berücksichtigte Open-Source-Projekte: kein Code kopiert

| Projekt | Lizenz | Übernommene Informationen |
|---|---|---|
| [openBF](https://github.com/INSIGNEO/openBF) (INSIGNEO) | Apache-2.0 | Gefäßradien/-längen des Circulus-Willisii-Modells von Alastruey 2007 als Referenzwerte: Fakten aus der veröffentlichten Arbeit, kein Code oder Dateien kopiert. |
| [WillisWorks](https://github.com/abhogal-lab/WillisWorks) | GPL-3.0 | Nur Ideen zur Darstellung von Autoregulation, Steal und Kollateralfluss. Kein Code verwendet; GPL-3.0 ist nicht mit der MIT-Lizenz dieses Projekts kompatibel. |
| [neuroaxis-atlas](https://github.com/linkbag/neuroaxis-atlas) | MIT | Hirnstammsyndrom-Karten und Quellenangaben beeinflussten unsere Darstellung. |
| [brain-game](https://github.com/Rickaym/brain-game) | MIT (Code); Modell CC BY-SA 2.1 JP | Ideen zur Zuordnung von Regionen und Arterien sowie Schlaganfallsimulation. Das 3D-Modell wird hier **nicht** verwendet. |

Die manuell angelegten Anatomiedefinitionen, Regeln und der Anwendungscode wurden für dieses Projekt geschrieben; erzeugte Atlasdaten und die folgenden MRA-abgeleiteten kommunizierenden Gefäßformen sind Ausnahmen mit Drittanbieterherkunft.

<a id="topcow-mra-derived-communicating-vessel-shapes"></a>
### TopCoW: MRA-abgeleitete Formen kommunizierender Gefäße

`src/anatomy/generated/mraCommunicatingPaths.json` und `mraCommunicatingAudit.json` enthalten Quell- und bearbeitete Daten von Musio et al., *Circle of Willis Centerline Graphs: A Dataset and Baseline Algorithm* (Preprint 2025, arXiv:2510.13720), TopCoW-Datensatz veröffentlicht am 2025-10-15, MRA-Fall 008. Quelle: <https://zenodo.org/records/17358162>.

Diese Quell- und abgeleiteten Daten stehen unter **CC BY-NC 4.0**, getrennt von MIT-Software und CC-BY-SA-Atlasassets: <https://creativecommons.org/licenses/by-nc/4.0/>. Quellenangabe ist erforderlich; kommerzielle Nutzung benötigt eine separate Erlaubnis. Unterstützung durch die Autoren wird nicht impliziert. Ursprünglicher Quellgraph und Knotenmetadaten bleiben in der Prüfdatei erhalten.

Änderungen: Extraktion der rechten/linken PCom und des ACom-Hauptpfads; Ausschluss des dritten A2-Seitenasts; eigentliche Rotationen, Translationen und einheitliche Skalierungen zu bestehenden Modellanschlüssen. Die enthaltenen tuberothalamischen Verbindungsstücke sind manuell modellierte Darstellungsgeometrie mit aktualisierten Anfangspunkten. Platzierung bleibt unvalidiert, distale Äste bleiben manuell modelliert, Simulationsgeometrie und Parameter unverändert. Siehe [quellenspezifische Annahmen](docs/mra-communicating-shapes.de.md) und `src/anatomy/generated/MRA_LICENSE.txt`.

---

<a id="4-runtime-libraries-bundled-into-the-site--打包進網站的函式庫"></a>
## 4. In die Website gebündelte Laufzeitbibliotheken

<a id="additional-individual-distal-mra-reference-data"></a>
### Zusätzliche individuelle distale MRA-Referenzdaten

`public/data/mra-distal.json` leitet sich von Bravissima BG0001 ab, SPM-normalisierten individuellen BraVa-Arteriendaten. Das [Quell-README](https://www.nitrc.org/docman/view.php/1266/78741/Readme43) nennt Attribution ohne Creative-Commons-Version; exakte Bedingungen stehen in `public/data/MRA_DISTAL_LICENSE.txt`. Diese Datenlizenz ist vom MIT-Code getrennt.

Herron TJ, Dronkers N, Turken AU, *BraVa cerebral artery database converted to NIFTI MRI format*, Poster 2017, [DOI10.7490/f1000research.1114378.1](https://doi.org/10.7490/f1000research.1114378.1).
Original-BraVa: Wright et al., *Digital reconstruction and morphometric analysis of human brain arterial vasculature from magnetic resonance angiography*, NeuroImage82, 170–181 (2013), [DOI10.1016/j.neuroimage.2013.05.089](https://doi.org/10.1016/j.neuroimage.2013.05.089), [BraVa](http://cng.gmu.edu/brava), [Bravissima](https://www.nitrc.org/projects/bravissima/).

Änderungen: Erhaltung aller endlichen familienbeschrifteten Quellvoxelmittelpunkte, Anwendung der affinen Quellmatrix und Verbindung unmittelbarer 26-Nachbarn für die Darstellung. Diese Nachbarschaftsannahme ist nicht der ursprüngliche Elterngraph. Lücken bleiben erhalten; es werden weder Zuordnungen zu benannten distalen Ästen noch Änderungen physiologischer Parameter abgeleitet. Die Registrierung auf dieses Gehirn ist unvalidiert. Siehe [quellenspezifische Annahmen](docs/mra-distal.de.md).

| Paket | Lizenz |
|---|---|
| react, react-dom | MIT |
| three | MIT |
| @react-three/fiber | MIT |
| @react-three/drei | MIT |
| three-stdlib (über drei) | MIT |
| zustand | MIT |
| react-reconciler, scheduler, its-fine, suspend-react, react-use-measure, use-sync-external-store (Abhängigkeiten der obigen Pakete) | MIT |

Die MIT-Lizenz verlangt, dass Kopien den Urheberrechtshinweis enthalten: Vollständige Texte stehen in der `LICENSE`-Datei jedes Pakets (`node_modules/<package>/LICENSE`); die Bundles erhalten die jeweiligen `@license`-Kommentare. Build-/Testwerkzeuge wie Vite, Vitest, TypeScript, ESLint, jsdom und Testing Library werden nicht an Nutzer ausgeliefert.

Python-Werkzeuge ausschließlich zur Asset-Neuerstellung, nicht ausgeliefert: NumPy, SciPy, nibabel, scikit-image, trimesh, fast-simplification, SimpleITK; jedes unter seiner eigenen Open-Source-Lizenz (BSD/MIT/Apache-2.0).

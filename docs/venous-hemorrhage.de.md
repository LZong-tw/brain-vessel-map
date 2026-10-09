[繁體中文](venous-hemorrhage.zh-TW.md) · [简体中文](venous-hemorrhage.zh-CN.md) · [English](venous-hemorrhage.md) · [Deutsch](venous-hemorrhage.de.md) · [日本語](venous-hemorrhage.ja.md)

<!-- source-doc: docs/venous-hemorrhage.md; sha256: e0922c1f8253a0404e08719c68cbf78f9f92bcb71e85efe5bdc7a99f3a4fc835 -->

<a id="venous-outflow-and-observed-hematoma-pressure"></a>
# Venöser Abfluss und Druck durch beobachtetes Hämatomvolumen

Diese unabhängigen Forschungsrechner erscheinen unter „Details“. Sie verändern weder den aktuellen arteriellen Fall noch Gewebeschäden, Symptome, 3D-Geometrie oder Schnittansichten. Alle klinischen Eingaben sind zunächst leer. Radiusverhältnisse beginnen bei 1, einer normalisierten offenen Referenzkonfiguration und keiner Patientenmessung.

<a id="reduced-venous-network"></a>
## Reduziertes venöses Netzwerk

Die Quelle ist Marcotti et al. (2015), [DOI 10.1186/s12883-015-0352-y](https://doi.org/10.1186/s12883-015-0352-y). Das stationäre Netzwerk verwendet Poiseuille-Widerstände und veröffentlichte Gefäßgeometrie. Der Artikel verwendet CC BY 4.0; die Daten sind CC0, soweit nicht anders angegeben. Das beschaffte ältere Geometrie-DOCX hat SHA-256 `d9254e9f2a4208fad9ab2261f537502d126607997f544c4d8bae0cdbfb172207`. Der [ältere Anhang](https://static-content.springer.com/esm/art%3A10.1186%2Fs12883-015-0352-y/MediaObjects/12883_2015_352_MOESM1_ESM.docx) liefert folgende Längen und Durchmesser in cm:

| Gefäß | Länge | Durchmesser |
|---|---:|---:|
| Sinus sagittalis superior | 19.22 | 0.45 |
| Sinus rectus | 3.96 | 0.17 |
| Jeder Sinus transversus | 5.25 | 0.88 |
| Jeder Sinus sigmoideus | 12.25 | 0.53 |
| Jede V. jugularis interna | 15 | 1.7 |

Die Quellviskosität ist 3 cP (0.003 Pa·s). Der Widerstand ist `128 × viscosity × length / (π × diameter⁴)`, intern mit SI-Dimensionen. Der Durchmesser wird für den Radius halbiert. Der veröffentlichte Auslasswert null ist eine relative Druckreferenz, kein zentralvenöser Patientendruck.

Die Anwendung reduziert dieses Netzwerk auf acht Kanten: Sinus sagittalis superior und Sinus rectus münden in einen Zusammenfluss, anschließend führen beidseitige Sinus transversus, Sinus sigmoideus und Vv. jugulares internae zu einem gemeinsamen Auslass. Zusätzliche spinale und kollaterale Wege der Quelle werden weggelassen. Dies reproduziert weder das vollständige veröffentlichte Netzwerk noch dessen Validierungsergebnisse.

Der Nutzer gibt den gesamten zerebralen venösen Fluss, den in den Sinus rectus eintretenden Anteil und den gemeinsamen Auslassdruck ein. Der tiefe Anteil liegt in [0, 1]. Jedes verbleibende Lumenradiusverhältnis liegt in [0, 1]. Bei fester Geometrie und Viskosität skaliert die Leitfähigkeit mit der vierten Potenz dieses Verhältnisses. Ein eingegebenes Verhältnis als Thrombosewirkung zu interpretieren, ist eine Annahme und keine Skala der Thrombuslast. Aus der Arbeit wird kein klinischer Standardwert für Zufluss oder Auslassdruck abgeleitet.

Die Berechnung setzt einen stationären Zufluss vor und löst Drücke und beidseitige Drainage. Sie nimmt starre Gefäße, laminaren Fluss und feste Viskosität an. Venöser Druck wird nicht an die zerebrale arterielle Perfusion zurückgekoppelt; Gefäßkollaps, Compliance, Rekanalisation, Gewebeschädigung und klinischer Ausgang werden nicht modelliert. Weggelassene Kollateralwege können die Reaktion auf eine Obstruktion verändern.

Kann der vorgegebene Fluss eine getrennte Komponente nicht verlassen, existiert keine endliche stationäre Drucklösung. Gemeldet wird ein getrenntes Modell, kein unendlicher ICP eines Patienten. In einer getrennten Komponente ohne Fluss ist der Druck unbestimmt. Numerischer Überlauf wird ausdrücklich gemeldet statt durch einen begrenzten Druck ersetzt.

<a id="observed-hematoma-pressure-effect"></a>
## Druckwirkung eines beobachteten Hämatoms

Die Druck-Volumen-Beziehung folgt Marmarou et al. (1978), [DOI 10.3171/jns.1978.48.3.0332](https://doi.org/10.3171/jns.1978.48.3.0332):

```text
ICP = baselineICP × 10^(observedAddedHematomaVolume / enteredPVI)
CPP = enteredMAP − ICP
```

PVI ist das Volumen, das in dieser Beziehung einen zehnfachen Druckanstieg bewirkt. Volumen und PVI verwenden mL; ICP und MAP verwenden mmHg. Das zusätzliche Volumen muss nichtnegativ sein; ursprünglicher ICP, PVI und MAP müssen positiv sein. Das eingegebene zusätzliche Volumen ist beobachtet und wird nicht vom getrennten ICH-Vergrößerungsrisikorechner vorhergesagt.

Das ursprüngliche Modell wurde experimentell bei Katzen validiert. Eine spätere Erwachsenenstudie berichtete PVI 25.9 ± 3.7 mL bei sieben Erwachsenen ohne raumfordernde Läsionen ([Shapiro et al., 1980](https://doi.org/10.1002/ana.410070603)); diese kleine, andere Population liefert Kontext, keinen Standardwert oder zulässigen Bereich.

Die sofortige Anwendung der Beziehung auf Hämatomvolumen in einem festen Kompartiment ist **für intrazerebrale Blutungen unvalidiert**. Der Rechner modelliert weder Liquorverdrängung oder Reserve noch dynamischen kompensierten Fluss, Ödem, Läsionsgrenzen, Symptome, Behandlungseffekte oder klinischen Ausgang. Ein negativer CPP bezeichnet einen negativen Druckgradienten in dieser skalaren Berechnung; er sagt keinen negativen Blutfluss vorher. Überlauf ist ein numerischer Status und keine klinische Druckschätzung.

<a id="remaining-work"></a>
## Verbleibende Arbeit

Räumliche venöse Infarzierung, hämorrhagische Läsionen, Symptome und dynamische Kopplung bleiben außerhalb dieser Rechner. Der Abschlussumfang der ROADMAP betrifft ausschließlich reduzierten Abfluss und die Druckberechnung aus beobachtetem Volumen.

<a id="spatial-coupling-source-audit"></a>
## Quellenprüfung zur räumlichen Kopplung

Zugang und Bedeutung der Labels wurden am 2026-10-09 anhand der offiziellen Quellen geprüft. Eine Lösung des Abflussdrucks allein kann geschädigte Voxel nicht bestimmen: Sie liefert weder patientenspezifische venöse Drainagegebiete noch den Verlauf von Perfusion, Sauerstoffversorgung, Thrombose, Kollateralrekrutierung und Gewebeschädigung. Aus dem Netzwerk wird keine Druck-Schädigungs-Schwelle oder Läsionsgrenze abgeleitet. Es wurden keine gepaarten CVST-Druck-/Abflussmessungen, Läsionsmasken, Zeitangaben und geprüfte Vorlagenregistrierung für diese Kopplung identifiziert.

- [PhysioNet CT-ICH v1.3.0](https://physionet.org/content/ct-ich/1.3.0/) behält CC BY 4.0-Metadaten, erklärt aber ausdrücklich, dass seine Dateien nicht mehr verfügbar sind. [v1.3.1](https://physionet.org/content/ct-ich/1.3.1/) verlangt Registrierung und eine Vereinbarung für eingeschränkte Gesundheitsdaten. Es werden keine eingeschränkten Dateien oder inoffiziellen Spiegel verwendet. Die Kohorte umfasst traumatische Hirnverletzungen mit gemischten Blutungssubtypen und ist keine Validierungskohorte für den Druck spontaner ICH.
- [PHE-SICH-CT-IDS v4](https://doi.org/10.6084/m9.figshare.23957937.v4) ist unter CC BY 4.0 aus dem offiziellen Figshare-Eintrag verfügbar. Die [Originalpublikation](https://doi.org/10.1016/j.compbiomed.2024.108342) nennt Labels des **perihämatomalen Ödems**, keine Hämatomsegmentierungen. Eine bereichsbasierte Archivprüfung verifizierte die ZIP-CRCs des nativen CT und der binären Maske von Fall 0001. Beide haben Dimensionen 512 × 512 × 32, übereinstimmende affine Matrizen und CT-Voxelabstand 0.5078125 × 0.5078125 × 5 mm. Die Maske enthält 7,962 positive Voxel, entsprechend einem geometrischen Volumen der beschrifteten Region von 10.265945434570312 mL. Dies ist **Volumen der Ödemregion, weder Blutvolumen noch netto hinzugefügtes Wasser**. Es wird nicht an den PVI-Rechner übergeben. Daraus werden keine Vorlagenregistrierung oder klinischen Schädigungslabels hergestellt.
- [Offizielles BHSD-Repository](https://github.com/White65534/BHSD): Es nennt Einschränkungen auf nichtkommerzielle Nutzung ohne Ableitungen und verbietet Änderungen für einen anderen Datensatz. Diese Rechte erlauben keine Verteilung transformierter Masken als neue Assets der Anwendung.
- [Offizielle Teilnahmebedingungen von INSTANCE](https://instance.grand-challenge.org/Participation/) verlangen eine unterzeichnete Datenvereinbarung, beschränken die Nutzung auf die Challenge und verbieten ausdrücklich Weiterverteilung und andere Nutzungen. Es wurden keine Annotationen beschafft.

Die geprüfte Figshare-Archivdatei ist `63081925`, `PHE-SICH-CT-IDS.zip`, 1,300,209,108 Bytes. Der Herausgeber nennt MD5 `a2c3f32f11478167b975d5036edbb510`; das vollständige Archiv wurde nicht heruntergeladen, daher wurde dieser Gesamtdigest nicht unabhängig geprüft. Hashes der extrahierten Fälle:

| Quelleintrag | SHA-256 |
|---|---|
| `SubdatasetA_NIFIT/NIFIT/set/0001.nii.gz` | `152328fd8bcee0467544bc24630decdf0ea3955440e074f98e621aa382825f7d` |
| `SubdatasetA_NIFIT/NIFIT/label/0001.nii.gz` | `287e3622f24195c08baf7f296d0c679402f3e1a6e64912194ef5ec18bbd421c2` |

Die Darstellung beobachteter Masken verlangt ausdrückliche Labelsemantik, physikalische Einheiten und Ausrichtung von Bild und Maske. Die Kopplung einer Maske an anatomische Defizitregeln benötigt außerdem eine geprüfte Atlastransformation und Evidenz, dass das Label die relevante Schädigung bezeichnet. Diese Prüfungen liefert keine Druckformel.

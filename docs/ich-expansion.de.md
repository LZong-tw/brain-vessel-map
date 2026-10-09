[繁體中文](ich-expansion.zh-TW.md) · [简体中文](ich-expansion.zh-CN.md) · [English](ich-expansion.md) · [Deutsch](ich-expansion.de.md) · [日本語](ich-expansion.ja.md)

<!-- source-doc: docs/ich-expansion.md; sha256: 6ae6e4bffde2e867fabff79d3bfdf546f13652f2dc46d03bf51cae51cf75bddc -->

<a id="intracerebral-hemorrhage-expansion-risk"></a>
# Risiko einer Vergrößerung der intrazerebralen Blutung

Dieser separate didaktische Rechner reproduziert das Modell mit vier Prädiktoren von Al-Shahi Salman et al., *Lancet Neurology* (2018), [DOI 10.1016/S1474-4422(18)30253-9](https://doi.org/10.1016/S1474-4422(18)30253-9). Die [Verlags-PDF](https://www.pure.ed.ac.uk/ws/portalfiles/portal/74826881/PIIS1474442218302539.pdf) beschreibt die Einschlusskriterien auf Seite 3 sowie Gleichung und Validierung auf Seite 7. Der Rechner ist unabhängig von der arteriellen Infarktsimulation.

<a id="published-equation"></a>
## Veröffentlichte Gleichung

```text
PI = -4.426 - 0.230 * t - 0.0776 * V
     + 1.196 * sqrt(V) + 0.310 * A + 1.065 * C
p = 1 / (1 + exp(-PI))
```

`t` ist die Zeit vom Symptombeginn bis zur Ausgangsbildgebung in Stunden. `V` ist das Hämatomvolumen auf dieser Ausgangsuntersuchung in mL. `A` und `C` erfassen unabhängig voneinander eine Thrombozytenaggregationshemmung beziehungsweise Antikoagulation zum Symptombeginn: Ja ist 1, Nein ist 0. Sie erfassen keine später verabreichte oder abgesetzte Medikation. Unbekannte Eingaben stehen nicht für null; es werden keine klinischen Vorgabewerte oder Grenzen für Risikokategorien ergänzt.

Die Quelle definiert die Vergrößerung als Zunahme um „mehr als 6 mL“ zwischen Ausgangs- und Kontrollbildgebung. Die Kontrollbildgebung erfolgte weniger als sechs Tage nach Beginn; bei mehr als 80% der Patienten erfolgte sie innerhalb von 48 Stunden. Die Ausgabe ist deshalb keine Wahrscheinlichkeit für ein festes 24-Stunden-Intervall.

<a id="population-and-input-domain"></a>
## Population und Eingabebereich

Die Quelle schloss Erwachsene ab 18 Jahren mit spontaner, nichttraumatischer intrazerebraler Blutung ein, die wahrscheinlich auf eine zerebrale Erkrankung kleiner Gefäße zurückging, ohne in der Bildgebung festgestellte zugrunde liegende strukturelle Ursache. Die Ausgangsuntersuchungen erfolgten 0.5 bis 24 Stunden nach Beginn; das ursprüngliche Hämatomvolumen lag unter 150 mL. Der Rechner verlangt ein positives gemessenes Volumen unter 150 mL und eine bekannte Bildgebungszeit innerhalb dieses einschließlich der Grenzen gültigen Zeitfensters.

Ausgeschlossen waren Patienten mit einer Akutbehandlung, die das Hämatomvolumen verringern könnte: operative Ausräumung, hämostatische Therapie oder Blutdrucksenkung. Die Gleichung kann die Wirkung dieser Behandlungen nicht schätzen. Sie lässt sich nicht analog auf traumatische Blutungen, strukturelle Gefäßläsionen, hämorrhagische Transformationen, venöse Blutungen oder Duret-Blutungen übertragen.

Die Medikationsprädiktoren sind die veröffentlichten binären Indikatoren. Das Modell liefert keinen wirkstoffspezifischen Koeffizienten und begründet keine spezifische Kalibrierung für DOAC.

<a id="validation-and-interpretation"></a>
## Validierung und Interpretation

Das Modell mit vier Prädiktoren wurde anhand von 2,381 Patienten aus zehn Kohorten entwickelt, mit einem C-Index von 0.75 (95% CI 0.73–0.78), und anhand von 895 Patienten aus fünf Kohorten validiert, mit einem C-Index von 0.74 (0.71–0.78). Die Autoren berichteten eine gute Kalibrierung. Die vollständige geeignete Metaanalyse umfasste 5,435 Patienten aus 36 Kohorten; diese größere Zahl ist nicht die Entwicklungsstichprobe des Modells.

Dies ist eine Schätzung des Vergrößerungsrisikos in der Quellpopulation. Sie sagt weder den Umfang der Volumenzunahme noch Ort oder Grenze einer Läsion, Symptome, mRS oder Behandlungsvorteil vorher. Sie fügt den 3D- oder Schnittansichten kein Blut und keine Gewebeschädigung hinzu. Die Reproduktion der Gleichung ist von der Validierung der Anwendung als klinisches Entscheidungsinstrument zu unterscheiden.

<a id="remaining-source-checks-for-the-roadmap"></a>
## Noch offene Quellenprüfungen für die ROADMAP

- **Venöser Druck/Abfluss:** [Marcotti 2015](https://pmc.ncbi.nlm.nih.gov/articles/PMC4476203/) liefert ein stationäres Poiseuille-Netzwerk und veröffentlichte Geometrie. Der ältere Geometrieanhang wurde inzwischen beschafft und für einen reduzierten Rechner mit acht Kanten übertragen. Zufluss, Anteil der tiefen Drainage und Auslassdruck werden vom Nutzer eingegeben, statt ungeprüfte Vorgabewerte zu erhalten. Siehe [Modelle für venösen Abfluss und Blutungsdruck](venous-hemorrhage.de.md) zu Quellenherkunft und verbleibenden Grenzen. Dadurch entstehen keine venösen Läsionen.
- **Spinale Erholung:** [Robertson 2012](https://pmc.ncbi.nlm.nih.gov/articles/PMC3466672/) dokumentiert die langfristige funktionelle Erholung anhand von Kohortenergebnissen; eine kontinuierliche Erholungskurve der Defizite von C1–C3 liefert die Studie nicht. Eine quantitative Zuordnung dieser Ergebnisse zu diesem Modell bleibt unbestimmt.
- **Kalibrierung:** [DEFUSE 3](https://pmc.ncbi.nlm.nih.gov/articles/PMC6628906/) liefert Verteilungen der Infarkte nach Kollateralgruppen, während [Wilson 2023](https://pmc.ncbi.nlm.nih.gov/articles/PMC10169426/) Sprachverläufe nach Läsionsgruppen beschreibt. Die Zuordnung dieser ausgewählten Kohorten und gemessenen Ergebnisse zu Modellleitfähigkeiten oder Läsionsanteilen bleibt ungeprüft; ihre zusammenfassenden Statistiken ersetzen diese Parameter nicht unmittelbar.
- **Zentrale Herniation:** [Ropper 1993](https://pmc.ncbi.nlm.nih.gov/articles/PMC1015157/) und [Wijdicks 1997](https://pubmed.ncbi.nlm.nih.gov/9153493/) beschreiben sekundäre Schäden ohne Gleichung aus Verlagerung und Dauer für den geschädigten Gewebeanteil. Eine automatische Erzeugung dieses Anteils würde eine nicht belegte Kalibrierung ergänzen.
- **MRA-Gefäßersatz:** Die Quelleinträge von TopCoW MRA008 und die CC BY-NC 4.0-Lizenz sind für drei dargestellte Formen kommunizierender Gefäße geprüft. Die Platzierung bleibt unvalidiert; distale Äste bleiben manuell modelliert. [Quellenspezifische Herkunft und Annahmen](mra-communicating-shapes.de.md) unterscheiden gemessene Formen von manuell modellierten Verbindungsstücken und der Simulationsgeometrie.

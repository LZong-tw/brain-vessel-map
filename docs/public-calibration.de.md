[繁體中文](public-calibration.zh-TW.md) · [简体中文](public-calibration.zh-CN.md) · [English](public-calibration.md) · [Deutsch](public-calibration.de.md) · [日本語](public-calibration.ja.md)

<!-- source-doc: docs/public-calibration.md; sha256: d2bc8f773b6549e7a673e96f65e0bd775b9ed5d44d56d63f2ed385749a304fff -->

<a id="experimental-public-data-calibration"></a>
# Experimentelle Kalibrierung mit öffentlichen Daten

Die Kalibrierungswerkbank unter „Details“ versucht eine illustrative Anpassung des vorderen Kreislaufs an veröffentlichte zusammenfassende Beobachtungen des Infarktwachstums. **Die versuchte Kalibrierung wird verworfen:** Die angepassten Faktoren kehren die erwartete Reihenfolge der Kollateralqualität um, ein Wachstumsziel ist unerreichbar, und alle Ausgangsvolumina weichen erheblich von der unabhängigen Referenz ab. Die Werkbank ist ein experimentelles Diagnoseinstrument, kein neues gültiges Kollateralprofil. Ihre Kandidatenfaktoren bleiben von der Standardsimulation getrennt.

<a id="published-observations"></a>
## Veröffentlichte Beobachtungen

[MacLellan et al., online veröffentlicht 2021, Zeitschriftenausgabe 2022](https://doi.org/10.1016/j.jstrokecerebrovasdis.2021.106208) analysierten 84 nicht reperfundierte DEFUSE-3-Teilnehmer aus beiden Behandlungsarmen. Das Infarktwachstum wurde zwischen Ausgangsbildgebung und Bildgebung 24 Stunden nach Randomisierung gemessen. Die veröffentlichten medianen Zunahmen waren:

| Ursprüngliches Perfusionsprofil | Medianes Wachstum, mL |
| --- | ---: |
| Sowohl HIR als auch CBV-Index günstig | 21.7 |
| Einer günstig | 40.9 |
| Keiner günstig | 108.2 |

Die Analyse klassifizierte HIR ab 0.34 und CBV-Index bis einschließlich 0.74 als ungünstig. Diese Bildgebungsmessungen entsprechen nicht der Kollateraleinstellung gut/mittel/schlecht der App. Die Zuordnung ihrer geordneten Gruppen zu den drei App-Graden ist eine ausdrückliche Modellannahme. Das [Abstract des Originalverlags](https://www.strokejournal.org/article/S1052-3057%2821%2900613-3/abstract) liefert die zusammenfassenden Beobachtungen; individuelle Verläufe und eine patientenbezogene Verteilung werden nicht rekonstruiert.

<a id="borrowed-clock-and-representative-geometry"></a>
## Übernommene Zeitachse und repräsentative Geometrie

Die Werkbank benötigt verstrichene Zeiten, die nicht für jede MacLellan-Untergruppe angegeben werden. Sie übernimmt die ursprünglichen Mediane des medikamentösen DEFUSE-3-Arms aus Tabelle 1 von [Albers et al., 2018](https://doi.org/10.1056/NEJMoa1713973), verfügbar in dieser [Kopie der Originalarbeit](https://paramedics.org/storage/news/Albers%20et%20al.pdf). Dieser Arm umfasste 90 Teilnehmer: Vom Beginn bis zur qualifizierenden Bildgebung vergingen 9 Stunden 55 Minuten, bis zur Randomisierung 10 Stunden 44 Minuten. Mit der vorgegebenen Kontrolle nach 24 Stunden ergibt sich ein repräsentativer Endpunkt von 34 Stunden 44 Minuten nach Beginn. Das Modellwachstum ist das Infarktvolumen am Endpunkt abzüglich des Infarktvolumens bei der Ausgangsbildgebung.

Dies sind Mediane des ursprünglichen medikamentösen Arms, keine Zeitmessungen der Analyse von 84 nicht reperfundierten Personen oder ihrer drei Perfusionsgruppen. Die Kombination der Mediane erzeugt eine angenommene repräsentative Zeitachse, keinen beobachteten gepaarten Verlauf. Der Endpunkt darf nicht als 24 Stunden nach Beginn beschrieben werden.

Die Geometrie ist der isolierte rechte M1-Verschluss des Projekts (`M1_r`), bei MAP 93 mmHg und ohne anatomische Varianten. Dieses vollständige Modellterritorium als repräsentativ für die heterogene Studienpopulation zu behandeln, ist eine weitere ausdrückliche Annahme. Die mediane Perfusionsläsion von 116.1 mL im medikamentösen Arm definiert weder dieses Modellterritorium noch seine spätere Infarktgrenze. Der mediane ursprüngliche ischämische Kern von 10.1 mL ist eine unabhängige Referenz zur Gegenprüfung: Er wird nicht angepasst, und jede Abweichung vom modellierten Ausgangswert muss sichtbar bleiben.

<a id="what-is-fitted"></a>
## Was angepasst wird

Nur der Leitfähigkeitsfaktor benannter Kollateralen, G, wird für jedes geordnete zusammenfassende Ziel variiert. Die reine Forschungs-API überschreibt den ursprünglichen `COLL_GRADE`-Faktor für jedes benannte Gefäß mit `kind: 'collateral'`, einschließlich zerebellärer und extrakranieller Kollateralgefäße. Verborgene `BRAINSTEM_PIAL`-Verbindungen behalten ihre ursprüngliche gradabhängige Leitfähigkeit. Bestehende Gewebeschwellen und Zeitkonstanten bleiben fest. Diese breite Faktorüberschreibung liefert keine Kalibrierungsevidenz für den hinteren Kreislauf: Die Läsion des Experiments bleibt ein isolierter rechter M1-Verschluss. Die getrennte Forschungs-API lässt gewöhnliche Simulationseingaben und Standardwerte unverändert. Tests reproduzieren Berechnung und Verwerfung; ihr Bestehen bedeutet keine klinische Kalibrierung des Modells.

<a id="rejected-fit-result"></a>
## Ergebnis der verworfenen Anpassung

Die versuchte Anpassung unter der angegebenen Geometrie und Zeitachse liefert folgende Modellausgaben. Die Abweichung ist das modellierte Wachstum abzüglich des veröffentlichten Ziels; angezeigte Werte sind gerundet.

| Veröffentlichte Perfusionsgruppe | Kandidaten-G | Modellierter Ausgangswert, mL | Modelliertes Wachstum, mL | Wachstumsabweichung, mL |
| --- | ---: | ---: | ---: | ---: |
| Beide günstig | 0.097422832 | 274.995 | 21.7000004 | ungefähr 0 |
| Einer günstig | 0.259092893 | 255.489 | 40.9000072 | ungefähr 0 |
| Keiner günstig | 0.819373662 | 172.040 | 81.916233 | −26.283767 |

Den weniger günstigen veröffentlichten Gruppen wird ein höherer Kandidaten-G zugeordnet. Dies widerspricht der beabsichtigten Interpretation der Kollateralqualität. Ein großer Teil der modellierten Infarzierung ist bei der spät angenommenen Ausgangszeit bereits erfolgt: Eine Verringerung von G verstärkt die ursprüngliche Schädigung und lässt im gemessenen Intervall weniger verbleibendes Wachstumsvolumen übrig. Zwei passende Wachstumsdifferenzen verdecken daher sehr große Ausgangsfehler. Keiner der modellierten Ausgangswerte nähert sich der unabhängigen Referenz von 10.1 mL, und das Wachstumsziel von 108.2 mL wird nicht erreicht.

Diese Fehler verwerfen die vorgeschlagene Kalibrierung aus Geometrie, Zeitachse und ausschließlich G gemeinsam. Sie belegen weder eine physiologische Umkehr des Kollateralnutzens noch rechtfertigen sie eine Änderung von Gewebekonstanten, um eine Anpassung zu erzwingen, noch validieren sie ein Ersatzprofil als Standard. Eine vertretbare Kalibrierung benötigt zusätzliche Messungen und eine besser belegte Darstellung der Population und Geometrie.

Ein angepasster Punkt ist keine eindeutig identifizierte physiologische Leitfähigkeit. Verschlussgeometrie, Blutdruck, Kollateralarchitektur und Gewebekinetik können denselben Volumenendpunkt beeinflussen. Drei zusammenfassende Mediane liefern weder Unsicherheitsintervalle für G noch Patientenvariabilität, unabhängige Validierung oder eine kalibrierte Wachstumskurve zwischen Messungen. Die Werkbank muss Anpassungsabweichungen und den Vergleich mit der Ausgangsreferenz ohne implizierte klinische Genauigkeit berichten. Die Arbeiten liefern weder eine synthetische Patientenverteilung noch eine Behandlungseffektschätzung, eine Umrechnung in funktionelle Ergebnisse oder eine Läsionsgrenze.

<a id="remaining-calibration-scope"></a>
## Verbleibender Kalibrierungsumfang

Dieses Experiment kalibriert weder den hinteren Kreislauf oder Basilarisverschlüsse über zwei Segmente noch Schädigungskinetiken von Kleinhirn oder Medulla, lakunäre Schädigungskinetiken, die 48-Stunden-Konvention für die Penumbra, anatomische Symmetrie des Circulus Willisii und der Arterien der hinteren Schädelgrube oder die getrennten posterior-parietalen, temporo-okzipitalen und temporalen leptomeningealen Anastomosen neu. Diese Bereiche bleiben unvalidiert und behalten ihre bestehenden Annahmen. Eine Erweiterung der Anpassung benötigt ausdrückliche zusätzliche Evidenz und Tests; eine zusammenfassende Anpassung des vorderen Kreislaufs darf nicht übertragen werden, als validiere sie diese Bereiche.

<a id="additional-early-growth-attempt-not-adopted"></a>
## Zusätzlicher Versuch zum frühen Wachstum: nicht übernommen

[Wheeler et al. (2015)](https://pmc.ncbi.nlm.nih.gov/articles/PMC4478123/) beschreibt anfängliches Wachstum als ursprüngliches Infarktvolumen geteilt durch Zeit vom Beginn bis zur Bildgebung, nicht als momentane Ableitung. Die M1-Untergruppe (33 Patienten) hat einen Median von 2.9 mL/h, IQR 1.3–7.6. Dies ist ein näherer anatomischer Vergleich als die späten DEFUSE-3-Ziele einer gemischten Population, liefert aber weiterhin keine öffentlichen gepaarten M1-spezifischen Zeitangaben, vollständigen Verläufe oder regionalen Gewebeschädigungsmessungen.

Das reproduzierbare Experiment `diagnoseEarlyGrowthCalibration()` nimmt für diese Untergruppe eine Zeit von 3.7 Stunden aus der Gesamtkohorte, einen isolierten rechten M1-Verschluss, mittlere Kollateralen, MAP 93 mmHg und keine Varianten an. Keine dieser repräsentativen Einstellungen wird als gemeinsame patientenbezogene Verteilung abgeleitet. Gesucht wird ein gemeinsamer Multiplikator für Latenz- und Gewebezeitkonstanten; das Suchintervall 0.001–10,000 und 80 Iterationen sind numerische Entscheidungen, keine klinischen Parameterbereiche.

| Experiment | Ergebnis | Entscheidung |
|---|---|---|
| Bestehendes Modell | 24.728457 mL/h zur angenommenen Zeit | Abweichung bleibt sichtbar |
| Zeiten sämtlicher Gewebe multiplizieren | 10.284395× ergibt 2.9 mL/h, 10.73 mL bei 3.7 h | Übertragung auf alle Gewebeklassen verwerfen |
| Nur Standardgewebe unbegrenzt verlangsamen | Unveränderte tiefe/Perforatorschädigung hinterlässt 3.779299 mL/h | Ziel unerreichbar |

Die numerische Übereinstimmung würde die interne Latenz der Capsula interna von 2.5 auf etwa 25.7 Stunden und ihre Zeitkonstante von 1.75 auf etwa 18.0 Stunden verschieben. Diese Änderungen haben keine stützenden regionalen Messungen und widersprechen der deutlich früheren kapsulären Schädigung in `tissueParams.ts`; eine Übereinstimmung des Gesamtvolumens validiert sie nicht. Die bestehenden regionalen Kurven behalten selbst ihre dokumentierten Annahmen zur Umrechnung von Wahrscheinlichkeiten in Gewebeanteile.

ICA- und repräsentative obere-M2-Vergleiche liefern 4.433152 und 0.097242 mL/h gegenüber veröffentlichten zusammenfassenden Medianen von 6.2 und 0.4. Die veröffentlichten Subtypen entsprechen nicht den exakten Modellverschlüssen, ihre Zeitangaben sind nicht unabhängig gepaart; diese Vergleiche sind keine Validierung. Auf das Modell wird kein Zeitmultiplikator angewendet. Tests reproduzieren beide Verwerfungen und bestätigen unveränderte gewöhnliche Simulationsergebnisse und regionale Parameter. Die Kalibrierung bleibt offen, bis anatomisch und zeitlich gepaarte Daten eine vertretbare angewandte Anpassung unterstützen können.

[繁體中文](deficit-grading.zh-TW.md) · [简体中文](deficit-grading.zh-CN.md) · [English](deficit-grading.md) · [Deutsch](deficit-grading.de.md) · [日本語](deficit-grading.ja.md)

<!-- source-doc: docs/deficit-grading.md; sha256: abaf3ee34ec2fa622ca6010924de0c11853b99e25079eb0a80c20061fb01f173 -->

<a id="continuous-model-deficits-and-ordinal-examination-grades"></a>
# Kontinuierliche Modelldefizite und ordinale Untersuchungsgrade

Das Modell erhält die kompensierte Defizitstärke als `SymptomItem.continuousSeverity` zwischen 0 und 3. Dies ist ein interner Wert des didaktischen Modells, keine gemessene klinische Skala und keine Wahrscheinlichkeit. `deadContinuousSeverity` erhält die entsprechende, einer dauerhaften Gewebeschädigung zugeschriebene Stärke für Vergleiche. Bestehende Schwellen für Gewebe, Kompensation, Wahrnehmbarkeit und Symptome bleiben unverändert. Der bisherige Wert `sev` (1, 2 oder 3 für ein aufgeführtes Symptom) bleibt für die bestehenden Symptomregeln verfügbar. Es gibt keine zusätzliche Hysterese und keinen zeitabhängigen Zustand der Einstufung.

<a id="nihss-is-an-ordinal-bedside-examination"></a>
## Die NIHSS ist eine ordinale Untersuchung am Krankenbett

Die [NINDS NIH Stroke Scale](https://www.ninds.nih.gov/sites/default/files/2025-03/KnowStroke_NIHStrokeScale_March2025_508c.pdf) definiert Untersuchungskategorien. Die geprüfte [Fassung der NIHSS-Anweisungen der American Stroke Association](https://www.stroke.org/-/media/Data-Import/downloadables/5/2/3/NIH-Stroke-Scale-UCM_490144.pdf?rev=c72312713d574cf494fc406be288c3f6) verlangt die Bewertung der während der Untersuchung beobachteten Leistung. Die motorischen Items reichen vom Halten der Extremität ohne Absinken (0) über Absinken (1), begrenzte Kraft gegen die Schwerkraft (2) und fehlende Kraft gegen die Schwerkraft (3) bis zum Fehlen jeder Bewegung (4). Das sensible Item unterscheidet normale Sensibilität (0), teilweise Beeinträchtigung (1) und schwere oder vollständige Beeinträchtigung (2).

Zu den motorischen Bezeichnungen der Quelle gehören „No drift“, „Some effort against gravity“, „No effort against gravity“ und „No movement“. Diese beschreiben die Untersuchung und keine Grenze des Infarktvolumens.

Diese geordneten Kategorien begründen keine gleichen Abstände zwischen den Graden: Eine Differenz von einem Punkt entspricht keinem festen Betrag an Kraft oder Sensibilität. Die arithmetische Interpolation ist daher eine Darstellungsentscheidung des Modells und keine von den NIHSS-Anweisungen gelieferte klinische Interpretation. Die NIHSS eines Patienten lässt sich nicht allein aus einer Infarktkarte, einem Gewebevolumen oder einem Arterienverschluss berechnen. Die Befunde am Krankenbett und die vorgeschriebene Untersuchung bestimmen den Wert.

<a id="motor-presentation-uses-existing-anchors"></a>
## Die motorische Darstellung verwendet bestehende Anker

Bei Arm- und Beinschwäche projiziert die Darstellung die kontinuierliche Modellstärke durch die bestehenden Anker `nihss.pts` in `src/anatomy/symptoms.ts`:

| Modellstärke | Anker der motorischen Projektion |
| --- | --- |
| 0 | 0 |
| 1 | Bestehende Punkte des leichten Items, `pts[0]` |
| 2 | Bestehende Punkte des mittelschweren Items, `pts[1]` |
| 3 | Bestehende Punkte des schweren Items, `pts[2]` |

Zwischen benachbarten Ankern ist die Projektion linear. Der angezeigte motorische Grad wird auf die nächste ganze Zahl gerundet. Ein positives aufgeführtes motorisches Defizit behält mindestens seinen bisherigen leichten Anker `pts[0]`. Bei den bestehenden häufigen Schwächeankern `[1, 3, 4]` ist der Zwischenwert 2 zwischen dem leichten und dem mittelschweren Anker verfügbar. Symptome mit anderen bestehenden motorischen Ankern behalten diese; kein Anker wird neu kalibriert. Der höchste Grad erfordert weder eine Modellstärke von genau 3 noch impliziert er die Schädigung sämtlichen relevanten Bahngewebes.

Diese Quantisierung erhält die bestehende Läsionskalibrierung und stuft etablierte klassische Syndrome nicht allein deshalb um, weil etwas Gewebe erhalten ist. Sie validiert die Kategorie nicht als vorhergesagten Untersuchungsbefund. Insbesondere ist die Anzeige des höchsten motorischen Grades eine illustrative Modellschätzung und kein Nachweis, dass ein bestimmter Patient keine Willkürbewegung hat. Die kontinuierliche Stärke kann sich ändern, während der geschätzte ganzzahlige Grad unverändert bleibt.

Anker und Projektion sind heuristisch. Es werden weder eine empirische Läsions-Kraft-Schwelle noch eine neue Läsionsgrenze, eine Behandlungseffektgröße oder eine Patientenkalibrierung eingeführt. Eine kleine anatomische Änderung kann den kontinuierlichen Modellwert verändern; allein daraus folgt kein kategorialer Nutzen für einen Patienten.

<a id="other-examination-items-and-limits"></a>
## Andere Untersuchungsitems und Grenzen

Für andere Items bleiben die bisherigen ordinalen NIHSS-Regeln bestehen. Die offiziellen Itembereiche umfassen Sensibilität 0–2, Gesichtsbewegung 0–3, Sprache 0–3, Artikulation 0–2, Gesichtsfelder 0–3, horizontalen Blick 0–2, Extremitätenkoordination 0–2 und Extinktion/Unaufmerksamkeit 0–2. Die bestehenden `pts`-Arrays des Katalogs sind didaktische Zuordnungen zu diesen Kategorien und keine klinisch kalibrierten Läsionsschwellen. Untersuchungsabhängigkeiten einschließlich Bewusstsein und Unfähigkeit, verlangte Handlungen auszuführen, bleiben Bestandteil des bestehenden Schätzers.

Die geschätzte NIHSS bleibt ganzzahlig. Änderungen von Kategorie und Gesamtwert können daher weiterhin stufenweise auftreten, auch bei benachbarten Modellwerten auf gegenüberliegenden Seiten einer Rundungsgrenze. Bestehende Schutzregeln verhindern weiterhin, dass eine winzige beidseitige Veränderung als großer Vorteil im aggregierten motorischen Wert gilt. Die nicht zusammengefasste kontinuierliche Stärke unterstützt Erholungsvergleiche und die Defizitanzeige unabhängig von der ordinalen Quantisierung. Sie wird getrennt geführt und nicht als NIHSS mit Nachkommastellen angegeben. Keiner der beiden Werte liefert eine Umrechnung in die modified Rankin Scale, eine individuelle Prognose oder einen gemessenen Behandlungsvorteil.

[繁體中文](MEDICAL_VALUES_AUDIT.zh-TW.md) · [简体中文](MEDICAL_VALUES_AUDIT.zh-CN.md) · [English](MEDICAL_VALUES_AUDIT.md) · [Deutsch](MEDICAL_VALUES_AUDIT.de.md) · [日本語](MEDICAL_VALUES_AUDIT.ja.md)

<!-- source-doc: MEDICAL_VALUES_AUDIT.md; sha256: 3c76b816b6798f01cca289388fd0a2e5027e9e27f83324b21846253cad32cbd5 -->

<a id="engine-medical-values-audit"></a>
# Prüfung medizinischer Werte der Engine

Unabhängig am 2026-10-08 anhand des Commits `9fcab3287f9881f4f82309410631ce7feaef2a80`, des Diffs zu seinem Vorgänger und zitierter Primärquellen (Websuche, Abstracts und verfügbare Volltexte) erneut geprüft. Umfang: Produktionscode `src/engine/*.ts`, einschließlich numerischer Aussagen in Kommentaren und beiden Textsprachen. Tests sind Prüfdaten/Zusicherungen, keine zusätzliche klinische Evidenz. Verwandte Anatomiekonstanten werden dort nachverfolgt, wo die Engine sie importiert. Wiederholte Werte gleicher Bedeutung sind zusammengefasst. Mathematische Identitäten, Schleifenindizes, Gleitkomma-Epsilons und Abtastauflösungen sind ausgeschlossen, außer wenn sie als klinische Schwelle missverstanden werden könnten.

**OK (gestützt)** bedeutet für die angegebene Population und Messgröße belegt, nicht klinische Validierung des Simulators. **Questionable (fraglich)** bezeichnet unvalidierte Kalibrierung, Extrapolation, widersprüchliche Evidenz oder ein unvollständig überprüftes Zitat. **Wrong (falsch)** bezeichnet eine konkret widersprochene Zahl, Bezugsgröße, Grenze oder Interpretation. Ein unbelegter Parameter wird nicht dadurch richtig, dass eine Quelle zu einer anderen Größe angefügt wird.

Ortsangaben sind ungefähre Quellanker der ursprünglichen Prüfung; Änderungen können Zeilen verschieben. Die Korrekturtabelle erhält Werte vor dem Commit und dokumentiert geprüfte und nachfolgende Korrekturen; die übrigen Tabellen beschreiben das Modell und die unabhängig nachgeprüften Bewertungen. Die erneute Prüfung eines zitierten Ergebnisses reproduziert nicht unabhängig dessen klinische Rohdaten.

<a id="corrections"></a>
## Korrekturen

| Wert | Ort | Aktuell | Literatur | Bewertung | Maßnahme |
|---|---|---|---|---|---|
| Reperfundierter Anteil bei eTICI 1 | `src/engine/treatment.ts:47`; `cascade.ts:727`; `src/i18n/uiTreatment.ts:121,213` | 0.05; „kaum“ distaler Fluss | Thrombusreduktion **ohne distale Reperfusion**, [Liebeskind 2019][etici] | Falsch | Auf 0 setzen; zh-TW/en-Beschreibungen und Auswahlbeschriftungen korrigieren; Definition zitieren; keine Geweberettung und alle Gradbereiche testen. |
| Obergrenze in Studien mit großem Infarktkern | `cascade.ts:1488,1596,1600` | Über 100 mL: „nur LASTE setzte keine Obergrenze“ | Auch SELECT2 hatte keine obere Kernvolumengrenze, [SELECT2][select2] | Falsch | Beide Sprachen und Auswahlkommentar korrigieren. 100 mL als Auslöser eines Vorsichtshinweises erhalten, nicht als Ausschlusskriterium. |
| Durchmesser akuter kleiner subkortikaler Infarkte | `cascade.ts:2012–2013` | Unter ungefähr 1.5 cm | Frischer kleiner subkortikaler Infarkt axial meist ≤20 mm; STRIVE-2 erkennt auch kavitäre Lakunen <3 mm an, [STRIVE-2][strive] | Falsche Konvention | In beiden Sprachen meist ≤2 cm axialen Durchmesser nennen; Quelle und Regression ergänzen. |
| Bewusstseinsprognose | `cascade.ts:3914–3916,3974–3975,3996–3997` | Erholung nach 3 Monaten äußerst selten; Lebensdauer 2–5 Jahre; keine Wiederkehr des Bewusstseins | Späte Erholung anerkannt; chronisches statt permanentes VS/UWS, [AAN 2018][aan] | Als kategorische aktuelle Prognose falsch | Feste Lebensdauer und Gewissheit entfernen; mögliche späte Erholung anerkennen; ausdrücklich illustrativen Modellverlauf erhalten. |
| Altersgrenze für Dekompression | `cascade.ts:2467–2468,2658–2659` | Englisch „unter 60 Jahren“, andernorts ≤60 | Gepoolte Studien: Alter 18–60, [Vahedi][surgery] | Falsche Grenze/inkonsistente Formulierung | 60 Jahre oder jünger nennen; in zh-TW ausdrücklich einschließlich. |
| Bezugsgrößen spinaler Bildgebung | `cascade.ts:1302–1303` | Stiftförmig bei 40% aller 133; arterielle Auffälligkeit 20% ohne Teilgruppenangabe | Stiftförmig50/126,Eulenaugen82/126,anfangs normal30/126; arterielle Befunde16/82, [Zalewski][cord2] | Falsche Bezugsgröße | Prozentsätze erhalten; bildgebend untersuchte Teilgruppe und 16/82 Untersuchte angeben. |
| Population der falsch-negativen MRT-Rate | `cascade.ts:1254–1255` | 12% innerhalb von 48 h, scheinbar allgemein | 8/69 ischämische Schlaganfälle einer Hochrisikokohorte mit akutem vestibulärem Syndrom; alle falsch-negativen Aufnahmen8–48h, [Kattah][hints] | Falsche Population und zeitliche Bezugsgröße | In beiden Sprachen8/69 und Zeitpunkt falsch-negativer Aufnahmen nennen; nicht12% jeder innerhalb48h angefertigten Aufnahme. |
| Nachbeobachtung der Hörerholung | `cascade.ts:1231–1232` | Ausgeprägter Verlust verbessert sich bei 40% „über Monate“ | Langzeitnachbeobachtung, mindestens 1 Jahr, [Lee/Baloh][hearing] | Fragliche zeitliche Genauigkeit | In beiden Sprachen Langzeitnachbeobachtung schreiben; 40% erhalten. |
| Bezugsgröße früher Anfälle/des Status | `cascade.ts:3353–3354` | Ungefähr ¼ der Anfälle bei kortikalem Infarkt treten als Status auf | 10/37 (27%) früher Anfallsfälle über alle Schlaganfalltypen, [Labovitz][seizure1] | Falsche Bezugsgröße | Alle Schlaganfalltypen einschließlich Blutungen nennen; breiten Überblick von 4–6% auf 4–7% ändern, um zitierte 6.5% einzuschließen. |
| Demenzprävalenz gegenüber Inzidenz | `cascade.ts:3654–3655` | ~7% entwickeln Demenz nach erstem Schlaganfall; >⅓ nach Rezidiv | 7.4% bevölkerungsbasierte Erstschlaganfallkohorten ohne vorherige Demenz; 41.3% klinische Rezidivkohorten einschließlich vorheriger Demenz, [Pendlebury][dementia] | Falsche Bezugsgröße/Interpretation | Beide genauen Schätzungen und Populationen nennen; nicht austauschbar als Neuerkrankungsrisiko interpretieren. |
| Zeitlicher Geltungsbereich der Depression | `cascade.ts:3654–3655` | 31% „zu jedem Zeitpunkt“ | Gepoolte Prävalenz; Schichten variieren mit Nachbeobachtung, [Hackett][depression] | Fragliche Verallgemeinerung | Gepoolte Schätzung und zeitliche Variation kennzeichnen; 31% erhalten. |
| Nachweisrate bei AF-Monitoring | `cascade.ts:3285–3290` | Ungefähr ein Viertel bei längerer Überwachung entdeckt | 23.7% geschätzte kombinierte Nachweisrate über Aufnahme-EKG, stationäre und ambulante Phasen bei Schlaganfall oder TIA, [Sposato](https://pubmed.ncbi.nlm.nih.gov/25748102/) | Falsch bei Lesart als ausschließlich ambulante Nachweisrate | Gepoolte Schätzung, Schlaganfall-oder-TIA-Population und aufeinanderfolgende Phasen in beiden Sprachen erläutern. |
| Bezugsgröße der Verschlechterung | `cascade.ts:2358–2359` | 36% bis24h/68% bis48h bei53Patienten | Kohorte aufgrund von Verschlechterung ausgewählt, [Qureshi](https://pubmed.ncbi.nlm.nih.gov/12545028/) | Fragliche Bezugsgröße | Ausgewählte Patienten mit Verschlechterung ausdrücklich benennen. |
| Fiebergrenze | `cascade.ts:3042–3043` | Englisch über39°C, zh-TW39°C以上 | Einschluss≥39°C,[Sung](https://pubmed.ncbi.nlm.nih.gov/19521083/) | Falsche strikte gegenüber inklusiver Grenze | Englisch nun39°C oder höher. |

<a id="perfusion-tissue-fate-and-volumes"></a>
## Perfusion, Gewebeschicksal und Volumina

| Wert | Ort in `src/engine`, sofern nicht anders angegeben | Aktuell | Literaturvergleich | Bewertung | Maßnahme |
|---|---|---|---|---|---|
| Operative Kernschwelle | `tissueParams.ts:53,97`; `tissue.ts:5` | rCBF <0.30 | Campbell-Optimum <31%; SELECT2 verwendet <30%, [Campbell][cbf], [SELECT2-Protokoll][selectprotocol] | Zitat für CTP-Bildgebung gestützt; Ausweitung auf alle modellierten Gewebe fraglich | Erhalten; Tests fixieren den Literalwert0.30 und prüfen endgültiges Infarktverhalten knapp unter/über ihm. Regional modellierter Fluss ist kein gemessenes CTP-Voxel und kein Beweis irreversiblen Zelltods. |
| Penumbra-/Oligämieschwellen | `tissueParams.ts:54–55,98–99`; `tissue.ts:10–19` | rCBF <.55 / <.85; absoluter Vergleich 20/10 mL/100g/min, Lähmung bei Affen ~23 | Moderner Perfusions-Mismatch verwendet Tmax >6 s, [DEFUSE-3][defuse]; absolute Schwellen hängen von Gewebe, Zeit und Methode ab | Fraglich | Explizite Kalibrierung erhalten. Der Simulator berechnet kein Tmax; .55 lässt sich nicht als Tmax >6 s validieren. |
| Schnelles Kern-/Perforatorprofil | `tissueParams.ts:46–61,125` | τ .09 h, Spanne1, Penumbra τ1.5 h×20, maximales Überleben .85, Verzögerung .1 h; >80% verloren bis15 min | Striataler Infarkt bei Ratten nach30 min ist keine validierte menschliche Zeit-bis-Zelltod-Kurve; [Memezawa](https://pubmed.ncbi.nlm.nih.gov/1561688/) | Fraglich | Kein begründbarer isolierter Ersatz; Vorbehalt erhalten. |
| Standardprofil kollateralversorgten Gewebes | `tissueParams.ts:97–105` | Kern τ3→8 h; Penumbra8→30 h; Überleben .85; Verzögerung⅓ h | Sehr heterogenes gemessenes Wachstum, [Wheeler][growth1], [Ospel][growth2] | Fraglich | Als Modell erhalten, nicht als physiologische Konstanten. |
| Berichtete/abgeleitete Wachstumszitate | `tissueParams.ts:76–84` | 3.1 [.7–10.7],4.74 [1.25–14.84]mL/h;schnell≥10;extrem~74mL/h | [Wheeler][growth1] Median3.1; [Ospel][growth2]4.74 aus endgültigem24h-Infarkt geteilt durch Zeit von Beginn bis Reperfusion abgeleitet; ≥10 ist eine Klassifikation der [SELECT-Studie][fastgrowth]; extreme Neuronenumrechnung ist eine Schätzung,[Desai][neurons2] | Zugeschriebene Schätzungen gestützt; falsch, wenn als einheitlich beobachtetes serielles Kernwachstum dargestellt | Werte mit methodischem Vorbehalt erhalten; weder universeller Grenzwert für schnelles Wachstum noch direkte Zellzählung. |
| Abgeleitetes Szenariowachstum | `tissueParams.ts:85–90` | M1 schlecht~60mL bei1h /35–55mL/h in ersten6h; ICA~70mL bei1h; mittel20–30/gut10–20 | Vergleich gut2.93 [1.10–7.94], mittel8.65 [4.53–18.13], schlecht25.41 [12.83–45.07], [Kollateralstudie][growth3] | Fraglich, in Richtung schneller Progression verzerrt | Unverändert lassen; Modellergebnisse sind keine für Populationen typischen Raten. |
| Tiefe weiße Substanz | `tissueParams.ts:139–161` | Verzögerung2.5h, τ1.75h; 58/76/86% verloren nach4/5/6h | Kohorte92,45(48.9%) Kapselinfarkte, aOR3.47/Stunde Verzögerung der LSA-Reperfusion in der Teilgruppe mit LSA-Verschluss, [Kaesmacher][capsule] | Kohortenzitat gestützt; Umrechnung fraglich | Patientenübergreifende Wahrscheinlichkeit ist nicht der Anteil einer einzelnen Kapsel; kein garantierter sicherer2.5h-Zeitraum. |
| Basilarisprofil | `tissueParams.ts:175–219` | Übernimmt schnellen Kern; Penumbra τ3→60h; maximales Überleben.4 | Nutzen innerhalb12h/6–24h bestimmt keine gewebekinetischen Koeffizienten, [ATTENTION][attention]/[BAOCHE][baoche] | Fraglich | Expliziten Vorbehalt regionaler Kalibrierung erhalten. |
| Retina | `tissueParams.ts:225–241`; `cascade.ts:1170` | Verzögerung12min, τ5.4min; Affen97/240min, Humanübersicht12–15min | [Hayreh-Experiment][retina] gegenüber umstrittener Extrapolation in [Tobalem](https://doi.org/10.1186/s12886-018-0768-4) | Als deterministische menschliche Regel fraglich | Widersprüchliche Evidenz und Unsicherheit erhalten;12min nicht durch97min aus Affenversuchen ersetzen. |
| Endgültige Infarktwahrscheinlichkeit | `tissue.ts:61` | 1−survivalMax×x^1.3 | Kein gemessener universeller Exponent; [DEFUSE-3][defuse] begründet Auswahl statt dieses Gesetzes | Fraglich | Kalibrierung erhalten. |
| Zeithorizont stabiler Penumbra | `tissue.ts:65,81` | lag+3τ begrenzt auf48h | Hypoxisches vitales Gewebe innerhalb48h beobachtet, [Markus](https://pubmed.ncbi.nlm.nih.gov/15130953/); kein Beweis, dass es dann endet | Fraglich | Als rechnerische Verlaufsgrenze erhalten. |
| Erholung geretteten Gewebes | `tissue.ts:225–238,270–276`; `cascade.ts:778–782` | .5h erste Reaktion; τ2.8×Ischämiestunden; schneller Anteil.75, langsamesτ×8; NIHSS<6 bei~¼ innerhalb30min;54% des geschätzten Behandlungsnutzens durch24h-NIHSS vermittelt/75% bisEntlassung | Kohorten klinischer Reaktion begründen keine Kinetik von Gewebeanteilen; [Kniep](https://pubmed.ncbi.nlm.nih.gov/35549377/), [Desai](https://pmc.ncbi.nlm.nih.gov/articles/PMC12778787/) | Kohortenzahlen gestützt; Umrechnung von Mediation/NIHSS-Ergebnissen in Gewebekinetik fraglich | Keine kinetische Änderung. |
| Verlorene Neuronen | `tissue.ts:325`; `simulate.ts:2811`; `cascade.ts:1550` | 22Millionen/mL; Durchschnitt1.9Millionen/min; Bereich<35000–>27Millionen/min | [Saver][neurons1] betrifft Vorderhirn/supratentoriell; [Desai][neurons2] zeigt Variabilität | Gerundete Vorderhirnschätzung gestützt; posteriore Anwendung fraglich | Keine Dichtesubstitution. Kleinhirn/Hirnstamm benötigen eigenes Modell; Gesamthirnwert ist kein validierter neuronaler Verlust. |
| Normalisierung anatomischer Volumina | `src/anatomy/index.ts:30,53,63,70`; `simulate.ts:2771–2811` | 1250mL Ziel; tatsächliches Gehirn1250.8mL nach festen Strukturen | [Liu-Atlas][atlas] stützt Gebietstopologie; begründet kein universelles1250mL-Gehirn | Feste Erwachsenengeometrie fraglich | Erhalten; siehe Tabelle je Gefäß. |
| Ausgangsfluss | `src/anatomy/index.ts:70`; engine imports | Volumen×regionale CBF/100; insgesamt557.0384mL/min | Plausibler didaktischer Ausgangswert für Erwachsene; keine individuellen physiologischen Grenzen abgeleitet | Als universeller Wert fraglich | Erhalten. |
| Lakunenvolumen | `simulate.ts:201–202`; `src/anatomy/lacunes.ts:45` | .8mL, zitierter Kohortenmedian.73mL | [Barow2020][lacunevolume]:224lakunäre WAKE-UP-Patienten,Median.73mL[IQR.37–1.15]; [STRIVE-2][strive] schreibt kein einheitliches Volumen vor | Festes Volumen fraglich | Als Szenario erhalten. |
| Schwelle für „kein Infarkt“/Beginn | `simulate.ts:333,620,1296`; `cascade.ts:1969` | .05mL | Gewebebasierte TIA hat kein anerkanntes Mindestinfarktvolumen; [Easton](https://doi.org/10.1161/STROKEAHA.108.192218) | Bei klinischer Interpretation fraglich | Numerische/berichtstechnische Toleranz, kein diagnostisches Minimum; unverändert. |
| Zeitmarken für Erholung/Endanzeige | `simulate.ts:325,445,1445,2849` | 90/180Tage, Glättung überlebender Penumbra12h, Vorschau24h | 90d häufiger Studienendpunkt [DEFUSE-3][defuse]; andere Werte Modellhorizonte | Endpunkt gestützt; biologische Interpretation fraglich | Erhalten. |

Weitere zitierte Perfusionsvergleiche in `tissueParams.ts:77–83`: [Seners](https://pmc.ncbi.nlm.nih.gov/articles/PMC10663035/) bestätigt ~77%schnelle Progression im höchsten HIR-Quartil;≥10mL/h ist als Ausgangsinfarkt geteilt durch Zeit von Beginn bis Bildgebung definiert und keine Wahrscheinlichkeit eines Modell-Kollateralgrads. [d'Esterre](https://pubmed.ncbi.nlm.nih.gov/26514186/) bestätigt<8.9/<7.4mL/100g/min-Schwellen für frühe Reperfusion (<90minabCTP,Beginn<180min); dies sind bedingte ROC-Grenzen, keine universelle7–9-Vitalitätsgrenze. [Boned](https://pubmed.ncbi.nlm.nih.gov/27566491/) belegt mögliche Überschätzung des CTP-Kerns, nicht Umkehr nachgewiesenen Zelltods. Diese Zitate begründen Vorsicht, nicht die Modellkinetik.

<a id="hemodynamics-collaterals-and-emboli"></a>
## Hämodynamik, Kollateralen und Emboli

Die folgenden numerischen Netzwerkkoeffizienten sind **als medizinische Konstanten fraglich**: Die zitierte Literatur stützt qualitative Abhängigkeiten, nicht die exakten Koeffizienten. Numerische Ersetzungen sind ohne Neukalibrierung des Netzwerks nicht begründet.

| Wert | Ort | Aktuell | Literatur / Bewertung | Maßnahme |
|---|---|---|---|---|
| Skalierung hydraulischer Leitfähigkeit/Astmultiplikator | `hemodynamics.ts:98–119` | 150 gegenüber physikalisch~900; Ast×3; stenotischer Abschnitt4mm | Konzentrierte Poiseuille-Näherung, keine Patientenmessung | Modellkoeffizienten erhalten. |
| Referenzdrücke/Reserve | `hemodynamics.ts:101–112,780,798` | MAP93,Ausfluss10,Druckverluste der Verbindungen12/30mmHg; Autoregulation.6–1.8; Exponent.7; relative Flussobergrenze2 | Leitlinien regeln gemessenen Blutdruck, nicht diese Reservefaktoren, [AHA/ASA][aha] | Repräsentativen Ausgangswert erhalten. |
| Kollateralstufen | `hemodynamics.ts:113–115` | gut1.5/mittel.8/schlecht.15; Skalierung1/36 | [Kollateralen/Kernwachstum][growth3] stützt Reihenfolge; dies sind keine ASITN/SIR-Grade | Erhalten; keine Gleichsetzung mit klinischen Scores. |
| Anteile der Hirnstamm-Zuflüsse | `hemodynamics.ts:153–162` | .6/.4,.7/.3,.5/.5,.7/.3,.5/.5 | Anatomische Mischannahmen, keine gemessenen Zuflussanteile | Erhalten. |
| Piale Leitfähigkeit | `hemodynamics.ts:169,191,208–225` | .02;schlecht.5,Überschreibung.75;Eintritt.015;Druckexponent1.4 | [ATTENTION][attention]/[BAOCHE][baoche] validieren diese Zahlen nicht | Kalibrierung erhalten. |
| Abgeleitete Basilaris-Restflüsse | `hemodynamics.ts:165,174,196–204` | 50/40/33%;früher schlecht15%;Überschreibung28→33%;mehrere Segmente6–23% | Netzwerkergebnisse; Einschränkungen bei mehreren Segmenten bereits dokumentiert | Erhalten; keine gemessenen klinischen Bereiche. |
| Extrakranielle Kollateralen | `hemodynamics.ts:244–267` | Leitfähigkeit1.8/1.2;Armgradient25mmHg;zitiert76%antegrader BA-Fluss;Druck20/40–50mmHg | [Harper](https://pubmed.ncbi.nlm.nih.gov/18692344/), [Labropoulos](https://pubmed.ncbi.nlm.nih.gov/20531004/); 76% antegrader Fluss und Zusammenhang mit >40–50 mmHg bestätigt; Leitfähigkeiten weiterhin unvalidiert | Bestätigte Beobachtungszitate und unvalidierte Modellkoeffizienten erhalten. |
| Erkennung von Umkehr/Versorgungsweg | `hemodynamics.ts:814–815,852`; `simulate.ts:426` | max(.5mL/min,5%Ausgangswert);Anstieg entlang Versorgungsweg5mL/min | Technischer Klassifikator, keine diagnostischen Kriterien | Erhalten. |
| Vorgaben für Embolusdurchmesser | `embolus.ts:35–38` | 4.2/2.9/1.6/.9mm | Illustrative Größen, keine klinischen Kategorien | Erhalten. |
| Embolusweg/Festsetzen | `embolus.ts:67–70,88–103,123` | ACA.3,Verbindungsarterie.5,Perforator.02;Durchmesser×1.05;Mündung<.6×Durchmesser→Gewicht.05;Fluss>.2 | Heuristiken für starre Kugeln/Fluss, keine validierten Embolisationswahrscheinlichkeiten | Erhalten. |
| Zeitplan/Algebra | `schedule.ts:158`; `solver.ts` | .9 Reihenfolgeprüfung; algebraische Toleranzen | Keine90%-Stenosegrenze; keine medizinischen Konstanten im Solver | Keine klinische Korrektur. |

<a id="edema-mass-effect-surgery-and-recovery"></a>
## Ödem, Masseneffekt, Operation und Erholung

| Wert | Ort | Aktuell | Literatur | Bewertung / Maßnahme |
|---|---|---|---|---|
| ADC-Pseudonormalisierung | `edema.ts:11,101–102` | ~1–2wk;Mittelpunkt240h,Breite30h | ADC niedrig inWoche1,pseudonormal inWoche2 bei27Patienten,[Lansberg][adc] | Qualitativer Zeitverlauf gestützt; Mittelpunkt/Breite fraglich. Das Zitat begründet keine5–14d-Grenze für Diffusionsrestriktion auf halber Spitzenhöhe. Der Test kennzeichnet die7–14d-Prüfung der halben Kurve ausdrücklich als Modellregression und unterscheidet anhaltendes DWI-Shine-through. |
| DWI-Erscheinen/Verstärkung | `edema.ts:97–99,187` | τ.1h/12h;Helligkeit.65+.35×Anstieg | Serieller ADC/DWI-Verlauf,[Lansberg][adc]; diese Studie begründet keine6-Minuten-Beginnschwelle | Exakte Kurve und Beginnzitat fraglich; als Modell erhalten. |
| DWI-Shine-through | `edema.ts:104–106` | .5 Intensität,τ720h | DWI kann nach ADC-Normalisierung fortbestehen,[Lansberg][adc] | Intensität/τ fraglich; erhalten. |
| Gliose/FLAIR | `edema.ts:108–110` | .6,Beginn120h,vollständig400h | Keine universelle Zerlegung,[Lansberg][adc] | Fraglich; erhalten. |
| DWI von Penumbra/gerettetem Gewebe | `edema.ts:112–114` | .3,Abklingen3h | Variable Reversibilität der Diffusionsveränderung | Fraglich; erhalten. |
| CT-Wasseraufnahme | `edema.ts:23` | 11.5% trennt≤4.5h von später | [Minnerup](https://doi.org/10.1002/ana.24818) | Studienzitat gestützt, kein prozentualer Volumenzuwachs. |
| Ionisches Ödem | `edema.ts:117–121` | .04Volumen,τ4h;Penumbra×.4,Rettungτ12h | Aus Dichte abgeleitete Wasseraufnahme ist eine andere Größe,[Minnerup](https://doi.org/10.1002/ana.24818) | Angepasste Koeffizienten fraglich; nicht durch.115 ersetzen. |
| Vasogenes Ödem | `edema.ts:124–132` | .26Volumen;Mittelpunkt36h,Breite10h;sekundär×.15;Rückbildung ab72h,τ260h | Breites Maximum anTagen2–5 plausibel; exakte Konstanten unvalidiert | Fraglich; erhalten. |
| Reperfusionsödem | `edema.ts:135–138,341,388` | +.05Volumen,+.5FLAIR;Anstieg3h/Abklingen72h;spätes smoothstep.5–6h;Flussänderung>.05 | Kein universeller gemessener Effekt dieser Größenordnung | Fraglich; erhalten. |
| Chronische Atrophie | `edema.ts:34,141–143` | 50%;ab300h,τ700h;halbes Volumen bis3–6mo | Keine universelle50%-Schrumpfung | Fraglich; als Szenario erhalten, nicht als Prognose. |
| Zuordnung von Verlagerung zu Volumen | `edema.ts:146–148` | .15mm/mL,Reserve5mL,Obergrenze20mm | [Ropper][shift] beschreibt beobachtete Verlagerung, nicht diese Umrechnung | Fraglich; erhalten. |
| Dekompressionseffekt | `edema.ts:150,157–158` | 36h;Verlagerung×.3,Ventrikelkompression×.4 | Operation≤48h,[Vahedi][surgery] | Zeitpunkt als Szenario gestützt; Effektgrößen fraglich. Nur Zeitpunkt testen. |
| Ventrikelreaktion | `edema.ts:161–168,520,522` | Kompression.85/45mL;ex-vacuo1/120mL;Hydrozephalus.8,Rampe12h,Rest.2,anfänglich.25;Grenzen−.9/+1.5 | Keine zitierten physiologischen Grenzen normalisierter Geometrie | Fraglich; erhalten. |
| Überlappende Läsionen/Größe | `edema.ts:234,237` | 312h;Größenfaktor.3+.7×smoothstep(.05,.5,share) | Angenommene Dosis-Wirkungs-Beziehung | Fraglich; erhalten. |
| Phasenbeschriftungen | `edema.ts:479,481`; `edemaTypes.ts:14,16` | Rückbildung<.95,ionisch≥.3;BBB6–12h;Rückbildung2–3wk | Ungefähre didaktische Bezeichnungen, keine biologischen Übergänge | Fraglich; erhalten. |
| Modellbeispiele | `edema.ts:41–43` | R-M1~300mL→30%/90mL Schwellung→12–13mm Tag3;L-M1gut~150mL | Szenarioergebnisse, keine Literatur über feste Gefäßvolumina | Als Populationsaussagen fraglich; als Kalibrierung gekennzeichnet erhalten. |
| Verlagerungsbereiche und Bewusstsein | `cascade.ts:584–586`; `edema.ts:36` | 4/6/8mm aus3–4/6–8.5/8–13mm | 24 gemischte einseitige Raumforderungen,[Ropper][shift] | Zitat gestützt; allgemeine Schlaganfallschwellen fraglich. Quellenkommentar ergänzt; Test prüft nur, dass gewählte Werte in beobachteten Bereichen liegen. |
| Masseneffekt/maligner Verlauf | `cascade.ts:619–622` | 70mLendgültig;145mLfrüh≤14h;250mLendgültig | DWI **>145mL**,28Patienten bildgebend≤14h untersucht,100%Sensitivität/94%Spezifität in dieser Ableitungskohorte,[Oppenheim][malignant] | Alle drei≥145-Vergleiche auf strikt>145 korrigiert. Prädiktorzitat gestützt; deterministische und bilaterale Extrapolation sowie70/250-Grenzwerte bleiben fraglich. |
| Herniationszeitpunkt | `cascade.ts:594–609` | unkal≥72h;subfalzin−12h;Pons+12h;Ende336h;lateral4mm | Todesgipfel anTag3 ist nicht frühestmögliche Herniation,[Qureshi](https://experts.umn.edu/en/publications/timing-of-neurologic-deterioration-in-massive-middle-cerebral-art/) | Starre Zeitvorgabe fraglich; strukturelle Neukalibrierung nötig. |
| Zeitmarken für Ödemereignisse | `cascade.ts:609–610,2157–2160` | 24–336h,Maximum2–5d | Verschlechterung kann vor24h eintreten | Festes Anzeigefenster fraglich; erhalten. |
| Kleinhirn-Raumforderung/maligner Verlauf | `cascade.ts:640–646,2704–2716` | 20mLWarnung;38mLmaligne;35.5%insgesamt;39.4%nachTag3 | 93raumfordernde Infarkte,33maligne;13/33(39.4%) nach3Tagen;38mL mit>50%Risiko verbunden,[Baki][cerebellum] | 20 Kalibrierung;38 als Prädiktor gestützt, als deterministischer Auslöser fraglich. Zitat ergänzt. |
| Bewusstsein bei Kleinhirninfarkt | `cascade.ts:646,659–680` | 48h;Koma90%des Maximums,Sopor67.5%,Benommenheit45% | Verhältnisse in der hinteren Schädelgrube aus supratentorieller Verlagerung übernommen, nicht validiert | Fraglich; erhalten. |
| Operationsergebnisse | `cascade.ts:2467–2468,2658–2659` | ≤48h,Alter≤60;1yÜberleben78gegen29%;mRS≤4 75gegen24% | [Gepoolte DECIMAL/DESTINY/HAMLET][surgery] | Für ausgewählte Population gestützt; zitieren und inklusive Altersgrenze korrigieren. Keine universelle volumenbasierte Indikation. |
| Unbehandelter maligner Verlauf | `cascade.ts:2658–2659` | 43/55=78%Tod,Tage2–5;Überlebende Barthel60 | [Hacke](https://pubmed.ncbi.nlm.nih.gov/8929152/) | Historisches Kohortenzitat gestützt, keine individuelle Prognose. |
| Periläsionale Funktionsstörung | `recovery.ts:97–103` | ab6h/vollständig24h;Rand.35,Verstärkung.7 | Keine validierte universelle Beziehung | Fraglich; erhalten. |
| Diaschisis | `recovery.ts:105–108` | Tiefe.2,Anstieg12h,Abklingen240h | Variabler regionaler Verlauf | Fraglich; erhalten. |
| Kompensationskinetik | `recovery.ts:113–120` | ab24h;τ720h,langsam2880h/Anteil.15,schnell168h;~90%Plateau90d | Frühe Verbesserung konzentriert in6–10wk,[Kwakkel](https://pubmed.ncbi.nlm.nih.gov/16931787/) | Koeffizienten fraglich;~88.5% ist Modellarithmetik, keine klinische Schätzung. |
| Funktionelle Schwellen | `recovery.ts:122,142,160–184,301–309` | tot25%,Untergrenze kompakter Bahnen15%,bemerkbar.35;Schwere.35+.65×min(1,level/.8);CST-Verlust25–50%,Schwere1.5–2.5;Zusammenfassung5% | Kein universelles Gesetz von Gewebeanteil zu Defizit | Fraglich; erhalten. |
| Klinische Einstufung | `clinical.ts:69,77,79,150,659,713,732,823,841` | Anzeige25%;Koma-Umbenennung14d;ausgedehnt50%;Grenzzone⅔;Makula<75%relativer Verlust;schwere Parese2.5 | Quantisiertes Phänotypmodell | Fraglich; erhalten. |
| Bilateraler Schaden | `clinical.ts:108–120`; `cascade.ts:618,3939–3975` | ⅔Hemisphäre/MCA→DOC nach2wk;ECD77%;49Autopsien | LHI≥⅔MCA-Definition,[Huang](https://pubmed.ncbi.nlm.nih.gov/32705419/);77% ist dessen Hintergrundzitat, nicht Ergebnis der30-Patienten-EEG-Kohorte;49Autopsien betreffen gemischte traumatische/nichttraumatische VS,[Adams](https://pubmed.ncbi.nlm.nih.gov/10869046/); Prognose[AAN][aan] | Definitionszitat gestützt; ursprüngliche Bezugsgröße der77% nicht unabhängig festgestellt; Autopsien validieren keine deterministische Prognose anhand der Infarktausdehnung. Beide Sprachfassungen kennzeichnen77% jetzt als Hintergrund; Modellregel bleibt fraglich. |
| Aphasieübergang | `clinical.ts:159–160` | 59% wechseln Typ innerhalb1y,meist2wk | [Im Code zitierte Quelle](https://pubmed.ncbi.nlm.nih.gov/3191724/) | Studienspezifisches Zitat gestützt; erhalten. |
| Medulläre Fazialisparese | `recovery.ts:240–243` | 8/33,leicht,bisEntlassung verschwunden | [Kanbayashi/Sonoo](https://d-nb.info/1241917256/34) | Zitat aus primärem Volltext gestützt; erhalten. |
| NIHSS-Itemgrenzen | `clinical.ts:1022–1158` | 1a3,1b2,1c2,Blick2,Sehen3,Gesicht3,Armeje4,Beineje4,Ataxie2,Sensibilität2,Sprache3,Dysarthrie2,Neglect2;gesamt42 | [Offizielle NINDS NIHSS][nihss] | Skalenmaxima gestützt; abgeleitete Bewertung ist ungefähr. |
| NIHSS-Kategorien/Vorbehalt | `clinical.ts:1162–1168` | 0/1–4/5–15/16–20/>20;posteriorer Hinweis≤6;zitiert posterior≤5/anterior≤8 | [Sato](https://pubmed.ncbi.nlm.nih.gov/18434640/) | Zitierte Prognosegrenzen gestützt;≤6-Hinweis und Kategoriegrenzen sind Anzeigeentscheidungen, keine Eignungskriterien. |

`edemaTypes.ts` und `recoveryTypes.ts` geben ansonsten normalisierte 0–1-Ausgabebereiche und Beispiele an; sie führen keine weiteren gemessenen physiologischen Konstanten ein. Importierte anatomische Erholungsprofile und Tabellen zum Symptombeginn liegen außerhalb dieser ausschließlich auf die Engine bezogenen Prüfung.

<a id="treatment-windows-and-other-numerical-narratives"></a>
## Behandlungsfenster und weitere numerische Beschreibungen

| Wert | Ort (`cascade.ts`, sofern nicht anders angegeben) | Aktuell / Literaturvergleich | Bewertung | Maßnahme |
|---|---|---|---|---|
| Standard-IVT/ausgewählte EVT | 1541–1544,1584–1587,1659–1660 | 4.5h;früh6h;ausgewählt24h,[AHA/ASA2026][aha] | Mit Auswahlvorbehalten gestützt | Erhalten; neue Tests beider Sprachen. |
| DEFUSE-3-Referenz, keine implementierte Zugangsschwelle | `tissue.ts:10–19`;treatment narratives | 6–16h,Kern<70mL,Mismatch≥15mL,Verhältnis≥1.8,Tmax>6s,[DEFUSE-3][defuse] | Keine entsprechende Engine-Schwelle | Nicht behaupten, rCBF.55 implementiere den Studien-Mismatch. |
| DAWN-Referenz, keine implementierte Zugangsschwelle | treatment narratives | 6–24h;Alter≥80 NIHSS≥10 Kern<21mL;Alter<80 NIHSS≥10 Kern<31mL oder NIHSS≥20 Kern31–<51mL,[DAWN][dawn] | Keine entsprechende Engine-Schwelle | Historische Eignung nicht als universellen aktuellen Ausschluss einsetzen. |
| IVT-Hinweis bei kürzlichem Schlaganfall | 1564–1570 | 24–2160h≈3mo;Register293,16.3gegen4.8%innerhalb14d, bestätigt [Shah](https://pubmed.ncbi.nlm.nih.gov/31903770/) | Registerzitat gestützt; vereinfachte Zeitmarke fraglich | Vorbehalt individueller Beurteilung erhalten; [AHA/ASA][aha]. |
| Anzeige großen Infarktkerns | 1486,1590–1600 | Kennzeichnung≥70mL;SELECT2≥50;ANGEL70–100in ausgewählten Schichten;ASPECTS3–5 | Allgemeine70mL-Definition fraglich; Studienwerte spezifisch,[SELECT2][select2] | Aussage zur Obergrenze korrigieren; Kennzeichnungsheuristik erhalten. |
| Blutung bei großem Infarktkern | 1595–1599 | ANGEL6.1gegen2.7%;LASTE9.6gegen5.7% | [ANGEL](https://doi.org/10.1056/NEJMoa2213379), [LASTE](https://doi.org/10.1056/NEJMoa2314063) | Raten bestätigt; behauptete gesicherte Zunahme symptomatischer Blutungen wäre falsch | Beide Sprachfassungen nennen nun numerisch höhere Werte; kein Unterschied statistisch schlüssig. Zunahme beliebiger ICH studienabhängig; prozedurale Gefäßkomplikationen behandlungsassoziiert. |
| Basilarisstudien | 1608–1615,3122 | ATTENTION≤12h,BAOCHE6–24h;ATTENTION NIHSS≥10;BAOCHE anfangs≥10,nach61Patienten auf≥6 erweitert;IVT34/21%;Mortalität37gegen55/31gegen42%;gutes Ergebnis ohne Rekanalisation~2% | Fenster und zitierte Studienraten bestätigt,[ATTENTION][attention]/[BAOCHE][baoche];≥10 nicht als gesamte geänderte BAOCHE-Einschlusspopulation lesen | Erhalten; keine Gewebe-τ ableiten. |
| IVT bei lakunärem Schlaganfall | 1660 | WAKE-UPposthoc31/53(59%)gegen24/52(46%),mRS0–1 nach90d;aOR1.67[.77–3.64] | [Barow/WAKE-UP](https://doi.org/10.1001/jamaneurol.2019.0351) | Raten gestützt; „keine Behinderung“ überzeichnet mRS0–1; fehlende Interaktion beweist keine gleichwertige Wirksamkeit | Beide Sprachen nun „keine wesentliche Behinderung“ (mRS0–1); Unsicherheit explorativer Teilgruppe erhalten. |
| Abgeleiteter IVT-Beginn | 758–770 | Wiedereröffnung1–3hnach Medikament,Beurteilung~2h | Beurteilungszeitpunkt bestimmt nicht biologische Wiedereröffnungslatenz | Fraglich | Modellannahme erhalten; nicht als tatsächliche Medikamentengabezeit verwenden. |
| Reperfusionskategorien/No-Reflow | `treatment.ts:40–56,170–176` | 2a.25∈1–49%;2b50.58∈50–66%;2b67.78∈67–89%;2c.95∈90–99%;3=1;noReflow0–.5 | Bereiche [eTICI][etici] gestützt; repräsentative Werte/No-Reflow-Obergrenze Annahmen | Gültige Bereiche erhalten;Grad1 korrigiert; Bereiche in Tests fixieren. |
| Embolien in neue Versorgungsgebiete | `treatment.ts:96–100`;1080 | ACA27.8%der Infarkte in neuen Gebieten;insgesamt5–9% | [Singh](https://pubmed.ncbi.nlm.nih.gov/37082967/):103/1092INT,berichtet9.3%;meiste(91/103) ohne angiographisch sichtbaren Verschluss | ACA-Zitat gestützt; allgemeine5–9% ungefähr/definitionsabhängig | WederACA27.8%aller EVT-Patienten noch validierte Inzidenz des modellierten sichtbaren distalen Embolus. |
| Nutzenkennzeichnungen | 807–832 | NIHSS-Differenz2,gerettet50mL,kleiner Anteil.5mL/10%,LIS24h | Keine Leitlinienentsprechung | Fraglich | UI-Schwellen erhalten. |
| Spontane Rekanalisation | 971–974 | 24%,IVT46%,OR4.4,53Studien | [Rha/Saver](https://pubmed.ncbi.nlm.nih.gov/17272772/) | Gerundete24.1/46.2% gestützt; Ergebnis-OR4.43 aus33Studien/998Patienten, nicht allen53 | Historische Quellenzuordnung erhalten. |
| Otologische Vorzeichen | 1218 | 13/82innerhalb1mo;9/29verzögerte ZNS-Zeichen | [Lee2009](https://doi.org/10.1161/STROKEAHA.109.564682), [Lee/Baloh][hearing] | Studienspezifisch gestützt | Erhalten. |
| Kombiniertes otologisches Defizit | 1232,1255 | 60%von82;56/62kalorische Schwäche | [Lee2009](https://doi.org/10.1161/STROKEAHA.109.564682), [Kim](https://pubmed.ncbi.nlm.nih.gov/24581671/) | Gestützt | Erhalten; Nachbeobachtung der Hörerholung/MRT-Population oben korrigiert. |
| Beginn/Erholung bei Rückenmarkinfarkt | 1289,1316 | 115Patienten;86%Katheter;68%Tiefpunkt innerhalb1h;23%verstorben~3y;Überlebende42%Rollstuhl,54%Katheter,29%Schmerz;41%gehen wieder | [Robertson][cord1] | Kohorte gestützt; Gehfähigkeit bezogen auf74Rollstuhlnutzer beiEntlassung,nicht amTiefpunkt; Nachbeobachtung durchschnittlich3Jahre | Kohortenrahmen erhalten. |
| Rückenmarkdiagnostik | 1289,1303 | 133;77%Tiefpunkt innerhalb12h;40%stiftförmig,65%Eulenaugen;19/29DWI;24%anfängliches MRT normal;20%Gefäßbefund | [Zalewski][cord2] | Zahlen gestützt; Bezugsgrößen oben korrigiert | Prozentsätze erhalten. |
| Beschreibung neuronalen Ausfalls/Wachstums | 1424,1999 | 10sFunktionsausfall;Striatum30min;Kapsel2–3h;Kortex15–30minAffen;PenumbraStunden–Tag;Median3–5mL/h,schlecht>10 | Spezies-/flussabhängig; [Wachstumsstudien][growth1] | Deterministische Zeitvorgaben fraglich | Bestehende Vorbehalte erhalten. |
| CT/DWI-Ereigniszeitmarken | 2009,2019,3615–3631 | DWI.1h–336h;CT~6h;Fogging2–3wk;ADCWoche1niedrig/Woche2pseudo;Höhle1mo | [Lansberg][adc] stützt ADC; andere Zeitvorgaben variabel | Starre Grenzen fraglich | Keine universelle6h-CT-Schwelle abgeleitet. |
| Verschlechterung | 2359 | 53Patienten;36%bis24h,68%bis48h,TodesgipfelTag3 | [Qureshi](https://experts.umn.edu/en/publications/timing-of-neurologic-deterioration-in-massive-middle-cerebral-art/) | Zahlen gestützt; ausgewählte Kohorte mit Verschlechterung, nun in beiden Sprachen klargestellt | Erhalten; widerspricht jeder universellen frühesten Verschlechterung anTag3. |
| Blutungsrisikostufen | 2888–2889,2919–2925 | 30/70/100mL;spät6h;IVTsICH2–7%,24–36h/bis7d | Definitionen variieren,[AHA/ASA][aha] | Deterministische Stufung fraglich | Nur didaktische Warnungen erhalten. |
| Locked-in-Prognose | 2979–2980 | Mortalität60%von139;Rehabilitation14Patienten42%Schlucken/28%Sprache | Kleine historische ausgewählte Kohorten; [Patterson/Grabois](https://pubmed.ncbi.nlm.nih.gov/3738962/), [Casanova](https://pubmed.ncbi.nlm.nih.gov/12808539/) | Historische ausgewählte Kohorten gestützt | Quellenzuordnung erhalten; keine universelle Überlebensvorhersage. |
| Zentrales Fieber | 3042–3043 | 39°C;74Patienten4%Kortex/3%BAO;4/9Hirnstammkoma;70%1moMortalität | [Sung](https://pubmed.ncbi.nlm.nih.gov/19521083/), [Parvizi](https://pubmed.ncbi.nlm.nih.gov/12805123/) | Studienzitate gestützt | Englische39°C-Grenze als einschließlich klarstellen. |
| Medulläres Atemversagen | 3095 | 2–6%;8/102innerhalb10d;5/43akut | [Pavsic](https://pubmed.ncbi.nlm.nih.gov/32064553) zitiert2–6%im Hintergrund,nicht als Ergebnis seiner28-Patienten-Schlafstudie; [Saito](https://pubmed.ncbi.nlm.nih.gov/35091384/):8/102tödliches Atemversagen; [Norrving](https://doi.org/10.1212/WNL.41.2_Part_1.244):5/43respiratorische oder kardiale Todesfälle | Zugeschriebene Raten mit diesen Unterschieden gestützt;2–6%hier nicht unabhängig gepoolt | Quellenzuordnung zu älteren Serien im aktuellen Text erhalten; ursprüngliche zugrunde liegende2–6%-Serien nicht alle unabhängig beschafft. |
| Dysphagiewarnung | 3161,3191–3211 | supratentoriell>60mL;Prävalenz37–78% | Prävalenz37–45%bei Screening,51–55%klinisch,64–78%instrumentell,[Martino][dysphagia]; Screening gilt breit,[AHA/ASA][aha] | Grenze zur Auswahl der Warnung fraglich | Keine klinische Screening-Ausnahme unter60mL. |
| Kardiales Risiko | 3217–3290;`simulate.ts:1473,1695` | Insula30%,NIHSS≥16;846Patienten19%,4.1%,Tage2–3/Woche2;AF23.7% | [Prosser](https://pubmed.ncbi.nlm.nih.gov/17569877/), [Sposato](https://pubmed.ncbi.nlm.nih.gov/25748102/) | Studienraten gestützt;30%/NIHSS16-Auslöser fraglich. AF23.7% ist gepoolte geschätzte kombinierte Nachweisrate bei Schlaganfall oder TIA über aufeinanderfolgende stationäre/Nachbeobachtungsphasen | Warnheuristiken erhalten; AF-Monitoring-Bezugsgröße in beiden Sprachen klären. |
| DVT | 3301–3318;`simulate.ts:1482–1485` | Tage2–30;IPC12.1→8.5%proximale DVT30d | [CLOTS3](https://doi.org/10.1016/S0140-6736(13)61050-8) | Raten bei immobilen Schlaganfallpatienten(1438jeArm) gestützt;festes Fenster fraglich | Erhalten. |
| Frühe Anfälle | 3324–3354 | 7d-Grenze;lobär5.9/tief.6%;kortikal6.5%;HT12.5%=4/32 | [Labovitz][seizure1], [Kilpatrick](https://pubmed.ncbi.nlm.nih.gov/2302087/), [Beghi](https://pubmed.ncbi.nlm.nih.gov/21975208/) | Studienraten gestützt | Status-Bezugsgröße oben korrigieren. |
| Späte Anfälle | 3355–3371 | >7d;4%1y/8%5y;SeLECT.7–63%1y | [Galovic](https://pubmed.ncbi.nlm.nih.gov/29413315/) | Bereich des Vorhersagemodells gestützt; nicht alle Patienten | Erhalten. |
| CCD | 1674–1676,3457–3493 | Kortex30mL,Beginn6h;PET58%;thalamisch9/39 | [Pantano](https://pubmed.ncbi.nlm.nih.gov/3488093/)58%derAufnahmen; [Thalamus-MRT](https://pmc.ncbi.nlm.nih.gov/articles/PMC3914872/)9/39 | Zitate gestützt;30mL/6h-Auslöser fraglich | Kalibrierung erhalten. |
| Zeitmarken für Waller-Degeneration/HOD | 3513–3580,688 | DTI1–2wk,T2dunkel4wk/hell10–14wk;MCP1mo;HODT2~1mo,Vergrößerung6mo;38–67%von15;palatal3mo | [Kuhn](https://pubmed.ncbi.nlm.nih.gov/2740501/) bestätigt konventionellen CST-MRT-Zeitverlauf,nicht DTI- oder MCP-Intervalle; [Goyal](https://pubmed.ncbi.nlm.nih.gov/10871017/) bestätigt HODT2~1mo mit Fortbestehen≥3–4y und Rückbildung der **Hypertrophie** nach3–4y; [Steidl](https://doi.org/10.3389/fneur.2022.950191) bestätigt sequenz-/beurteilerabhängige38–67% | Teilweise bestätigt; ursprüngliches pauschales „OK“ überzeichnet | Qualifizierten Text erhalten;DTI1–2wk,MCP1mo und genaue palatale3mo-Zeitmarke nicht durch diese Zitate begründet. T2-Signal verschwindet nicht zwingend mit der Vergrößerung. |
| Depression/Kognition | 3649–3655 | 31%;39–52%5y;2950Patienten12Kohorten | [Hackett][depression], [Ayerbe](https://doi.org/10.1192/bjp.bp.111.107664), [Weaver](https://pubmed.ncbi.nlm.nih.gov/33901427/) | Depressionsschätzungen gestützt; Weavers „ungefähr die Hälfte in1y“ ist Hintergrund, gemessen wurden1286/2950=43.6%,beurteilt bis15mo | Beide Sprachfassungen zitieren nun gemessene43.6%und15mo-Population. Demenzpopulationen bleiben verschieden. |
| BP | 575,3683–3684 | MAP120≈170/95;IVTvor185/110,nach180/10524h;IST17398,Tiefpunkt150,+4.2%/10;Vasopressorstudie153;nachEVT SBP<120vermeiden | [AHA/ASA][aha]; [IST](https://pubmed.ncbi.nlm.nih.gov/11988609/); [Vasopressorstudie](https://pubmed.ncbi.nlm.nih.gov/31645472/); [ENCHANTED2/MT](https://pubmed.ncbi.nlm.nih.gov/36341753/);MAP=(170+2×95)/3=120 | Arithmetik und zitierte Studienassoziationen gestützt;2026-Leitlinie verwendet<185/110vorIVT,<180/105für≥24hnachIVT und≤180/105während/24hnachEVT; warnt auch gegen intensivesSBP-Ziel<140für72hnach erfolgreicher anteriorerEVT | ENCHANTED2/MT<120-Ergebnis korrekt, deckt aktuelle Empfehlungen aber nicht vollständig ab. Vasopressorstudie schloss auch fortschreitende Schlaganfälle ein; monotoner Modellnutzen von hohemMAP bleibt fraglich. |
| Spastik | 3706;`clinical.ts:205–208` | 19%3mo;42.6%6mo,15.6%schwer;24.5%innerhalb2wk | [Sommerfeld](https://pubmed.ncbi.nlm.nih.gov/14684785/), [Urban](https://pubmed.ncbi.nlm.nih.gov/20705930/), [Wissel](https://pubmed.ncbi.nlm.nih.gov/20140444/) | Populationsspezifisch gestützt:Urban6mo211erneut untersuchte Patienten anfangs mitzentraler Parese,nicht alleSchlaganfälle | Gerundete43/16%und¼ erhalten. |
| Zentraler Schmerz | 3720–3729 | 8%1y;thalamisch1/7,genikulär1/4,⅓ersteWoche;lateraleMedulla¼innerhalb6mo | [Andersen](https://doi.org/10.1016/0304-3959(94)00144-4):16/207Überlebende≥6mo mitzuverlässiger Kommunikationsfähigkeit; [Nasreddine](https://pubmed.ncbi.nlm.nih.gov/9153442/):36%Woche1unter veröffentlichten Schmerzfällen; [MacGowan](https://pubmed.ncbi.nlm.nih.gov/9222179/):16/63LMI | Zahlen gestützt; „8%allerSchlaganfälle“ hatte falsche Bezugsgröße | BeideSprachen auf16/207ausgewählte Überlebende korrigiert; Vorbehalte zu Fallserien/Berichterstattung erhalten. |
| REM-Verhalten | 3748–3769 | 6/27nach3mo,5ventralePons1Medulla;keinRBDbei15PSG-Patienten | [Tang](https://doi.org/10.1186/1471-2377-14-88), [Tellenbach](https://doi.org/10.1111/jsr.13640) | Mit Unterscheidung Fragebogen/PSG gestützt | Erhalten; keinRBD≠keinREM-ohne-Atonie. |
| Steal-Symptome | 3790 | Arm-Blutdruckdifferenz40–50mmHg | [Labropoulos](https://pubmed.ncbi.nlm.nih.gov/20531004/) | Probabilistischer Zusammenhang gestützt, keine starre Diagnosegrenze | Probabilistische Formulierung erhalten. |
| Regionale Anteile und Anzeigeregeln | 1847,2973,3231,3356–3358,3512,3533,3553,3759;`simulate.ts:1264,2241,2699,2710,2745–2752` | .25/.3/.4/.5regionalerSchaden;20%Dominanz;50%Lakunen-Kern;bilateraleVerlagerung>.05mm | Interne Phänotyp-/Anzeigeregeln, keine klinischen diagnostischen Schwellen | Als medizinische Konstanten fraglich | Keine isolierten Ersetzungen; Gleitkomma-Epsilons ohne medizinische Bedeutung. |


<a id="derived-anatomical-volumes-per-vessel"></a>
## Abgeleitete anatomische Volumina je Gefäß

Dies sind **versorgungsgewichtete Volumina von Hirngefäßgebieten**, keine Vorhersagen des Infarktkerns. Das Infarktvolumen zu jedem Zeitpunkt ist `sum(bed.volume × infarct fraction)` (`simulate.ts:2771–2811`) und hängt von Verschlussdauer, Fluss, Kollateralen, Gewebetyp und Reperfusion ab. Ein einzelner Wert „Kern-mL je Gefäß“ lässt sich nicht begründen.

Methode: selbst angelegte übergeordnete Kanten, Kontinuität und Ursprünge am Mittelpunkt durchlaufen; rein visuelle Wege, nur für Varianten vorhandene Wege und Kollateralwege ausschließen; Verbindungswege nicht überqueren, ihre direkt versorgten Perforatoren aber erhalten. `bed.volume × normalized supply share` aufsummieren. Übergeordnete und nachgeschaltete Gebiete überlappen; Vertebralarterien teilen den Basilarisbaum. Zeilen dürfen nicht addiert werden. Werte für Reproduzierbarkeit auf0.001mL gerundet, nicht für klinische Präzision. Anatomiequellen: `anatomy/index.ts:53,63,70`, `anatomy/expand.ts:45`, `anatomy/territories.ts:4`; Gefäßdefinitionen ACA`vessels.ts:478`,MCA`:668`,Basilaris`:1274`,PCA`:1592`.

[CT-Zuordnung von Gefäßgebieten][territory] berichtet gepoolte seitenbezogene Gebietsmediane bei **19 Patienten ohne Gefäßverschluss** (nicht allen167 Eingeschlossenen): ACA154[IQR125–193],MCA350[322–396],PCA180[151–214]mL. Modell ACA≈139–144,MCA≈297–308,PCA≈90–93mL. **Fraglich**, besonders PCA: Unterschiedlicher Atlas, Hirnnormalisierung und Zuordnungsmethoden erlauben nicht, Kohorten-IQRs als zwingende Grenzen zu behandeln. Der [Liu-Atlas][atlas] liefert Topologie, keine Validierung dieser normalisierten Volumina je Gefäß. Alle Astzeilen teilen diese Bewertung; **unverändert** bis zu einer anatomisch kohärenten Neukalibrierung.

| Gefäßbasis | Rechts mL | Links mL | Mittellinie/andere mL |
|---|---:|---:|---|
| brachiocephalic | | |756.730|
| subclavian_prox_r / subclavian_prox_l |305.819|306.784| |
| subclavian_dist |0|0| |
| cca_r / cca_l |450.911|457.034| |
| ica_cervical |450.911|457.034| |
| eca,eca_facial,eca_sta,eca_maxillary,eca_occipital |0|0|Extrakranielles Gewebe ausgeschlossen|
| va_extracranial |305.819|306.784| |
| ica_petrous_cavernous |450.911|457.034| |
| ophthalmic |0|0|Retina vom Gehirn ausgeschlossen|
| ica_ophthalmic_seg |450.911|457.034| |
| ica_terminal |449.595|455.873| |
| acha |9.016|8.621| |
| aca_a1 |143.853|138.960| |
| acomm | | |0; Verbindungsweg ausgeschlossen|
| heubner |7.593|7.360| |
| aca_a2 |136.261|131.601| |
| aca_frontopolar |20.687|18.689| |
| aca_callosomarginal |68.401|67.853| |
| aca_pericallosal |47.173|45.059| |
| aca_paracentral |20.843|20.208| |
| mca_m1 |296.726|308.291| |
| lenticulostriate |17.459|16.581| |
| mca_temporal_anterior |14.932|13.379| |
| mca_m2_sup |147.507|156.353| |
| mca_m2_inf |116.828|121.978| |
| mca_orbitofrontal |16.828|18.853| |
| mca_prefrontal |58.468|63.181| |
| mca_precentral |22.928|22.021| |
| mca_central |19.411|21.015| |
| mca_ant_parietal |23.016|24.369| |
| mca_post_parietal |10.166|10.371| |
| mca_angular |24.112|24.159| |
| mca_temporooccipital |11.587|14.575| |
| mca_temporal_posterior |17.266|19.630| |
| mca_temporal_middle |49.922|49.431| |
| pcomm,tuberothalamic |1.316|1.161|Nur direkte Versorgung|
| trigeminal_persistent |—|—|Nur Variante, kein Standardvolumen|
| va_v4_prox |305.819|306.784| |
| va_v4_dist |271.397|271.572| |
| lat_medullary_perf |.761|.937| |
| asa_root |.755|.754| |
| asa | | |0Gehirn;Rückenmarkgewebe ausgeschlossen|
| pica |34.422|35.212| |
| pica_medial |4.511|4.577| |
| pica_lateral |29.615|30.271| |
| basilar_lower | | |269.748|
| basilar_mid | | |245.312|
| basilar_upper | | |241.410|
| basilar_tip | | |185.352|
| aica |11.404|11.478| |
| labyrinthine |0|0|Ohr ausgeschlossen|
| pontine_paramedian_inferior |.760|.793| |
| pontine_paramedian_caudal |1.524|1.585| |
| pontine_paramedian_rostral |2.727|2.745| |
| pontine_circumferential |.392|.402| |
| sca |24.917|25.669| |
| sca_medial |4.291|4.889| |
| sca_lateral |19.546|19.694| |
| mesencephalic_perf |.830|.789| |
| pca_p1 |90.377|93.356| |
| thalamoperforator |1.203|1.533| |
| quadrigeminal |.475|.498| |
| pca_p2 |88.700|91.325| |
| thalamogeniculate |3.504|3.431| |
| posterior_choroidal |3.416|3.372| |
| pca_temporal |17.994|17.497| |
| pca_calcarine |32.217|36.497| |
| pca_parietooccipital |31.266|30.239| |
| pca_splenial |3.777|4.539| |

Kollateralwege haben kein unabhängiges festes Gewebevolumen: beidseits `lepto_aca_mca_{precentral,central,parietal,frontal,orbital}`, `lepto_pca_mca_{parietal,superior_parietal,occipital,temporal}`, `lepto_aca_pca_callosal`, `lepto_pica_aica`, `lepto_aica_sca`, `lepto_pica_sca_{lateral,vermian}`, `coll_acha_pchor`, `coll_ec_ic_{orbital,meningeal}`, `coll_occipital_va`, zusätzlich mittig `lepto_pica_crossed` und `lepto_sca_crossed`.

<a id="verification-and-limits"></a>
## Verifikation und Grenzen

Unabhängige Abdeckung: Jede Tabellenzeile wurde erneut geprüft. Zitate gemessener Werte wurden anhand des zitierten Primärquellen-Abstracts/Volltexts oder indizierten Primärquellentexts überprüft; exakte unvalidierte Koeffizienten bleiben fraglich. Die139 numerischen Anatomieeinträge wurden unabhängig aus importierter Anatomie und selbst angelegten Graphkanten neu berechnet:139/139 stimmen innerhalb der0.00051mL-Rundung überein. Auch Hirnvolumen1250.8mL und Gesamtfluss557.0384059826916mL/min werden reproduziert. Dies belegt Modellarithmetik, nicht anatomische Gültigkeit.

Testprüfung: eTICI-Grenzen sind wörtlich veröffentlichte Prozentsätze; die Prüfung fehlender Rettung vergleicht behandelte und unbehandelte Simulationen. Eine neue Textzusicherung zu Grad1 scheiterte auf HEAD (1fehlgeschlagen/19bestanden) vor der Korrektur. Die30%-Schwelle prüft nun Verhalten knapp darunter/darüber. Die Literale der Verlagerungsbereiche stammen tatsächlich von Ropper, doch weder diese Prüfung noch Standardoperation≤48h begründet klinische Gültigkeit. Der ADC-Test der halben Kurve wurde fälschlich als veröffentlichte Grenze dargestellt; nun ausdrücklich illustrative Modellregression mit separater DWI-Shine-through-Prüfung. Zeichenfolgenprüfungen sichern zweisprachige Formulierungen, nicht Studienwirksamkeit.

Die ursprüngliche Verifikationshistorie des Commits ist keine unabhängige Evidenz:9fcab32 selbst änderte codexReview1.test.ts entgegen dem ursprünglichen letzten Satz. Diese Nachprüfung lässt jene Datei unverändert und erstellt keinen Commit. Unabhängige abschließende Verifikation des korrigierten Codes: `npx tsc --noEmit` endete mit0; `npx vitest run` endete mit0 bei90/90Dateien und10,019/10,019bestandenen Tests (507.97s), einschließlich20Tests medizinischer Werte und5unveränderter codexReview1-Tests. Arbeitsdatei- und HEAD-Blob-Hashes sind beide `b8b7762457460d77d240fd9cf1c6becb2aace3cb`. Warnungen zu jsdom-Canvas und React act sind nicht fehlschlagend.

Dies ist eine numerische Quellenprüfung, keine klinische Validierung. Unvalidierte Kalibrierungen bleiben fraglich, selbst wenn die motivierenden Kohortenzahlen bestätigt sind. Die Stützung eines qualitativen Mechanismus validiert nicht den hier verwendeten exakten Koeffizienten. Wesentliche offene Arbeiten sind regionale Kinetik, Atlas-/Volumenkalibrierung, probabilistische Schwellung/Herniation und regionale Neuronendichte. Solche Änderungen erfordern eine gesondert genehmigte Phase unter der Grenze von fünf Dateien.

[etici]: https://doi.org/10.1136/neurintsurg-2018-014127
[select2]: https://www.nejm.org/doi/full/10.1056/NEJMoa2214403
[selectprotocol]: https://pubmed.ncbi.nlm.nih.gov/34282987/
[strive]: https://discovery.ucl.ac.uk/10173196/1/STRIVE-2_Manuscript_accepted.pdf
[aan]: https://pmc.ncbi.nlm.nih.gov/articles/PMC6139814/
[surgery]: https://pubmed.ncbi.nlm.nih.gov/17303527/
[cord1]: https://pubmed.ncbi.nlm.nih.gov/22205760/
[cord2]: https://pubmed.ncbi.nlm.nih.gov/30264146/
[hints]: https://pubmed.ncbi.nlm.nih.gov/19762709/
[hearing]: https://pubmed.ncbi.nlm.nih.gov/15607217/
[seizure1]: https://doi.org/10.1212/WNL.57.2.200
[dementia]: https://pubmed.ncbi.nlm.nih.gov/19782001/
[depression]: https://pubmed.ncbi.nlm.nih.gov/25117911/
[cbf]: https://pubmed.ncbi.nlm.nih.gov/21980202/
[defuse]: https://www.nejm.org/doi/full/10.1056/NEJMoa1713973
[dawn]: https://www.nejm.org/doi/full/10.1056/NEJMoa1706442
[aha]: https://www.ahajournals.org/doi/10.1161/STR.0000000000000513
[growth1]: https://pmc.ncbi.nlm.nih.gov/articles/PMC4478123/
[growth2]: https://pubmed.ncbi.nlm.nih.gov/34493575/
[growth3]: https://pubmed.ncbi.nlm.nih.gov/33262233/
[capsule]: https://pubmed.ncbi.nlm.nih.gov/33827247/
[attention]: https://doi.org/10.1056/NEJMoa2206317
[baoche]: https://doi.org/10.1056/NEJMoa2207576
[retina]: https://pubmed.ncbi.nlm.nih.gov/15106952/
[neurons1]: https://pubmed.ncbi.nlm.nih.gov/16339467/
[neurons2]: https://doi.org/10.1161/STROKEAHA.118.023499
[atlas]: https://www.nature.com/articles/s41597-022-01923-0
[territory]: https://link.springer.com/article/10.1007/s00234-022-03034-4
[adc]: https://pmc.ncbi.nlm.nih.gov/articles/PMC7976036/
[shift]: https://pubmed.ncbi.nlm.nih.gov/3960059/
[malignant]: https://pubmed.ncbi.nlm.nih.gov/10978048/
[cerebellum]: https://doi.org/10.1136/svn-2024-003360
[nihss]: https://www.ninds.nih.gov/sites/default/files/2025-03/KnowStroke_NIHStrokeScale_March2025_508c.pdf

[lacunevolume]: https://pmc.ncbi.nlm.nih.gov/articles/PMC7650076/
[dysphagia]: https://pubmed.ncbi.nlm.nih.gov/16269630/
[fastgrowth]: https://pubmed.ncbi.nlm.nih.gov/33280550/

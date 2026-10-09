[繁體中文](contralateral-pressure.zh-TW.md) · [简体中文](contralateral-pressure.zh-CN.md) · [English](contralateral-pressure.md) · [Deutsch](contralateral-pressure.de.md) · [日本語](contralateral-pressure.ja.md)

<!-- source-doc: docs/contralateral-pressure.md; sha256: 8fcad3a100b8ded60e089c0e8539aebb4867efe3d2d0af2a8956e2aa2ed0fa3a -->

<a id="contralateral-pressure-safeguard"></a>
# Numerische Begrenzung des kontralateralen Druckgewinns

Dies ist eine begrenzte numerische Schutzmaßnahme für das didaktische Blutflussmodell. Sie ist weder ein neues physiologisches Autoregulationsmodell noch die allgemeine Behauptung, dass ein Verschluss in der gegenüberliegenden Hemisphäre einem anderen Versorgungsgebiet keinen Nutzen bringen kann.

<a id="why-use-a-numerical-fallback"></a>
## Warum ein numerisches Ersatzverfahren?

Ursino und Lodi beschreiben in ihrem [Modell der zerebralen Autoregulation von 1998](https://journals.physiology.org/doi/abs/10.1152/ajpheart.1998.274.5.H1715) einen annähernd stabilen Blutfluss im „CPP-Bereich von 50–150 mmHg“. Dieser Bereich betrifft den zerebralen Perfusionsdruck und ist keine direkte MAP-Grenze für jedes Gefäß im Graphen. Die proximale piale Regulation und die distale Flussregulation wirken über die Gefäßmechanik.

Eine [veröffentlichte Implementierung dieser Modellfamilie](https://pmc.ncbi.nlm.nih.gov/articles/PMC2673531/) nennt in Tabelle 1 die proximale Verstärkung „G₁ = 0.02 mmHg⁻¹“. Im stationären Zustand verwendet der Regler die Abweichung des arteriellen Drucks abzüglich des intrakraniellen Drucks von einem Referenzwert. Die Aktivierung verändert die Spannung der glatten Muskulatur; der Radius ergibt sich anschließend aus der Wandmechanik, und der Widerstand hängt von der vierten Potenz des Radius ab. Diese Werte definieren keine Verstärkung, mit der sich die Widerstände benannter ICA-, ACA- oder MCA-Gefäße direkt multiplizieren lassen.

Dem aktuellen Netzwerk fehlt diese Kopplung an die Wandmechanik auf Kompartimentebene. Würde die veröffentlichte Verstärkung unmittelbar als Widerstandsmultiplikator verwendet, wäre die fehlende Kalibrierung erfunden. Deshalb verwendet diese Änderung das genehmigte numerische Ersatzverfahren und erhält die bestehenden Gewebekonstanten und die Läsionskalibrierung.

<a id="scoped-counterfactual-comparison"></a>
## Begrenzter kontrafaktischer Vergleich

Die Schutzmaßnahme greift, wenn hemisphärenspezifische Verschlüsse auf gegenüberliegenden Seiten gemeinsam auftreten. Für jede empfangende Hemisphäre enthält ein Referenzkreislauf weiterhin deren eigene Verschlüsse, während die Verschlüsse der gegenüberliegenden Hemisphäre entfernt werden. Verschlüsse der Vertebralarterien, der A. basilaris und anderer gemeinsam genutzter Gefäße bleiben in der Referenz erhalten; sie gelten nicht als entfernbare Läsionen der Gegenseite.

Die Referenzen verwenden denselben MAP, dieselben anatomischen Varianten und denselben Kollateralgrad wie der gemeinsame Kreislauf. Ein positiver vorwärts gerichteter Kollateralfluss in jeder Referenz liefert eine wechselseitige Grenze: Jede Hemisphäre kann sowohl Spenderin als auch Empfängerin sein. Die tatsächliche Kollateralleitfähigkeit wird bei Bedarf reduziert, um einen druckbedingten Anstieg über die Referenz hinaus auszuschließen. Ein Weg ohne positiven vorwärts gerichteten Referenzfluss, einschließlich eines neu umgekehrten Weges, behält seine ursprüngliche Leitfähigkeit.

Die Schutzmaßnahme begrenzt außerdem den Empfängerdruck numerisch über die Leitfähigkeiten der benannten Arterien, die jede Hemisphäre versorgen. Diese Obergrenzen verwenden die entsprechenden Referenzdrücke; sie sind keine physiologischen Autoregulationsschwellen. Die Leitfähigkeit kann sich wieder ihrem ursprünglichen Wert annähern, wenn eine Grenze keine Reduktion mehr verlangt, diesen ursprünglichen Wert jedoch nicht überschreiten. Es wird keine physiologische Verstärkung abgeleitet oder hinzugefügt.

Der gesamte Kreislauf wird mit den angepassten Leitfähigkeiten erneut gelöst. Druck oder Fluss werden nach der Lösung nicht überschrieben; die Erhaltung bleibt eine ausdrückliche Anforderung. Der Randzufluss in der Erhaltungsdiagnostik umfasst sowohl die bestehende verborgene Versorgung vom Aortenbogen zum Arm als auch die angezeigten Gefäßwege.

Begrenzt wird nur ein positiver druckbedingter Gewinn. Ein Verlust an Kollateralunterstützung bleibt erhalten. Insbesondere kann ein kombinierter Verschluss die Unterstützung durch Kollateralspender beseitigen und den Infarktkern der neuen Läsion gegenüber derselben isolierten Läsion berechtigterweise vergrößern. Ein tatsächlich neu verfügbarer Kollateralweg wird nicht allein deshalb entfernt, weil eine weitere Läsion vorliegt. Dieser Vergleich ist eine modellspezifische Schutzmaßnahme gegen einen unbeabsichtigten Nutzen aus der Druckumverteilung; er bildet weder den zugrunde liegenden Autoregulationsmechanismus ab noch begründet er eine klinische Behandlungsregel.

<a id="verification-boundary"></a>
## Grenzen der Überprüfung

Regressionstests sollen das gezielt betrachtete Verhalten beider Hemisphären nachweisen, die Auswirkungen gemeinsamer Verschlüsse und echter Kollateralwege erhalten und die Flusserhaltung mit den angepassten Leitfähigkeiten prüfen. Die bestehenden Regressionen für einzelne Verschlüsse, Reperfusion und Gewebekalibrierung bleiben erforderlich. Der ROADMAP-Punkt wird erst nach Bestehen dieser Tests abgeschlossen.

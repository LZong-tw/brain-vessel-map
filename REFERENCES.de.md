[繁體中文](REFERENCES.zh-TW.md) · [简体中文](REFERENCES.zh-CN.md) · [English](REFERENCES.md) · [Deutsch](REFERENCES.de.md) · [日本語](REFERENCES.ja.md)

<!-- source-doc: REFERENCES.md; sha256: e10665b0f0ec0da16e2706bcbbc98d9c82db375679b9f642e10bcc9d6a1f2346 -->

<a id="參考文獻與相關專案--references"></a>
# Literatur und verwandte Projekte

Dieselben Listen erscheinen in der App („Quellen & Lizenzen“) und werden in `src/anatomy/sources.ts` gepflegt.
Lizenzangaben stehen in [`THIRD_PARTY_NOTICES.de.md`](THIRD_PARTY_NOTICES.de.md).

<a id="資料來源--data-sources"></a>
## Datenquellen

- **MNI ICBM 152 Nonlinear Asymmetric 2009c template (via TemplateFlow)** — Permissive McGill/MNI-Lizenz (Copyright-Hinweis erforderlich). Copyright (C) 1993–2004 Louis Collins, McConnell Brain Imaging Centre, Montreal Neurological Institute, McGill University. Fonov V et al., NeuroImage 2011;54:313–327; Fonov V et al., NeuroImage 2009;47:S102. Über TemplateFlow bereitgestellt (Ciric R et al., Nat Methods 2022). <https://www.templateflow.org/>
  - Oberflächen von Großhirn, Kleinhirn, Hirnstamm und tiefen Kernen, aus Wahrscheinlichkeitskarten und Segmentierungen mittels Marching Cubes erzeugt und vereinfacht.
- **DKT31 cortical labels in MNI152NLin2009cAsym (Mindboggle OASIS-TRT-20 joint fusion)** — CC BY 4.0. Klein A, Tourville J. 101 labeled brain images and a consistent human cortical labeling protocol. Front Neurosci 2012;6:171. Mindboggle-101 (Zenodo). <https://mindboggle.info/data>
  - Kortikale Einteilung nach Hirnwindungen; ordnet jeden Oberflächenpunkt einer funktionellen Region zu.
- **FreeSurfer aseg segmentation of MNI152NLin2009cAsym (TemplateFlow)** — Template-Lizenz (McGill/MNI-Hinweis). Fischl B et al. Neuron 2002;33:341–355 (FreeSurfer). Von TemplateFlow bereitgestellt. <https://www.templateflow.org/>
  - Segmentierung tiefer Strukturen (Thalamus, Nucleus caudatus, Putamen, Globus pallidus, Hippocampus und Amygdala), des Hirnstamms und des Kleinhirns.
- **MIAL67 probabilistic atlas of thalamic nuclei** — CC BY 4.0. Najdenovska E et al. In-vivo probabilistic atlas of human thalamic nuclei based on diffusion-weighted MRI. Sci Data 2018;5:180270. <https://doi.org/10.5281/zenodo.1241074>
  - Unterteilt den Thalamus in anteriore, paramediane, ventrolaterale und posteriore Gefäßversorgungsgebiete.
- **Digital 3D Brain MRI Arterial Territories Atlas** — CC BY-SA 4.0. Digital 3D Brain MRI Arterial Territories Atlas © 2021 The Johns Hopkins University. Liu CF, Hsu J, Xu X, et al. Sci Data 2023;10:74. <https://github.com/Chin-Fu-Liu/Arterial_Atlas>
  - Arterielles Versorgungsgebiet jedes Gewebevoxels (ACA-, MCA- und PCA-Untergebiete, lentikulostriäre, choroidale und Kleinhirnarterien) sowie die daraus ermittelten Grenzzonen.
- **Statistical atlas of cerebral arteries (multi-centre MRA)** — CC0 1.0. Mouches P, Forkert ND. A statistical atlas of cerebral arteries generated using multi-center MRA datasets from healthy subjects. Sci Data 2019;6:29. <https://doi.org/10.6084/m9.figshare.c.4215089>
  - Richtet von Hand angelegte Mittellinien an statistisch belegten Gefäßpositionen aus (Circulus arteriosus Willisii, A. basilaris, Aa. vertebrales, M1, A1/A2, P1/P2 …).

<a id="醫學與生理文獻--scientific-references"></a>
## Medizinische und physiologische Literatur

Schwellenwerte, Zeitverläufe und Syndromdefinitionen in `src/engine/` und `src/anatomy/` sind aus folgenden Quellen vereinfacht abgeleitet:

<a id="可定位的非運動症狀--localised-non-motor-symptoms"></a>
### Lokalisierbare nichtmotorische Symptome

Schlaf, emotionaler Ausdruck, Temperaturregulation und Schwitzen, Geschmack und Blasenkontrolle (`src/anatomy/symptoms.ts`, `src/anatomy/regions.ts`):

- Bassetti C, Mathis J, Gugger M, Lovblad KO, Hess CW. Hypersomnia following paramedian thalamic stroke: a report of 12 patients. Ann Neurol 1996;39:471–480. (Anhaltende Hypersomnie.)
- Bassetti CL. Sleep and stroke. Semin Neurol 2005;25:19–32. (Anhaltende Schlaf-Wach-Störungen durch Schäden des Thalamus oder Hirnstamms.)
- Bogousslavsky J, Khurana R, Deruaz JP, Hornung JP, Regli F, Janzer R, Perret C. Respiratory failure and unilateral caudal brainstem infarction. Ann Neurol 1990;28:668–673. (Verlust der automatischen Atmung — 2 Fälle.)
- Grau AJ, Buggle F, Schnitzler P, Spiel M, Lichy C, Hacke W. Fever and infection early after ischemic stroke. J Neurol Sci 1999;171:115–120. (Frühes Fieber ist überwiegend infektionsbedingt: Deshalb wird zentrales Fieber nur als Risikohinweis dargestellt.)
- Heckmann JG, Stössel C, Lang CJ, Neundörfer B, Tomandl B, Hummel T. Taste disorders in acute stroke: a prospective observational study on taste disorders in 102 stroke patients. Stroke 2005;36:1690–1694.
- Hermann DM, Siccoli M, Brugger P, Wachter K, Mathis J, Achermann P, Bassetti CL. Evolution of neurological, neuropsychological and sleep-wake disturbances after paramedian thalamic stroke. Stroke 2008;39:62–68. (Verlauf der Hypersomnie bei ein- gegenüber beidseitigen Läsionen; anhaltende frontale und kognitive Defizite nach allen beidseitigen, 90% der linksseitigen und 33% der rechtsseitigen Schlaganfälle.)
- House A, Dennis M, Molyneux A, Warlow C, Hawton K. Emotionalism after stroke. BMJ 1989;298:991–994.
- Kim BS, Kim YI, Lee KS. Contralateral hyperhidrosis after cerebral infarction. Clinicoanatomic correlations in five cases. Stroke 1995;26:896–899.
- Kim JS. Post-stroke emotional incontinence after small lenticulocapsular stroke: correlation with lesion location. J Neurol 2002;249:805–810.
- Kim JS, Choi-Kwon S. Poststroke depression and emotional incontinence: correlation with lesion location. Neurology 2000;54:1805–1810. (Lokalisationen pathologischen Weinens.)
- Kimura K, Tachibana N, Kohyama J, Otsuka Y, Fukazawa S, Waki R. A discrete pontine ischemic lesion could cause REM sleep behavior disorder. Neurology 2000;55:894–895. (Fallbericht.)
- Korpelainen JT, Sotaniemi KA, Myllylä VV. Hyperhidrosis as a reflection of autonomic failure in patients with acute hemispheral brain infarction. An evaporimetric study. Stroke 1992;23:1271–1275.
- Korpelainen JT, Sotaniemi KA, Myllylä VV. Ipsilateral hypohidrosis in brain stem infarction. Stroke 1993;24:100–104.
- Korpelainen JT, Sotaniemi KA, Myllylä VV. Asymmetric sweating in stroke: a prospective quantitative study of patients with hemispheral brain infarction. Neurology 1993;43:1211–1214.
- Korpelainen JT, Sotaniemi KA, Myllylä VV. Asymmetrical skin temperature in ischemic stroke. Stroke 1995;26:1543–1547. (Kühlere Gliedmaßen auf der dem Infarkt gegenüberliegenden Seite.)
- Labar DR, Mohr JP, Nichols FT 3rd, Tatemichi TK. Unilateral hyperhidrosis after cerebral infarction. Neurology 1988;38:1679–1682.
- Landis BN, Leuchter I, San Millán Ruíz D, Lacroix JS, Landis T. Transient hemiageusia in cerebrovascular lateral pontine lesions. J Neurol Neurosurg Psychiatry 2006;77:680–683. (Fallbericht.)
- Mendoza M, Latorre JG. Pearls and oy-sters: reversible Ondine's curse in a case of lateral medullary infarction. Neurology 2013;80:e13–e16. (Fallbericht.)
- Odd H, Dore C, Eriksson SH, Heydrich L, Bargiotas P, Ashburner J, Lambert C. Lesion network mapping of REM sleep behaviour disorder. Neuroimage Clin 2025;45:103751.
- Onoda K, Ikeda M, Sekine H, Ogawa H. Clinical study of central taste disorders and discussion of the central gustatory pathway. J Neurol 2012;259:261–266. (Seite des Geschmacksverlusts nach Läsionshöhe.)
- Pavšič K, Pretnar-Oblak J, Bajrović FF, Dolenc-Grošelj L. Prospective study of sleep-disordered breathing in 28 patients with acute unilateral lateral medullary infarction. Sleep Breath 2020;24:1557–1563.
- Rousseaux M, Hurtevent JF, Benaim C, Cassim F. Late contralateral hyperhidrosis in lateral medullary infarcts. Stroke 1996;27:991–995. (Nicht modelliert.)
- Sacco S, Sarà M, Pistoia F, Conson M, Albertini G, Carolei A. Management of pathologic laughter and crying in patients with locked-in syndrome: a report of 4 cases. Arch Phys Med Rehabil 2008;89:775–778.
- Sakakibara R, Hattori T, Yasuda K, Yamanishi T. Micturitional disturbance and the pontine tegmental lesion: urodynamic and MRI analyses of vascular cases. J Neurol Sci 1996;141:105–110.
- Sung CY, Lee TH, Chu NS. Central hyperthermia in acute stroke. Eur Neurol 2009;62:86–92. (Überwiegend nach Blutungen, immer mit Hirnstammbeteiligung: Deshalb wird zentrales Fieber nur als Risikohinweis dargestellt.)
- Tang WK, Hermann DM, Chen YK, Liang HJ, Liu XX, Chu WC, Ahuja AT, Abrigo J, Mok V, Ungvari GS, Wong KS. Brainstem infarcts predict REM sleep behavior disorder in acute ischemic stroke. BMC Neurol 2014;14:88.
- Tellenbach N, Schmidt MH, Alexiev F, Blondiaux E, Cavalloni F, Bassetti CL, Heydrich L, Bargiotas P. REM sleep and muscle atonia in brainstem stroke: a quantitative polysomnographic and lesion analysis study. J Sleep Res 2023;32:e13640. (Gegenevidenz: keine vermehrte Muskelaktivität im REM-Schlaf.)
- Wanklyn P, Ilsley DW, Greenstein D, Hampton IF, Roper TA, Kester RC, Mulley GP. The cold hemiplegic arm. Stroke 1994;25:1765–1770.
- Wanklyn P, Forster A, Young J, Mulley G. Prevalence and associated features of the cold hemiplegic arm. Stroke 1995;26:1867–1870.
- Xi Z, Luning W. REM sleep behavior disorder in a patient with pontine stroke. Sleep Med 2009;10:143–146. (Fallbericht.)

<a id="臨床細節審查a-clinical-detail-audit-a-cortex-deep-structures-medulla-and-cerebellum-late-and-non-motor-nihss"></a>
### Prüfung klinischer Details (A): Kortex, tiefe Strukturen, Medulla oblongata und Kleinhirn, Spätfolgen, nichtmotorische Symptome und NIHSS

- Torab-Miandoab A, Samad-Soltani T, Shams-Vahdati S, Rezaei-Hachesu P. An intelligent system for improving adherence to guidelines on acute stroke. Turk J Emerg Med 2020;20:118–134. (Anhang 3 gibt die Anweisungen der NIH Stroke Scale wieder, auf denen die Einzelitem-Regeln beruhen: Absinken, Sopor, Anarthrie, Ataxie und beidseitiger hirnstammbedingter Sensibilitätsverlust.)
- Aldrich MS, Alessi AG, Beck RW, Gilman S. Cortical blindness: etiology, diagnosis, and prognosis. Ann Neurol 1987;21:149–158. (Nur 3 von 25 Patienten verneinten ihre Blindheit; deshalb wird das Anton-Syndrom beschrieben, aber nicht bei jedem Fall aufgeführt.)
- Amarenco P, Hauw JJ, Hénin D, Duyckaerts C, Roullet E, Laplane D, Gautier JC, Lhermitte F, Buge A, Castaigne P. Cerebellar infarction in the area of the posterior cerebellar artery. Clinicopathology of 28 cases. Rev Neurol (Paris) 1989;145:277–286. (Französischsprachig, zum Versorgungsgebiet der A. cerebelli inferior posterior; 5 von 9 Infarkten des medialen Asts reichten bis in die dorsolaterale Medulla oblongata, 4 zeigten ein Wallenberg-Syndrom.)
- Amarenco P, Roullet E, Hommel M, Chaine P, Marteau R. Infarction in the territory of the medial branch of the posterior inferior cerebellar artery. J Neurol Neurosurg Psychiatry 1990;53:731–735.
- Andersen G, Vestergaard K, Ingeman-Nielsen M, Jensen TS. Incidence of central post-stroke pain. Pain 1995;61:187–193.
- Arboix A, Bell Y, García-Eroles L, Massons J, Comes E, Balcells M, Targa C. Clinical study of 35 patients with dysarthria-clumsy hand syndrome. J Neurol Neurosurg Psychiatry 2004;75:231–234.
- Barer DH. The natural history and functional consequences of dysphagia after hemispheric stroke. J Neurol Neurosurg Psychiatry 1989;52:236–241.
- Barow E, Pinnschmidt H, Boutitie F, Königsberg A, Ebinger M, Endres M, Fiebach JB, Fiehler J, Thijs V, Lemmens R, Muir KW, Nighoghossian N, Pedraza S, Simonsen CZ, Gerloff C, Thomalla G, Cheng B; WAKE-UP investigators. Symptoms and probabilistic anatomical mapping of lacunar infarcts. Neurol Res Pract 2020;2:21.
- Bogousslavsky J, Regli F. Unilateral watershed cerebral infarcts. Neurology 1986;36:373–377.
- Bouvier SE, Engel SA. Behavioral deficits and cortical damage loci in cerebral achromatopsia. Cereb Cortex 2006;16:183–191.
- Cals N, Devuyst G, Afsar N, Karapanayiotides T, Bogousslavsky J. Pure superficial posterior cerebral artery territory infarction in The Lausanne Stroke Registry. J Neurol 2002;249:855–861.
- Caplan LR, Schmahmann JD, Kase CS, Feldmann E, Baquis G, Greenberg JP, Gorelick PB, Helgason C, Hier DB. Caudate infarcts. Arch Neurol 1990;47:133–143.
- Carmona S, Martínez C, Zalazar G, Moro M, Batuecas-Caletrio A, Luis L, Gordon C. The diagnostic accuracy of truncal ataxia and HINTS as cardinal signs for acute vestibular syndrome. Front Neurol 2016;7:125. (Rumpfataxie wird nach der Gleichgewichtsstörung beim Gehen, Stehen und aufrechten Sitzen eingestuft.)
- Chamorro A, Sacco RL, Mohr JP, Foulkes MA, Kase CS, Tatemichi TK, Wolf PA, Price TR, Hier DB. Clinical-computed tomographic correlations of lacunar infarction in the Stroke Data Bank. Stroke 1991;22:175–181.
- Cnyrim CD, Rettinger N, Mansmann U, Brandt T, Strupp M. Central compensation of deviated subjective visual vertical in Wallenberg's syndrome. J Neurol Neurosurg Psychiatry 2007;78:527–528. (Ipsiversive Lateropulsion des Körpers.)
- Daniels SK, Foundas AL. The role of the insular cortex in dysphagia. Dysphagia 1997;12:146–156.
- Donnan GA, O'Malley HM, Quang L, Hurley S, Bladin PF. The capsular warning syndrome: pathogenesis and clinical features. Neurology 1993;43:957–962.
- Feinberg TE, Schindler RJ, Flanagan NG, Haber LD. Two alien hand syndromes. Neurology 1992;42:19–24.
- Fisher CM. Ataxic hemiparesis. A pathologic study. Arch Neurol 1978;35:126–128.
- Garcia-Larrea L, Perchet C, Creac'h C, Convers P, Peyron R, Laurent B, Mauguière F, Magnin M. Operculo-insular pain (parasylvian pain): a distinct central pain syndrome. Brain 2010;133:2528–2539. (5 von 270; nur im Beschreibungstext.)
- Gordon C, Hewer RL, Wade DT. Dysphagia in acute stroke. Br Med J (Clin Res Ed) 1987;295:411–414.
- Gorman MJ, Dafer R, Levine SR. Ataxic hemiparesis: critical appraisal of a lacunar syndrome. Stroke 1998;29:2549–2555.
- Hamdy S, Aziz Q, Rothwell JC, Singh KD, Barlow J, Hughes DG, Tallis RC, Thompson DG. The cortical topography of human swallowing musculature in health and disease. Nat Med 1996;2:1217–1224.
- Hamdy S, Aziz Q, Rothwell JC, Crone R, Hughes D, Tallis RC, Thompson DG. Explaining oropharyngeal dysphagia after unilateral hemispheric stroke. Lancet 1997;350:686–692.
- Heilman KM, Rothi L, McFarling D, Rottmann AL. Transcortical sensory aphasia with relatively spared spontaneous speech and naming. Arch Neurol 1981;38:236–239.
- Heutink J, Indorf DL, Cordes C. The neuropsychological rehabilitation of visual agnosia and Balint's syndrome. Neuropsychol Rehabil 2019;29:1489–1508. (Störungen des höheren visuellen Systems setzen Sehfähigkeit voraus: Bei blinden Patienten gelten sie als nicht untersuchbar, und es wird kein Balint-Syndrom angegeben.)
- Hillis AE, Wityk RJ, Barker PB, Beauchamp NJ, Gailloud P, Murphy K, Cooper O, Metter EJ. Subcortical aphasia and neglect in acute stroke: the role of cortical hypoperfusion. Brain 2002;125:1094–1104.
- Hiraga A, Uzawa A, Kamitsukasa I. Diffusion weighted imaging in ataxic hemiparesis. J Neurol Neurosurg Psychiatry 2007;78:1260–1262.
- Hoche F, Guell X, Vangel MG, Sherman JC, Schmahmann JD. The cerebellar cognitive affective/Schmahmann syndrome scale. Brain 2018;141:248–270.
- Hong JM, Kim TJ, Shin DH, Lee JS, Joo IS. Cardiovascular autonomic function in lateral medullary infarction. Neurol Sci 2013;34:1963–1969.
- Hupperts RM, Lodder J, Heuts-van Raak EP, Kessels F. Infarcts in the anterior choroidal artery territory. Anatomical distribution, clinical syndromes, presumed pathogenesis and early outcome. Brain 1994;117:825–834.
- Husain M, Kennard C. Visual neglect associated with frontal lobe infarction. J Neurol 1996;243:652–657.
- Kanbayashi T, Sonoo M. The course of facial corticobulbar tract fibers in the dorsolateral medulla oblongata. BMC Neurol 2021;21:214. (Zentrale Fazialisparese auf der Infarktseite bei 8 von 33 Patienten, immer leicht und bis zur Entlassung verschwunden: Nur ein Teil der Bahn steigt bis in die Medulla oblongata ab.)
- Karnath HO, Ferber S, Himmelbach M. Spatial awareness is a function of the temporal not the posterior parietal lobe. Nature 2001;411:950–953.
- Karnath HO, Himmelbach M, Rorden C. The subcortical anatomy of human spatial neglect: putamen, caudate nucleus and pulvinar. Brain 2002;125:350–360.
- Kertesz A, McCabe P. Recovery patterns and prognosis in aphasia. Brain 1977;100:1–18.
- Kertesz A, Nicholson I, Cancelliere A, Kassa K, Black SE. Motor impersistence: a right-hemisphere syndrome. Neurology 1985;35:662–666.
- Kertesz A, Poole E. The aphasia quotient: the taxonomic approach to measurement of aphasic disability. Can J Neurol Sci 2004;31:175–184. (Nachdruck der Arbeit von 1974; ein Aphasietyp pro Patient.)
- Kim HA, Lee BC, Hong JH, Yeo CK, Yi HA, Lee H. Long-term prognosis for hearing recovery in stroke patients presenting vertigo and acute hearing loss. J Neurol Sci 2014;339:176–182.
- Kim JS, Han YS. Medial medullary infarction: clinical, imaging, and outcome study in 86 consecutive patients. Stroke 2009;40:3221–3225.
- Kim JS, Lee JH, Im JH, Lee MC. Syndromes of pontine base infarction. A clinical-radiological correlation study. Stroke 1995;26:950–955.
- Kim JS, Lee JH, Lee MC. Patterns of sensory dysfunction in lateral medullary infarction. Clinical-MRI correlation. Neurology 1997;49:1557–1563.
- Kim JS. Pure lateral medullary infarction: clinical-radiological correlation of 130 acute, consecutive patients. Brain 2003;126:1864–1872.
- Kobayashi S, Suzuki K, Takekawa H, Watanabe Y, Okamura M, Suzuki A, Tsukui D, Hirata K. Bilateral medial medulla infarction mimicking Guillain-Barré syndrome and its variants. Brain Nerve 2020;72:901–905. (Japanischsprachiger Fallbericht.)
- Krause T, Werner K, Fiebach JB, Villringer K, Piper SK, Haeusler KG, Endres M, Scheitz JF, Nolte CH. Stroke in right dorsal anterior insular cortex is related to myocardial injury. Ann Neurol 2017;81:502–511.
- Kölmel HW. Complex visual hallucinations in the hemianopic field. J Neurol Neurosurg Psychiatry 1985;48:29–38.
- Kumral E, Bayulkem G, Ataç C, Alper Y. Spectrum of superficial posterior cerebral artery territory infarcts. Eur J Neurol 2004;11:237–246.
- Kumral E, Kisabay A, Ataç C, Calli C, Yunten N. Spectrum of the posterior inferior cerebellar artery territory infarcts. Clinical-diffusion-weighted imaging correlates. Cerebrovasc Dis 2005;20:370–380.
- Laowattana S, Zeger SL, Lima JA, Goodman SN, Wittstein IS, Oppenheimer SM. Left insular stroke is associated with adverse cardiac outcome. Neurology 2006;66:477–483.
- Lee H, Baloh RW. Sudden deafness in vertebrobasilar ischemia: clinical features, vascular topographical patterns and long-term outcome. J Neurol Sci 2005;228:99–104.
- Lee H, Kim JS, Chung EJ, Yi HA, Chung IS, Lee SR, Shin JY. Infarction in the territory of anterior inferior cerebellar artery: spectrum of audiovestibular loss. Stroke 2009;40:3745–3751.
- Lee H, Sohn SI, Cho YW, Lee SR, Ahn BH, Park BR, Baloh RW. Cerebellar infarction presenting isolated vertigo: frequency and vascular topographical patterns. Neurology 2006;67:1178–1183.
- MacGowan DJ, Janal MN, Clark WC, Wharton RN, Lazar RM, Sacco RL, Mohr JP. Central poststroke pain and Wallenberg's lateral medullary infarction: frequency, character, and determinants in 63 patients. Neurology 1997;49:120–125.
- Marinković SV, Milisavljević MM, Lolić-Draganić V, Kovačević MS. Distribution of the occipital branches of the posterior cerebral artery. Correlation with occipital lobe infarcts. Stroke 1987;18:728–732.
- Martí-Vilalta JL, Arboix A, Garcia JH. Brain infarcts in the arterial border zones: clinical-pathologic correlations. J Stroke Cerebrovasc Dis 1994;4:114–120.
- Mort DJ, Malhotra P, Mannan SK, Rorden C, Pambakian A, Kennard C, Husain M. The anatomy of visual neglect. Brain 2003;126:1986–1997.
- Moulin T, Bogousslavsky J, Chopard JL, Ghika J, Crépin-Leblond T, Martin V, Maeder P. Vascular ataxic hemiparesis: a re-evaluation. J Neurol Neurosurg Psychiatry 1995;58:422–427.
- Nasreddine ZS, Saver JL. Pain after thalamic stroke: right diencephalic predominance and clinical features in 180 patients. Neurology 1997;48:1196–1199. (Zusammengefasste veröffentlichte Fälle: Das Überwiegen rechtsseitiger Fälle könnte teilweise auf einen Berichtsfehler zurückgehen.)
- Nestmann S, Karnath HO, Rennig J. Hemifield-specific color perception deficits after unilateral V4α lesions. Cortex 2021;142:357–369.
- Norrving B, Cronqvist S. Lateral medullary infarction: prognosis in an unselected series. Neurology 1991;41:244–248.
- Ogawa K, Suzuki Y, Takahashi K, Akimoto T, Kamei S, Soma M. Clinical study of seven patients with infarction in territories of the anterior inferior cerebellar artery. J Stroke Cerebrovasc Dis 2017;26:574–581.
- Palomeras E, Fossas P, Cano AT, Sanz P, Floriach M. Anterior choroidal artery infarction: a clinical, etiologic and prognostic study. Acta Neurol Scand 2008;118:42–47.
- Pashek GV, Holland AL. Evolution of aphasia in the first year post-onset. Cortex 1988;24:411–423.
- Paul NL, Simoni M, Chandratheva A, Rothwell PM. Population-based study of capsular warning syndrome and prognosis after early recurrent TIA. Neurology 2012;79:1356–1362.
- Paulson HL, Galetta SL, Grossman M, Alavi A. Hemiachromatopsia of unilateral occipitotemporal infarcts. Am J Ophthalmol 1994;118:518–523.
- Pedersen PM, Vinter K, Olsen TS. Aphasia after stroke: type, severity and prognosis. The Copenhagen aphasia study. Cerebrovasc Dis 2004;17:35–43. (Im ersten Jahr wechselte der Aphasietyp stets zu einer leichteren Form; flüssige Aphasie wurde nie nichtflüssig. Globale Aphasie konnte beispielsweise in einen Wernicke-Typ übergehen und ging von 32 % auf 7 % zurück. Eine leichte globale Aphasie wird als Broca-Typ aufgeführt, oder als Wernicke-Typ, wenn das Verständnis inzwischen stärker beeinträchtigt ist als der Redefluss; danach verliert der aufgeführte Typ nur noch Merkmale.)
- Pierrot-Deseilligny C, Gautier JC, Loron P. Acquired ocular motor apraxia due to bilateral frontoparietal infarcts. Ann Neurol 1988;23:199–202. (Ein Fall: Sakkaden und Blickfolge zu beiden Seiten gestört.)
- Pierrot-Deseilligny C, Rivaud S, Gaymard B, Müri R, Vermersch AI. Cortical control of saccades. Ann Neurol 1995;37:557–567. (Das frontale Augenfeld löst die Fixation und initiiert willkürliche Sakkaden: Fallen beide aus, werden die Augen zu keiner Seite gedrängt; der willkürliche Blick zu beiden Seiten ist aber beeinträchtigt.)
- Pongmoragot J, Parthasarathy S, Selchen D, Saposnik G. Bilateral medial medullary infarction: a systematic review. J Stroke Cerebrovasc Dis 2013;22:775–780.
- Prosser J, MacGregor L, Lees KR, Diener HC, Hacke W, Davis S; VISTA Investigators. Predictors of early cardiac morbidity and mortality after ischemic stroke. Stroke 2007;38:2295–2302.
- Pryse-Phillips W. Infarction of the medulla and cervical cord after fitness exercises. Stroke 1989;20:292–294. (Medulla oblongata und oberes Halsmark nach Vertebralisdissektion; ein Fall.)
- Ringman JM, Saver JL, Woolson RF, Clarke WR, Adams HP. Frequency, risk factors, anatomy, and course of unilateral neglect in an acute stroke cohort. Neurology 2004;63:468–474.
- Sage JI, Van Uitert RL. Man-in-the-barrel syndrome. Neurology 1986;36:1102–1103.
- Saito T, Itabashi R, Kawabata Y, Yazawa Y. Clinical characteristics of patients with lateral medullary infarction who had fatal respiratory failure. J Neurol Sci 2022;434:120167.
- Saposnik G, Noel de Tilly L, Caplan LR. Pontine warning syndrome. Arch Neurol 2008;65:1375–1377.
- Sato S, Toyoda K, Uehara T, Toratani N, Yokota C, Moriwaki H, Naritomi H, Minematsu K. Baseline NIH Stroke Scale Score predicting outcome in anterior and posterior circulation strokes. Neurology 2008;70:2371–2377. (Grenzwert für ein gutes Ergebnis nach 3 Monaten: NIHSS 5 oder weniger bei Schlaganfällen im hinteren und 8 oder weniger im vorderen Kreislauf.)
- Scheitz JF, Nolte CH, Doehner W, Hachinski V, Endres M. Stroke-heart syndrome: clinical presentation and underlying mechanisms. Lancet Neurol 2018;17:1109–1120.
- Schmahmann JD, Sherman JC. The cerebellar cognitive affective syndrome. Brain 1998;121:561–579.
- Sheehy NP, Boyle GE, Meaney JF. Normal anterior spinal arteries within the cervical region: high-spatial-resolution contrast-enhanced three-dimensional MR angiography. Radiology 2005;236:637–641. (Radikulomedulläre Zuflüsse zur zervikalen A. spinalis anterior bei 24 von 50: Ein Verschluss an ihrem Ursprung gefährdet das obere Halsmark, den modellierten Abschnitt.)
- Sommerfeld DK, Eek EU, Svensson AK, Holmqvist LW, von Arbin MH. Spasticity after stroke: its occurrence and association with motor impairments and activity limitations. Stroke 2004;35:134–139.
- Sposato LA, Cipriano LE, Saposnik G, Ruíz Vargas E, Riccio PM, Hachinski V. Diagnosis of atrial fibrillation after stroke and transient ischaemic attack: a systematic review and meta-analysis. Lancet Neurol 2015;14:377–387.
- Suntrup S, Kemmling A, Warnecke T, Hamacher C, Oelenberg S, Niederstadt T, Heindel W, Wiendl H, Dziewas R. The impact of lesion location on dysphagia incidence, pattern and complications in acute stroke. Part 1: dysphagia incidence, severity and aspiration. Eur J Neurol 2015;22:832–838.
- Takano K, Takasugi K. A case of bilateral lower pons-medial medullary infarction presenting quadriparesis. No To Shinkei 2003;55:879–883. (Japanischsprachiger Fallbericht.)
- Tatemichi TK, Desmond DW, Prohovnik I, Cross DT, Gropen TI, Mohr JP, Stern Y. Confusion and memory loss from capsular genu infarction: a thalamocortical disconnection syndrome? Neurology 1992;42:1966–1979.
- Uemura M, Naritomi H, Uno H, Umesaki A, Miyashita K, Toyoda K, Minematsu K, Nagatsuka K. Ipsilateral hemiparesis in lateral medullary infarction: clinical investigation of the lesion location on magnetic resonance imaging. J Neurol Sci 2016;365:40–45. (Opalski-Variante.)
- Urban PP, Wicht S, Vucorevic G, Fitzek S, Marx J, Thömke F, Mika-Grüttner A, Fitzek C, Stoeter P, Hopf HC. The course of corticofacial projections in the human brainstem. Brain 2001;124:1866–1876. (Bei manchen Menschen ziehen kortikofaziale Fasern schleifenförmig bis in die obere Medulla oblongata, kreuzen und steigen dorsolateral zum Fazialiskern auf: Ein lateraler Medullainfarkt schwächt dann das Gesicht auf seiner eigenen Seite.)
- Urban PP, Wolf T, Uebele M, Marx JJ, Vogt T, Stoeter P, Bauermann T, Weibrich C, Vucurevic GD, Schneider A, Wissel J. Occurence and clinical predictors of spasticity after ischemic stroke. Stroke 2010;41:2016–2020.
- Vynckier J, Maamari B, Grunder L, Goeldlin MB, Meinel TR, Kaesmacher J, Hakim A, Arnold M, Gralla J, Seiffge DJ, Fischer U. Early neurologic deterioration in lacunar stroke: clinical and imaging predictors and association with long-term outcome. Neurology 2021;97:e1437–e1446.
- Watson RT, Heilman KM. Callosal apraxia. Brain 1983;106:391–403.
- Wissel J, Schelosky LD, Scott J, Christe W, Faiss JH, Mueller J. Early development of spasticity following stroke: a prospective, observational trial. J Neurol 2010;257:1067–1072.
- Zhang X, Kedar S, Lynn MJ, Newman NJ, Biousse V. Homonymous hemianopias: clinical-anatomic correlations in 904 cases. Neurology 2006;66:906–910.

<a id="血流組織與臨床模型--flow-tissue-and-clinical-model"></a>
### Modell für Durchblutung, Gewebe und Klinik

- Alastruey J, Parker KH, Peiró J, Byrd SM, Sherwin SJ. Modelling the circle of Willis to assess the effects of anatomical variations and occlusions on cerebral flows. J Biomech 2007;40:1794–1805. (Gefäßabmessungen; auch die openBF-Implementierung, Apache-2.0.)
- Astrup J, Siesjö BK, Symon L. Thresholds in cerebral ischemia – the ischemic penumbra. Stroke 1981;12:723–725. (Das Penumbra-Konzept.)
- Campbell BCV et al. Cerebral blood flow is the optimal CT perfusion parameter for assessing infarct core. Stroke 2011;42:3435–3440.
- Saver JL. Time is brain—quantified. Stroke 2006;37:263–266.
- Albers GW et al. Magnetic resonance imaging profiles predict clinical response to early reperfusion: the DEFUSE study. Ann Neurol 2006;60:508–517.
- Davis SM et al. Effects of alteplase beyond 3 h after stroke in the Echoplanar Imaging Thrombolytic Evaluation Trial (EPITHET). Lancet Neurol 2008;7:299–309.
- Oppenheim C et al. Prediction of malignant middle cerebral artery infarction by diffusion-weighted imaging. Stroke 2000;31:2175–2181.
- Vahedi K et al. Early decompressive surgery in malignant infarction of the middle cerebral artery: a pooled analysis of three randomised controlled trials. Lancet Neurol 2007;6:215–222.
- Wijdicks EFM et al. Recommendations for the management of cerebral and cerebellar infarction with swelling. Stroke 2014;45:1222–1238.
- Schlaug G et al. Time course of the apparent diffusion coefficient (ADC) abnormality in human stroke. Neurology 1997;49:113–119.
- Lansberg MG et al. Evolution of apparent diffusion coefficient, diffusion-weighted, and T2-weighted signal intensity of acute stroke. AJNR Am J Neuroradiol 2001;22:637–644.
- Simard JM, Kent TA, Chen M, Tarasov KV, Gerzanich V. Brain oedema in focal ischaemia: molecular pathophysiology and theoretical implications. Lancet Neurol 2007;6:258–268.
- Minnerup J et al. Computed tomography-based quantification of lesion water uptake identifies patients within 4.5 hours of stroke onset. Ann Neurol 2016;80:924–934.
- Klatzo I. Neuropathological aspects of brain edema. J Neuropathol Exp Neurol 1967;26:1–14.
- Ayata C, Ropper AH. Ischaemic brain oedema. J Clin Neurosci 2002;9:113–124.
- Hacke W et al. 'Malignant' middle cerebral artery territory infarction: clinical course and prognostic signs. Arch Neurol 1996;53:309–315.
- Ropper AH. Lateral displacement of the brain and level of consciousness in patients with an acute hemispheral mass. N Engl J Med 1986;314:953–958.
- Riveros Gilardi B et al. Types of cerebral herniation and their imaging features. Radiographics 2019;39:1598–1610.
- Keane JR. Blindness following tentorial herniation. Ann Neurol 1980;8:186–190. (Sieben Patienten mit dauerhaftem beidseitigem Sehverlust nach tentorieller Herniation durch ein- oder beidseitige Raumforderungen; bei zwei zeigten sich okzipitale Infarkte im CT: Deshalb behält eine Hemisphäre, die mit der anderen nach unten herniert, den durch ihre eigene Schwellung verursachten Infarkt im Gebiet der A. cerebri posterior.)
- Krabbe-Hartkamp MJ et al. Circle of Willis: morphologic variation on three-dimensional time-of-flight MR angiograms. Radiology 1998;207:103–111.
- Hindenes LB et al. Variations in the circle of Willis in a large population sample using 3D TOF angiography: the Tromsø Study. PLoS One 2020;15:e0241373.
- Dirnagl U, Iadecola C, Moskowitz MA. Pathobiology of ischaemic stroke: an integrated view. Trends Neurosci 1999;22:391–397.
- Pantano P, Baron JC, Samson Y, Bousser MG, Derouesne C, Comar D. Crossed cerebellar diaschisis. Further studies. Brain 1986;109(Pt 4):677–694.
- Kuhn MJ et al. Wallerian degeneration after cerebral infarction: evaluation with sequential MR imaging. Radiology 1989;172:179–182.
- Thomalla G et al. DTI detects early Wallerian degeneration of the pyramidal tract after ischemic stroke. NeuroImage 2004;22:1767–1774.
- Goto N, Kaneko M. Olivary enlargement: chronological and morphometric analyses. Acta Neuropathol 1981;54:275–282.
- Kitajima M et al. Hypertrophic olivary degeneration: MR imaging and pathologic findings. Radiology 1994;192:539–543.
- Tatu L, Moulin T, Bogousslavsky J, Duvernoy H. Arterial territories of the human brain: cerebral hemispheres. Neurology 1998;50:1699–1708.
- Tatu L, Moulin T, Bogousslavsky J, Duvernoy H. Arterial territories of human brain: brainstem and cerebellum. Neurology 1996;47:1125–1135.
- Schmahmann JD. Vascular syndromes of the thalamus. Stroke 2003;34:2264–2278.
- Brott T et al. Measurements of acute cerebral infarction: a clinical examination scale. Stroke 1989;20:864–870. (Die ursprüngliche Skala mit 15 Items.)
- Donnan GA, Bladin PF, Berkovic SF, Longley WA, Saling MM. The stroke syndrome of striatocapsular infarction. Brain 1991;114(Pt 1A):51–70.
- Fisher CM. Lacunar strokes and infarcts: a review. Neurology 1982;32:871–876.
- Bamford J et al. Classification and natural history of clinically identifiable subtypes of cerebral infarction. Lancet 1991;337:1521–1526.
- Parvizi J, Damasio AR. Neuroanatomical correlates of brainstem coma. Brain 2003;126:1524–1536.
- Goyal M et al. Endovascular treatment of stroke due to medium-vessel occlusion (ESCAPE-MeVO). N Engl J Med 2025;392:1385–1395.
- Psychogios M et al. Endovascular treatment for stroke due to occlusion of medium or distal vessels (DISTAL). N Engl J Med 2025;392:1374–1384.
- Tao C et al. Trial of endovascular treatment of acute basilar-artery occlusion (ATTENTION). N Engl J Med 2022;387:1361–1372.
- Jovin TG et al. Trial of thrombectomy 6 to 24 hours after stroke due to basilar-artery occlusion (BAOCHE). N Engl J Med 2022;387:1373–1384.
- Lindsberg PJ et al. Time window for recanalization in basilar artery occlusion: speculative synthesis. Neurology 2015;85:1806–1815.
- Lindsberg PJ, Mattle HP. Therapy of basilar artery occlusion: a systematic analysis comparing intra-arterial and intravenous thrombolysis. Stroke 2006;37:922–928.
- van der Hoeven EJRJ et al. Collateral flow predicts outcome after basilar artery occlusion: the posterior circulation collateral score. Int J Stroke 2016;11:768–775.
- Alemseged F et al. The basilar artery on computed tomography angiography prognostic score (BATMAN). Stroke 2017;48:631–637.
- Ferbert A, Brückmann H, Drummen R. Clinical features of proven basilar artery occlusion. Stroke 1990;21:1135–1142.
- von Campe G, Regli F, Bogousslavsky J. Heralding manifestations of basilar artery occlusion with lethal or severe stroke. J Neurol Neurosurg Psychiatry 2003;74:1621–1626.
- Bauer G, Gerstenbrand F, Rumpl E. Varieties of the locked-in syndrome. J Neurol 1979;221:77–91.
- Patterson JR, Grabois M. Locked-in syndrome: a review of 139 cases. Stroke 1986;17:758–764.
- Casanova E et al. Locked-in syndrome: improvement in the prognosis after an early intensive multidisciplinary rehabilitation. Arch Phys Med Rehabil 2003;84:862–867.
- Plum F, Posner JB. The Diagnosis of Stupor and Coma (Atemmuster bei Hirnstammläsionen.)
- Easton JD et al. Definition and evaluation of transient ischemic attack. Stroke 2009;40:2276–2293.
- Jones TH et al. Thresholds of focal cerebral ischemia in awake monkeys. J Neurosurg 1981;54:773–782.
- Wang Y et al. Clopidogrel with aspirin in acute minor stroke or transient ischemic attack (CHANCE). N Engl J Med 2013;369:11–19.
- Johnston SC et al. Clopidogrel and aspirin in acute ischemic stroke and high-risk TIA (POINT). N Engl J Med 2018;379:215–225.
- Hayreh SS et al. Central retinal artery occlusion: retinal survival time. Exp Eye Res 2004;78:723–736.
- Mac Grory B et al. Management of central retinal artery occlusion: a scientific statement from the American Heart Association. Stroke 2021;52:e282–e294.
- Lawrence DG, Kuypers HGJM. The functional organization of the motor system in the monkey: the effects of bilateral pyramidal lesions. Brain 1968;91:1–14.
- Baker SN. The primate reticulospinal tract, hand function and functional recovery. J Physiol 2011;589:5603–5612.
- Feeney DM, Baron JC. Diaschisis. Stroke 1986;17:817–830.
- Kwakkel G, Kollen B, Twisk J. Impact of time on improvement of outcome after stroke. Stroke 2006;37:2348–2353.
- Langhorne P, Bernhardt J, Kwakkel G. Stroke rehabilitation. Lancet 2011;377:1693–1702.
- Goyal M et al. Endovascular thrombectomy after large-vessel ischaemic stroke: a meta-analysis of individual patient data from five randomised trials (HERMES). Lancet 2016;387:1723–1731.
- Menon BK et al. J Neurointerv Surg 2019;11:1065–1069 (Thrombektomie bei M2-Verschlüssen, HERMES.)
- Nogueira RG et al. Thrombectomy 6 to 24 hours after stroke with a mismatch between deficit and infarct (DAWN). N Engl J Med 2018;378:11–21.
- Yang P et al. Endovascular thrombectomy with or without intravenous alteplase in acute stroke (DIRECT-MT). N Engl J Med 2020;382:1981–1993.
- Fischer U et al. Lancet 2022;400:104–115 (SWIFT DIRECT: Thrombektomie allein gegenüber zusätzlicher intravenöser Alteplase.)
- LeCouffe NE et al. A randomized trial of intravenous alteplase before endovascular treatment for stroke (MR CLEAN-NO IV). N Engl J Med 2021;385:1833–1844.
- Knapen RRMM et al. Cardiovasc Intervent Radiol 2025;48:1869–1877 (VERITAS: gepoolte Analyse von Studien zum Basilarisverschluss.)
- Strbian D et al. Eur Stroke J 2024;9:835–884 (ESO/ESMINT-Leitlinie zum Basilarisverschluss.)
- Yi T et al. Predictors of futile recanalization in basilar artery occlusion patients undergoing endovascular treatment: a post hoc analysis of the ATTENTION trial. Front Neurol 2023;14:1308036.
- Bhatia R et al. Low rates of acute recanalization with intravenous recombinant tissue plasminogen activator in ischemic stroke: real-world experience and a call for action. Stroke 2010;41:2254–2258.
- Menon BK et al. JAMA 2018;320:1017–1026 (INTERRSeCT: Rekanalisation nach intravenöser Thrombolyse nach Verschlussort.)
- Seners P et al. Stroke 2016;47:2409–2412 (Frühe Rekanalisation nach intravenöser Thrombolyse nach Verschlussort.)
- Riedel CH et al. The importance of size: successful recanalization by intravenous thrombolysis in acute anterior stroke depends on thrombus length. Stroke 2011;42:1775–1777.
- The NINDS rt-PA Stroke Study Group. Tissue plasminogen activator for acute ischemic stroke. N Engl J Med 1995;333:1581–1587.
- Hacke W et al. Thrombolysis with alteplase 3 to 4.5 hours after acute ischemic stroke (ECASS III). N Engl J Med 2008;359:1317–1329.
- Wahlgren N et al. Thrombolysis with alteplase for acute ischaemic stroke in the Safe Implementation of Thrombolysis in Stroke-Monitoring Study (SITS-MOST). Lancet 2007;369:275–282.
- Alexandrov AV, Grotta JC. Arterial reocclusion in stroke patients treated with intravenous tissue plasminogen activator. Neurology 2002;59:862–867.
- Rha JH, Saver JL. The impact of recanalization on ischemic stroke outcome: a meta-analysis. Stroke 2007;38:967–973. (53 Studien, 2066 Patienten: spontane Rekanalisation bei 24.1 %, nach IV-Thrombolyse bei 46.2 %; Rekanalisation war mit einem guten Ergebnis nach 3 Monaten verbunden, Odds Ratio 4.43: Deshalb wird eine von selbst wieder eröffnete Arterie als Wiedereröffnung beschrieben.)
- Liebeskind DS, Bracard S, Guillemin F, et al. eTICI reperfusion: defining success in endovascular stroke therapy. J Neurointerv Surg 2019;11:433–438. (Die erweiterte TICI bewertet den reperfundierten Anteil des nachgeschalteten Gebiets des Zielverschlusses: 3 = 100 %, 2c = 90–99 %, 2b67 = 67–89 %, 2b50 = 50–66 %; ein durch ein Gerinnselfragment blockierter Ast senkt deshalb den angiographisch sichtbaren Grad.)
- Mosimann PJ et al. Stroke 2018;49:2643–2651 (Reokklusion nach Thrombektomie.)
- Marto JP et al. Stroke 2019;50:2960–2963 (Frühe Reokklusion nach Thrombektomie.)
- Beyeler M et al. J Neurointerv Surg 2022;14:326–332 (Embolien in neue Versorgungsgebiete während der Thrombektomie.)
- Singh N et al. Stroke 2023;54:1477–1483 (Infarkte in neuen Versorgungsgebieten nach Thrombektomie, ESCAPE-NA1.)
- Wong GJ et al. Stroke 2021;52:2241–2249 (Embolische Befunde im MRT vor und nach Thrombektomie.)
- Ng FC et al. Neurology 2022;98:e790–e801 (No-Reflow nach erfolgreicher Reperfusion.)
- ter Schiphorst A et al. J Cereb Blood Flow Metab 2021;41:253–266 (No-Reflow im Gewebe nach Rekanalisation.)
- Wheeler HM, Mlynash M, Inoue M, et al. The growth rate of early DWI lesions is highly variable and associated with penumbral salvage and clinical outcomes following endovascular reperfusion. Int J Stroke 2015;10:723–729. (DEFUSE 2: medianes frühes Infarktwachstum 3.1 mL/h; Zielwert der Kalibrierung des Infarktwachstums.)
- Ospel JM, McDonough R, Demchuk AM, et al. Predictors and clinical impact of infarct progression rate in the ESCAPE-NA1 trial. J Neurointerv Surg 2022;14:886–891. (Mediane Infarktprogression 4.74 mL/h.)
- Sarraj A, Hassan AE, Grotta J, et al. Early infarct growth rate correlation with endovascular thrombectomy clinical outcomes: analysis from the SELECT study. Stroke 2021;52:57–69. (Schnelle Progression: 10 mL/h oder mehr.)
- Seners P, Yuen N, Olivot JM, et al. Factors associated with fast early infarct growth in patients with acute ischemic stroke with a large vessel occlusion. Neurology 2023;101:e2126–e2137. (Schlechte Kollateralen bei den meisten Patienten mit schneller Progression.)
- Desai SM, Rocha M, Jovin TG, Jadhav AP. High variability in neuronal loss. Stroke 2019;50:34–37. (Neuronaler Verlust pro Minute bei ICA- und M1-Verschlüssen: Der schnellste Wert, über 27 Millionen pro Minute, entspricht ungefähr 74 mL/h bei den 22 Millionen Neuronen pro mL nach Saver 2006.)
- Thomalla G, Hartmann F, Juettler E, et al. Prediction of malignant middle cerebral artery infarction by magnetic resonance imaging within 6 hours of symptom onset: a prospective multicenter observational study. Ann Neurol 2010;68:435–445. (Eine DWI-Läsion über 82 mL innerhalb von 6 h.)
- d'Esterre CD, Boesen ME, Ahn SH, et al. Time-dependent computed tomographic perfusion thresholds for patients with acute ischemic stroke. Stroke 2015;46:3390–3397. (Je früher die Durchblutung zurückkehrt, desto niedriger ist die Flussschwelle, bei der Gewebe infarziert.)
- Boned S, Padroni M, Rubiera M, et al. Admission CT perfusion may overestimate initial infarct core: the ghost infarct core concept. J Neurointerv Surg 2017;9:66–69.
- Berkhemer OA, Jansen IG, Beumer D, et al. Collateral status on baseline computed tomographic angiography and intra-arterial treatment effect in patients with proximal anterior circulation stroke. Stroke 2016;47:768–776. (MR CLEAN: Der Nutzen der Thrombektomie steigt mit dem Kollateralgrad.)
- Memezawa H, Smith ML, Siesjö BK. Penumbral tissues salvaged by reperfusion following middle cerebral artery occlusion in rats. Stroke 1992;23:552–559. (Das durch Endarterien versorgte Caudoputamen geht innerhalb von Minuten verloren, der Kortex später.)
- Garcia JH, Liu KF, Ho KL. Neuronal necrosis after middle cerebral artery occlusion in Wistar rats progresses at different time intervals in the caudoputamen and the cortex. Stroke 1995;26:636–642.
- Desai SM, Catapano JS, Tonetti DA, et al. Ultra-early functional improvement after stroke thrombectomy: predictors and implications. Stroke Vasc Interv Neurol 2022;2:e000138. (Nur wenige Patienten verbessern sich innerhalb von 30 min nach Rekanalisation; Grundlage der langsamen Wiederkehr geretteter Funktion im Modell.)
- Kniep H, Meyer L, Bechstein M, et al. How much of the thrombectomy related improvement in functional outcome is already apparent at 24 hours and at hospital discharge? Stroke 2022;53:2828–2837. (Ungefähr die Hälfte des Nutzens nach 24 h, drei Viertel bei Entlassung.)
- Fransen PS, Berkhemer OA, Lingsma HF, et al. Time to reperfusion and treatment effect for acute ischemic stroke: a randomized clinical trial. JAMA Neurol 2016;73:190–196.
- Klapproth S, Meyer L, Kniep H, et al. Delayed neurological recovery in ischemic stroke patients undergoing endovascular treatment is associated with baseline hyperglycemia: a treatable cause of the stunned brain phenomenon? J Neurol 2025;272:313.
- Guadagno JV, Jones PS, Aigbirhio FI, et al. Selective neuronal loss in rescued penumbra relates to initial hypoperfusion. Brain 2008;131:2666–2678.
- Shelton FN, Reding MJ. Effect of lesion location on upper limb motor recovery after stroke. Stroke 2001;32:107–112. (Armerholung: besser bei kortikalen Läsionen als im hinteren Schenkel der Capsula interna.)
- Feng W, Wang J, Chhatbar PY, et al. Corticospinal tract lesion load: an imaging biomarker for stroke motor outcomes. Ann Neurol 2015;78:860–870.
- Nijland RH, van Wegen EE, Harmeling-van der Wel BC, Kwakkel G. Presence of finger extension and shoulder abduction within 72 hours after stroke predicts functional recovery: early prediction of functional outcome after stroke: the EPOS cohort study. Stroke 2010;41:745–750.
- Stinear CM, Byblow WD, Ackerley SJ, Smith MC, Borges VM, Barber PA. PREP2: a biomarker-based algorithm for predicting upper limb function after stroke. Ann Clin Transl Neurol 2017;4:811–820.
- Byblow WD, Stinear CM, Barber PA, Petoe MA, Ackerley SJ. Proportional recovery after stroke depends on corticomotor integrity. Ann Neurol 2015;78:848–859.
- Kaesmacher J, Kaesmacher M, Berndt M, et al. Early thrombectomy protects the internal capsule in patients with proximal middle cerebral artery occlusion. Stroke 2021;52:1570–1579. (Alle 92 Patienten hatten striatale Ischämie, 45 auch im kortikospinalen Anteil der Capsula interna; die Odds stiegen um das 3.47-Fache pro Stunde bis zur Reperfusion der Aa. lenticulostriatae: Grundlage des Verlaufs in der tiefen weißen Substanz.)
- Kleine JF, Kaesmacher M, Wiestler B, Kaesmacher J. Tissue-selective salvage of the white matter by successful endovascular stroke therapy. Stroke 2017;48:2776–2783. (Infarkte der weißen Substanz beginnen häufig später als Infarkte der grauen Substanz.)
- Kleine JF, Beller E, Zimmer C, Kaesmacher J. Lenticulostriate infarctions after successful mechanical thrombectomy in middle cerebral artery occlusion. J Neurointerv Surg 2017;9:234–239. (Bei verschlossenen Aa. lenticulostriatae verhindert Thrombektomie den striatalen Infarkt nur selten.)
- Lazar RM, Minzer B, Antoniello D, Festa JR, Krakauer JW, Marshall RS. Improvement in aphasia scores after stroke is well predicted by initial severity. Stroke 2010;41:1485–1488. (21 Patienten erreichten bis 90 Tage ungefähr 0.73 der möglichen Verbesserung in der Western Aphasia Battery: proportionale Erholung.)
- Wilson SM, Entrup JL, Schneck SM, et al. Recovery from aphasia in the first year after stroke. Brain 2023;146:1021–1039. (218 Patienten mit Aphasie: Anhaltende mittelgradige oder schwere Defizite waren nur bei ausgedehnten Schäden im gesamten MCA-Gebiet oder ausgedehnten temporoparietalen Schäden häufig; die Spracherholung im Modell nimmt mit dem verlorenen Anteil des linken MCA-Kortex ab.)
- Heiss WD, Thiel A. A proposed regional hierarchy in recovery of post-stroke aphasia. Brain Lang 2006;98:118–123. (Unbeschädigte Teile des linkshemisphärischen Netzwerks ermöglichen bessere Erholung als rechtshemisphärische Homologe.)
- Winters C, van Wegen EE, Daffertshofer A, Kwakkel G. Generalizability of the maximum proportional recovery rule to visuospatial neglect early poststroke. Neurorehabil Neural Repair 2017;31:334–342. (Neglect erholte sich bei 80 von 90 Patienten proportional; die 10 ohne diese Erholung hatten zu Beginn den schwersten Neglect.)
- Karnath HO, Rennig J, Johannsen L, Rorden C. The anatomy underlying acute versus chronic spatial neglect: a longitudinal study. Brain 2011;134:903–912. (Chronischer Neglect bei ungefähr einem Drittel der Patienten mit akutem Neglect, vorhergesagt durch Schäden im oberen und mittleren Temporalgyrus, den Basalganglien und den darunterliegenden Faserbahnen.)
- Steiner I, Melamed E. Conjugate eye deviation after acute hemispheric stroke: delayed recovery after previous contralateral frontal lobe damage. Ann Neurol 1984;16:509–511. (Bei 38 von 42 innerhalb von 5 Tagen verschwunden; nur bei früherem Schaden des anderen Frontallappens bestand die Abweichung wochenlang: Deshalb skaliert ihre Erholung nicht mit der Infarktgröße.)
- Woo D, Broderick JP, Kothari RU, et al. Does the National Institutes of Health Stroke Scale favor left hemisphere strokes? Stroke 1999;30:2355–2359. (Bei gleichem NIHSS war ein rechtshemisphärischer Infarkt ungefähr doppelt so groß wie ein linkshemisphärischer.)
- Boers AMM, Jansen IGH, Beenen LFM, et al. Association of follow-up infarct volume with functional outcome in acute ischemic stroke: a pooled analysis of seven randomized trials. J Neurointerv Surg 2018;10:1137–1142. (1665 Patienten: Odds eines besseren modifizierten Rankin-Scores 0.88 pro 10 mL endgültigen Infarkts; eine Rekanalisation, die mindestens 50 mL bewahrt, wird als Nutzen eingestuft.)
- Hommel M, Besson G, Pollak P, Kahane P, Le Bas JF, Perret J. Hemiplegia in posterior cerebral artery occlusion. Neurology 1990;40:1496–1499. (Vier Patienten mit Hemiplegie durch lateralen Mittelhirninfarkt; der Verschluss lag distal der A. communicans posterior.)
- Strbian D, Sairanen T, Silvennoinen H, Salonen O, Kaste M, Lindsberg PJ. Thrombolysis of basilar artery occlusion: impact of baseline ischemia and time. Ann Neurol 2013;73:688–694. (Ohne ausgedehnte Ausgangsischämie hatte die Hälfte nach Rekanalisation ein gutes Ergebnis, unabhängig vom Behandlungszeitpunkt bis 48 h: Das Modell bewertet späte Wiedereröffnung nach dem verbleibenden Hirnstamminfarkt und nicht nach einer festen Zeitgrenze.)
- Adams JH, Graham DI, Jennett B. The neuropathology of the vegetative state after an acute brain insult. Brain 2000;123:1327–1338. (Alle 49 Patienten, die bis zum Tod im vegetativen Zustand blieben, hatten ausgeprägte Schäden der subkortikalen weißen Substanz oder thalamischer Relaiskerne, wodurch auch intakter Kortex funktionsunfähig bleibt: Deshalb wird ein Überlebender der Zerstörung beider Hemisphären mit Bewusstseinsstörung aufgeführt.)
- Multi-Society Task Force on PVS. Medical aspects of the persistent vegetative state (1). N Engl J Med 1994;330:1499–1508. (Erholung aus einem nichttraumatischen anhaltenden vegetativen Zustand nach 3 Monaten ist äußerst selten; Lebenserwartung meist 2–5 Jahre.)
- De Renzi E, Motti F, Nichelli P. Imitating gestures: a quantitative approach to ideomotor apraxia. Arch Neurol 1980;37:6–10. (Apraxie wird durch Imitation geprüft, wofür keine Sprache nötig ist; bei linkshemisphärischen Patienten fast immer mit Aphasie, aber nur schwach damit korreliert: Deshalb bleibt Apraxie neben Aphasie aufgeführt, auch wenn zu wenig Sprachverständnis übrigbleibt.)
- Powers WJ, Rabinstein AA, Ackerson T, et al. Guidelines for the early management of patients with acute ischemic stroke: 2019 update to the 2018 guidelines for the early management of acute ischemic stroke: a guideline for healthcare professionals from the American Heart Association/American Stroke Association. Stroke 2019;50:e344–e418. (Ein anhaltendes Defizit wird als Schlaganfall behandelt: sofortige Hirnbildgebung, IV-Thrombolyse bei behinderndem, nicht aber bei leichtem nichtbehinderndem Defizit; Aspirin innerhalb von 24–48 h, nach IV-Thrombolyse im Allgemeinen erst nach 24 h: Deshalb gelten während anhaltender Defizite die Schlaganfall-Behandlungsfenster und erst nach ihrem Verschwinden die TIA-Hinweise zur Thrombozytenhemmung.)
- Wong KS, Gao S, Chan YL, et al. Mechanisms of acute cerebral infarctions in patients with middle cerebral artery stenosis: a diffusion-weighted imaging and microemboli monitoring study. Ann Neurol 2002;52:74–81. (Bei 30 Patienten mit MCA-Stenose waren Ketten tiefer Grenzzoneninfarkte das häufigste Muster multipler Infarkte, 11 von 15: Deshalb ist eine hochgradige M1-Stenose wie eine Karotisstenose oder niedriger Blutdruck ein Kontext für die Grenzzonen-Kennzeichnung.)
- Naeser MA, Helm-Estabrooks N, Haas G, Auerbach S, Srinivasan M. Relationship between lesion extent in 'Wernicke's area' on computed tomographic scan and predicting recovery of comprehension in Wernicke's aphasia. Arch Neurol 1987;44:73–82. (Das Sprachverständnis folgte dem geschädigten Anteil des Wernicke-Areals, nicht der gesamten temporoparietalen Läsion: gut nach 6 Monaten bei höchstens der Hälfte, schlecht selbst nach 1 Jahr bei mehr als der Hälfte, schlechter mit Beteiligung des mittleren Temporalgyrus: Deshalb nimmt die Erholung der Wernicke-Aphasie mit dem infarzierten Anteil des Wernicke-Areals ab.)
- Naeser MA, Gaddie A, Palumbo CL, Stiassny-Eder D. Late recovery of auditory comprehension in global aphasia. Improved recovery observed with subcortical temporal isthmus lesion vs Wernicke's cortical area lesion. Arch Neurol 1990;47:425–432. (8 von 9 Patienten mit globaler Aphasie und Läsion von mehr als der Hälfte des Wernicke-Areals behielten nach 1–2 Jahren ein mittelgradiges bis schweres Verständnisdefizit.)
- Kertesz A, Lau WK, Polk M. The structural determinants of recovery in Wernicke's aphasia. Brain Lang 1993;44:153–164. (22 Patienten: Anhaltende Wernicke-Aphasie betraf meist auch Gyrus supramarginalis und Gyrus angularis; bei guter Erholung waren weniger Teile des oberen und mittleren Temporalgyrus betroffen.)
- Haussen DC, Oliveira RA, Patel V, Nogueira RG. Functional independence following endovascular treatment for basilar artery occlusion despite extensive bilateral pontine infarcts on diffusion-weighted imaging: refuting a self-fulfilling prophecy. Interv Neurol 2016;5:179–184. (Ausgedehnte beidseitige pontine DWI-Läsionen sind nach Wiedereröffnung kein eindeutiges Zeichen schlechter Prognose: Kleine beidseitige Infarkte unterhalb der Schwelle werden deshalb wie einseitige kompensiert; der Engpass wirkt erst nahe dem klassischen Locked-in-Syndrom vollständig.)
- Serdaru M, Schaison M, Lhermitte F. Pupil sparing in oculomotor palsy and Claude Bernard Horner syndrome. Ann Neurol 1983;14:697–698. (Bei Horner-Syndrom derselben Seite kann eine Okulomotoriusparese pupillensparend erscheinen: Deshalb zeigt das Auge mit III.-Hirnnerven-Parese kein zusätzliches eigenes Horner-Syndrom.)
- Bassetti C, Staikov IN. Hemiplegia vegetativa alterna (ipsilateral Horner's syndrome and contralateral hemihyperhidrosis) following proximal posterior cerebral artery occlusion. Stroke 1995;26:702–704. (PCA-Verschluss führt gewöhnlich zu Gesichtsfeldausfall, hemisensorischem Verlust und neuropsychologischen Defiziten; das Horner-Syndrom entstand bei proximalem Verschluss mit Infarkt des anterolateralen Mittelhirns und des Thalamus.)
- Searls DE, Pazdera L, Korbel E, Vysata O, Caplan LR. Symptoms and signs of posterior circulation ischemia in the New England Medical Center Posterior Circulation Registry. Arch Neurol 2012;69:346–351. (407 Patienten: Horner-Syndrom war mit dem proximalen Gebiet verbunden, Gesichtsfeldausfall mit dem distalen.)
- Robertson CE, Brown RD Jr, Wijdicks EF, Rabinstein AA. Recovery after spinal cord infarcts: long-term outcome in 115 patients. Neurology 2012;78:114–121. (Maximales Defizit innerhalb von 1 h bei 68 %; am Tiefpunkt benötigten 81 % einen Rollstuhl und 86 % einen Katheter; nach durchschnittlich 3 Jahren waren 23 % verstorben, und 41 % der bei Entlassung Rollstuhlpflichtigen konnten gehen; Grundlage von Beschreibung und Verlauf des Rückenmarkinfarkts.)
- Zalewski NL, Rabinstein AA, Krecke KN, Brown RD Jr, Wijdicks EFM, Weinshenker BG, Kaufmann TJ, Morris JM, Aksamit AJ, Bartleson JD, Lanzino G, Blessing MM, Flanagan EP. Characteristics of spontaneous spinal cord infarction and proposed diagnostic criteria. JAMA Neurol 2019;76:56–63. (133 Patienten: Tiefpunkt innerhalb von 12 h bei 77 %; erstes MRT normal bei 24 %; Eulenaugen-Zeichen bei 65 %, stiftförmige Läsion bei 40 %; Diffusionsrestriktion bei 19 von 29; benachbarte Dissektion oder Okklusion bei 20 %.)
- Masson C, Pruvo JP, Meder JF, Cordonnier C, Touzé E, De La Sayette V, Giroud M, Mas JL, Leys D; Study Group on Spinal Cord Infarction of the French Neurovascular Society. Spinal cord infarction: clinical and magnetic resonance imaging findings and short term outcome. J Neurol Neurosurg Psychiatry 2004;75:1431–1435. (28 Patienten: Ergebnis nach 2 Monaten abhängig von anfänglicher Schwere; einige stark beeinträchtigte Patienten mit anfangs normaler Propriozeption hatten ein gutes Ergebnis.)
- Read SJ, Hirano T, Abbott DF, Markus R, Sachinidis JI, Tochon-Danguy HJ, Chan JG, Egan GF, Scott AM, Bladin CF, McKay WJ, Donnan GA. The fate of hypoxic tissue on 18F-fluoromisonidazole positron emission tomography after ischemic stroke. Ann Neurol 2000;48:228–235. (24 Patienten bis 51 h nach Beginn untersucht: Patientenanteil mit hypoxischem, aber vitalem Gewebe und dessen Umfang nahmen mit der Zeit ab; durchschnittlich überlebten 45 % davon: Deshalb wird Gewebe höchstens zwei Tage als gefährdete Penumbra gezählt.)
- Markus R, Reutens DC, Kazui S, Read S, Wright P, Pearce DC, Tochon-Danguy HJ, Sachinidis JI, Donnan GA. Hypoxic tissue in ischaemic stroke: persistence and clinical consequences of spontaneous survival. Brain 2004;127:1427–1436. (Hypoxisches Gewebe machte in 60 % der Untersuchungen innerhalb von 12 h nach Beginn mehr als ein Fünftel des ischämischen Volumens aus, gegenüber 16 % bei 12–48 h.)

<a id="臨床細節審查b-clinical-detail-audit-b-treatment-haemodynamics-brainstem-and-thalamus-acute-course"></a>
### Prüfung klinischer Details (B): Behandlung, Hämodynamik, Hirnstamm und Thalamus sowie akuter Verlauf

- Alamowitch S, Turc G, Palaiodimou L, et al. European Stroke Organisation (ESO) expedited recommendation on tenecteplase for acute ischaemic stroke. Eur Stroke J 2023;8:8–54. (Tenecteplase 0.25 mg/kg als Alternative zu Alteplase, bei großem Gefäßverschluss bevorzugt; nicht für beim Erwachen bemerkte Schlaganfälle, deren Auswahl allein auf nativem CT beruht.)
- Alemdar M. Hyperthermia associated with bilateral mesencephalothalamic infarction. J Stroke Cerebrovasc Dis 2012;21:907.e13–907.e15. (Ischämisch, beidseitig paramedian im Mittelhirn–Thalamus; 39.3 °C ohne Infektion.)
- Alemseged F, Van der Hoeven E, Di Giuliano F, et al. Response to late-window endovascular revascularization is associated with collateral status in basilar artery occlusion. Stroke 2019;50:1415–1422. (Bei ungünstigem BATMAN oder PC-CS war Revaskularisation innerhalb von 6 h, nicht aber später, mit gutem Ergebnis verbunden.)
- Amarenco P, Hauw JJ. Cerebellar infarction in the territory of the superior cerebellar artery: a clinicopathologic study of 33 cases. Neurology 1990;40:1383–1390. (Autopsieserie: verzögertes Koma durch Kleinhirnschwellung bei 6 der 9 Patienten mit zerebellären und vestibulären Zeichen; PICA-Infarkte begleiteten häufig SCA-Infarkte.)
- Arauz A, Patiño-Rodríguez HM, Vargas-González JC, Arguelles-Morales N, Silos H, Ruiz-Franco A, Ochoa MA. Clinical spectrum of artery of Percheron infarct: clinical-radiological correlations. J Stroke Cerebrovasc Dis 2014;23:1083–1088. (15 consecutive patients: mRS ≤ 2 after a mean 55 months in 2 of 8 (25%) with midbrain involvement and 4 of 6 (15 aufeinanderfolgende Patienten: mRS ≤ 2 nach durchschnittlich 55 Monaten bei 2 von 8 (25%) mit Mittelhirnbeteiligung und 4 von 6 (67%) ohne.)
- Ayling OGS, Alotaibi NM, Wang JZ, Fatehi M, Ibrahim GM, Benavente O, Field TS, Gooderham PA, Macdonald RL. Suboccipital decompressive craniectomy for cerebellar infarction: a systematic review and meta-analysis. World Neurosurg 2018;110:450–459.e5. (11 Studien, 283 Patienten: gepoolte Mortalität 20% nach subokzipitaler Dekompression.)
- Baki E, Baumgart L, Kehl V, et al. Predictors of malignant swelling in space-occupying cerebellar infarction. Stroke Vasc Neurol 2025;10:323–329. (33 von 93, 35.5%; oberhalb von 38 cm³ mehr als die Hälfte; Hirnstamminfarkt nur in univariater Analyse assoziiert; 13 von 33 nach mehr als 3 Tagen.)
- Bang OY, Chung JW, Kim SK, et al. Therapeutic-induced hypertension in patients with noncardioembolic acute stroke. Neurology 2019;93:e1955–e1963. (Randomisiert, n = 153, Klasse III; keine Eignung für Reperfusionstherapie.)
- Barow E, Boutitie F, Cheng B, et al. Functional outcome of intravenous thrombolysis in patients with lacunar infarcts in the WAKE-UP trial. JAMA Neurol 2019;76:641–649. (Lakunäre Schlaganfälle: Wirkung von Alteplase unterschied sich nicht von anderen Schlaganfällen.)
- Bassetti C, Bogousslavsky J, Barth A, Regli F. Isolated infarcts of the pons. Neurology 1996;46:165–175. (21 von 36 ventral; nur 4 mit gekreuzten Defiziten, keiner entsprach einem klassischen pontinen Syndrom.)
- Beghi E, D'Alessandro R, Beretta S, et al. Incidence and predictors of acute symptomatic seizures after stroke. Neurology 2011;77:1785–1793. (Anfälle innerhalb von 7 Tagen bei 4.2% der Infarkte und 12.5% von 32 mit hämorrhagischer Transformation, OR 2.7, 0.8–9.6; kortikale Beteiligung OR 3.1.)
- Bendszus M, Fiehler J, Subtil F, et al. Endovascular thrombectomy for acute ischaemic stroke with established large infarct: multicentre, open-label, randomised trial (TENSION). Lancet 2023;402:1753–1763.
- Benke T. Peduncular hallucinosis: a syndrome of impaired reality monitoring. J Neurol 2006;253:1561–1571. (5 Patienten; sonst einzelne Fallberichte; über Monate wiederkehrende Halluzinationen.)
- Bladin CF, Alexandrov AV, Bellavance A, et al. Seizures after stroke: a prospective multicenter study. Arch Neurol 2000;57:1617–1622. (8.6% nach ischämischem Schlaganfall über durchschnittlich 9 Monate; Epilepsie bei 2.5% aller 1897; später erster Anfall HR 12.37 für Epilepsie.)
- Brandt T, Dieterich M. Skew deviation with ocular torsion: a vestibular brainstem sign of topographic diagnostic value. Ann Neurol 1993;33:528–534. (Läsionsseitiges Auge tiefer bei kaudalen pontomedullären Läsionen, gegenüberliegendes Auge tiefer bei rostralen pontomesenzephalen Läsionen.)
- Campbell BCV, Mitchell PJ, Churilov L, et al. Tenecteplase versus alteplase before thrombectomy for ischemic stroke (EXTEND-IA TNK). N Engl J Med 2018;378:1573–1582.
- Caplan LR. "Top of the basilar" syndrome. Neurology 1980;30:72–79. (Somnolenz, lebhafte Halluzinationen und traumähnliches Verhalten bei rostralem Hirnstamminfarkt.)
- Carrera E, Bogousslavsky J. The thalamus and behavior: effects of anatomically distinct strokes. Neurology 2006;66:1817–1823. (Anterior: Perseveration, Apathie, Amnesie; paramedian: Enthemmung, Persönlichkeitsänderung, Verlust eigener Aktivierungsinitiative, Amnesie, bei ausgedehntem Befall thalamische „Demenz“.)
- Castaigne P, Lhermitte F, Buge A, Escourolle R, Hauw JJ, Lyon-Caen O. Paramedian thalamic and midbrain infarct: clinical and neuropathological study. Ann Neurol 1981;10:127–148. (Hypersomnie, tiefes Koma oder akinetischer Mutismus; abnorme Bewegungen immer verzögert.)
- Chang YY, Tsai TC, Shih PY, Liu JS. Unilateral symptomatic palatal myoclonus: MRI evidence of contralateral inferior olivary lesion. Gaoxiong Yi Xue Ke Xue Za Zhi 1993;9:371–376. (Okulopalataler Myoklonus 1 und 3 Monate nach der Läsion.)
- CLOTS (Clots in Legs Or sTockings after Stroke) Trials Collaboration. Effectiveness of intermittent pneumatic compression in reduction of risk of deep vein thrombosis in patients who have had a stroke (CLOTS 3): a multicentre randomised controlled trial. Lancet 2013;382:516–524. (Immobile Patienten, die nicht ohne Hilfe zur Toilette gehen können, von Tag 0 bis 3 eingeschlossen; proximale tiefe Venenthrombose innerhalb von 30 Tagen bei 8.5% mit intermittierender pneumatischer Kompression gegenüber 12.1% ohne.)
- Costalat V, Jovin TG, Albucher JF, et al. Trial of thrombectomy for stroke with a large infarct of unrestricted size (LASTE). N Engl J Med 2024;390:1677–1689.
- de Bastos Maximiano ML, Gonçalves OR, Falcão L, et al. Endovascular treatment in patients with cervical or intracranial isolated internal carotid artery occlusion: a systematic review and meta-analysis. Neuroradiol J 2026;39:557–566.
- Deuschl G, Bain P, Brin M. Consensus statement of the Movement Disorder Society on Tremor. Ad Hoc Scientific Committee. Mov Disord 1998;13 Suppl 3:2–23. (Holmes-Tremor als eigenständiges Tremorsyndrom.)
- Deuschl G, Toro C, Hallett M. Symptomatic and essential palatal tremor. 2. Differences of palatal movements. Mov Disord 1994;9:676–678. (Ohrklicken gehört zum essenziellen, nicht zum symptomatischen Gaumentremor.)
- Fiorelli M, Bastianello S, von Kummer R, et al. Hemorrhagic transformation within 36 hours of a cerebral infarct: relationships with early clinical deterioration and 3-month outcome in the European Cooperative Acute Stroke Study I (ECASS I) cohort. Stroke 1999;30:2280–2284.
- Förster A, Kerl HU, Goerlitz J, Wenz H, Groden C. Crossed cerebellar diaschisis in acute isolated thalamic infarction detected by dynamic susceptibility contrast perfusion MRI. PLoS One 2014;9:e88044. (Kontralaterale Kleinhirn-Hypoperfusion bei 9 von 39 akuten isolierten Thalamusinfarkten, 23.1%, alle tuberothalamisch, paramedian oder inferolateral; häufiger bei Dysarthrie und größeren Läsionen.)
- Galovic M, Döhler N, Erdélyi-Canavese B, et al. Prediction of late seizures after ischaemic stroke with a novel prognostic model (the SeLECT score): a multivariable prediction model development and validation study. Lancet Neurol 2018;17:143–152. (Späte Anfälle 4% nach 1 Jahr und 8% nach 5 Jahren; SeLECT 0.7–63% nach 1 Jahr.)
- Ghika-Schmid F, Bogousslavsky J. The acute behavioral syndrome of anterior thalamic infarction: a prospective study of 12 cases. Ann Neurol 2000;48:220–227. (Wortfindungsstörung bei allen, Dysarthrie bei 8, Hypophonie bei 5, Verständnis und Nachsprechen erhalten; verbaler Gedächtnisverlust nach linken, visuell-räumlicher nach rechten Infarkten; Gedächtnisverlust und Apathie blieben bestehen.)
- Goyal M, Versnick E, Tuite P, Cyr JS, Kucharczyk W, Montanera W, Willinsky R, Mikulis D. Hypertrophic olivary degeneration: metaanalysis of the temporal evolution of MR findings. AJNR Am J Neuroradiol 2000;21:1073–1077. (T2-Signal ab 1 Monat über Jahre; Vergrößerung ab 6 Monaten, Rückbildung bis 3–4 Jahre.)
- Harper C, Cardullo PA, Weyman AK, Patterson RB. Transcranial Doppler ultrasonography of the basilar artery in patients with retrograde vertebral artery flow. J Vasc Surg 2008;48:859–864. (Antegrader Basilarisfluss in Ruhe bei 19 von 25.)
- Huang H, Niu Z, Liu G, Jiang M, Jia Q, Li X, Su Y. Early consciousness disorder in acute large hemispheric infarction: an analysis based on quantitative EEG and brain network characteristics. Neurocrit Care 2020;33:376–388. (Ein großer Hemisphäreninfarkt umfasst mindestens zwei Drittel des MCA-Gebiets; ungefähr 77% haben früh eine Bewusstseinsstörung.)
- Huang W, Zhang Y, Zhuang Y, Shi Y, Feng Y. An anatomical study of persistent trigeminal artery detected by computed tomography angiography and magnetic resonance angiography: proposal for a modified classification and a novel basilar artery grading system. Surg Radiol Anat 2023;45:947–957. (57 von 94,487, 0.06%.)
- Huang YS, Hsiao MC, Lee M, Huang YC, Lee JD. Baclofen successfully abolished prolonged central hyperthermia in a patient with basilar artery occlusion. Acta Neurol Taiwan 2009;18:118–122. (Ischämisch; Hyperthermie bei schwerem Hirnstammschlaganfall weist auf schlechte Prognose hin.)
- Huo X, Ma G, Tong X, et al. Trial of endovascular therapy for acute ischemic stroke with large infarct (ANGEL-ASPECT). N Engl J Med 2023;388:1272–1283.
- Jauss M, Krieger D, Hornig C, Schramm J, Busse O. Surgical and medical management of patients with massive cerebellar infarctions: results of the German-Austrian Cerebellar Infarction Study. J Neurol 1999;246:257–264. (84 Patienten: Bewusstseinsniveau stärkster Prädiktor; Operation nicht besser bei wachen/benommenen oder somnolenten/soporösen Patienten; Verschlechterung an Tagen 2–4, meist an Tag 3.)
- Kargiotis O, Psychogios K, Safouris A, et al. Diagnosis and treatment of acute isolated proximal internal carotid artery occlusions: a narrative review. Ther Adv Neurol Disord 2022;15:17562864221136335.
- Kattah JC, Talkad AV, Wang DZ, Hsieh YH, Newman-Toker DE. HINTS to diagnose stroke in the acute vestibular syndrome: three-step bedside oculomotor examination more sensitive than early MRI diffusion-weighted imaging. Stroke 2009;40:3504–3510. (Skew-Deviation bei 30% mit Hirnstammbeteiligung, bei 4% mit peripherer Ursache.)
- Kilpatrick CJ, Davis SM, Tress BM, Rossiter SC, Hopper JL, Vandendriesen ML. Epileptic seizures in acute stroke. Arch Neurol 1990;47:157–160. (6.5% bei kortikalem Infarkt, gewöhnlich innerhalb von 48 h; keine bei lakunären Infarkten.)
- Kumral E, Bayülkem G, Evyapan D. Clinical spectrum of pontine infarction. Clinical-MRI correlations. J Neurol 2002;249:1659–1670. (150 isolierte pontine Infarkte: anteromedial 58%, bilateral 11% mit vorübergehendem Bewusstseinsverlust.)
- Labovitz DL, Hauser WA, Sacco RL. Prevalence and predictors of early seizure and status epilepticus after first stroke. Neurology 2001;57:200–206. (Frühe Anfälle 4.1%: lobärer Infarkt 5.9%, tiefer Infarkt 0.6%; Status epilepticus bei 27% davon; NIHSS kein unabhängiger Prädiktor.)
- Labropoulos N, Nandivada P, Bekelis K. Prevalence and impact of the subclavian steal syndrome. Ann Surg 2010;252:166–170. (Überwiegend asymptomatisch; Symptome häufiger bei Arm-Blutdruckdifferenzen über 40–50 mmHg.)
- Laureys S, Pellas F, Van Eeckhout P, et al. The locked-in syndrome: what is it like to be conscious but paralyzed and voiceless? Prog Brain Res 2005;150:495–511. (Häufig Tage bis Wochen komatös vor Erwachen im Locked-in-Zustand; Diagnose dauerte durchschnittlich 2.5 Monate.)
- Lazzaro NA, Wright B, Castillo M, Fischbein NJ, Glastonbury CM, Hildenbrand PG, Wiggins RH, Quigley EP, Osborn AG. Artery of Percheron infarction: imaging patterns and clinical spectrum. AJNR Am J Neuroradiol 2010;31:1283–1289. (37 Patienten: mit Mittelhirnbeteiligung 43%, ohne 38%, mit anteriorem Thalamus und Mittelhirn 14%, anteriorer Thalamus ohne Mittelhirn 5%.)
- Leonardi-Bee J, Bath PM, Phillips SJ, Sandercock PA; IST Collaborative Group. Blood pressure and clinical outcomes in the International Stroke Trial. Stroke 2002;33:1315–1320. (U-förmiger Zusammenhang zwischen systolischem Druck und Ergebnis; hoher Druck mit frühem Rezidiv und Ödemtod, nicht mit symptomatischer Blutung verbunden.)
- Lyden P, Brott T, Tilley B, Welch KM, Mascha EJ, Levine S, Haley EC, Grotta J, Marler J. Improved reliability of the NIH Stroke Scale using video training. NINDS TPA Stroke Study Group. Stroke 1994;25:2220–2226. (NIHSS wie in der NINDS-t-PA-Studie verwendet, mit Videozertifizierung.)
- Ma H, Campbell BCV, Parsons MW, et al. Thrombolysis guided by perfusion imaging up to 9 hours after onset of stroke (EXTEND). N Engl J Med 2019;380:1795–1803.
- Menon BK, Buck BH, Singh N, et al. Intravenous tenecteplase compared with alteplase for acute ischaemic stroke in Canada (AcT): a pragmatic, multicentre, open-label, registry-linked, randomised, controlled, non-inferiority trial. Lancet 2022;400:161–169.
- Neau JP, Bogousslavsky J. The syndrome of posterior choroidal artery territory infarction. Ann Neurol 1996;39:779–788. (10 von 2,925 Schlaganfallpatienten; lateral: Quadrantenanopsie ± hemisensorischer Verlust, transkortikale Aphasie, Gedächtnis; horizontale Sektoranopsie außergewöhnlich; später Schmerz und abnorme Bewegungen.)
- O'Donnell JC, Browne KD, Kilbaugh TJ, Chen HI, Whyte J, Cullen DK. Challenges and demand for modeling disorders of consciousness following traumatic brain injury. Neurosci Biobehav Rev 2019;98:336–346. (Nur Definitionen: Koma selten länger als zwei Wochen, danach Syndrom reaktionsloser Wachheit oder minimaler Bewusstseinszustand.)
- Osiro S, Zurada A, Gielecki J, Shoja MM, Tubbs RS, Loukas M. A review of subclavian steal syndrome with clinical correlation. Med Sci Monit 2012;18:RA57–RA63. (Das Steal-Phänomen bezeichnet umgekehrten Vertebralisfluss; das Syndrom bezeichnet dessen vertebrobasiläre oder Armsymptome; gewöhnlich asymptomatisch.)
- Phuyal S, Pokhrel B, Lamsal R, Mishra B, Nayak MK. Sequential mechanical thrombectomies in acute bilateral middle cerebral artery strokes: a case report and review of literature. J Neurosci Rural Pract 2024;15:381–383. (Gleichzeitiger Verschluss beider MCAs meist verheerend; hoher NIHSS bei niedrigem Bewusstseinsniveau ist ein Hinweis.)
- Prabhakaran S, Gonzalez NR, Zachrison KS, et al. 2026 Guideline for the early management of patients with acute ischemic stroke: a guideline from the American Heart Association/American Stroke Association. Stroke 2026;57:e316–e436. (Wesentliche Aktualisierungen betreffen Thrombolytika-Auswahl und Eignung; nur auf Abstract-Ebene zitiert.)
- Qureshi AI, Suarez JI, Yahia AM, et al. Timing of neurologic deterioration in massive middle cerebral artery infarction: a multicenter review. Crit Care Med 2003;31:272–277. (53 Patienten: 36% verschlechterten sich innerhalb von 24 h, 68% bis 48 h; Todesfälle am häufigsten an Tag 3.)
- Raina GB, Cersosimo MG, Folgar SS, et al. Holmes tremor: clinical description, lesion localization, and treatment in a series of 29 cases. Neurology 2016;86:931–938. (Median 2 Monate von Läsion bis Tremor; Levodopa half 13 von 24.)
- Regenhardt RW, Das AS, Stapleton CJ, Chandra RV, Rabinov JD, Patel AB, Hirsch JA, Leslie-Mazwi TM. Blood pressure and penumbral sustenance in stroke from large vessel occlusion. Front Neurol 2017;8:317. (Astrups Penumbra: Infarkt unter ungefähr 10, für Stunden vital zwischen 10 und 20 mL/100 g/min.)
- Sacco RL, Freddo L, Bello JA, Odel JG, Onesti ST, Mohr JP. Wallenberg's lateral medullary syndrome. Clinical-magnetic resonance imaging correlations. Arch Neurol 1993;50:609–614. (Diplopie oder verschwommenes Sehen bei 11 von 33, nicht zwingend über die laterale Medulla hinausreichend.)
- Sandset EC, Palaiodimou L, Jahr SH, et al. 2025 update to European Stroke Organisation (ESO) guideline on blood pressure management in acute ischaemic stroke and intracerebral haemorrhage. Eur Stroke J 2026;11:aakag004. (Unter 185/110 mmHg vor Thrombolyse und 180/105 mmHg für 24 h danach; routinemäßige Vasopressoren ohne Reperfusionstherapie nicht empfohlen.)
- Sarraj A, Hassan AE, Abraham MG, et al. Trial of endovascular thrombectomy for large ischemic strokes (SELECT2). N Engl J Med 2023;388:1259–1271.
- Scala I, Ciacciarelli A, Cancelloni V, et al. Safety and efficacy of repeated intravenous thrombolysis within 3 months for acute ischemic stroke: a systematic review and individual-patient data meta-analysis. J Neurol 2026;273:607. (Aktuelle Leitlinien betrachten einen ischämischen Schlaganfall innerhalb von 3 Monaten überwiegend aufgrund von Expertenkonsens als relative Kontraindikation zur IV-Thrombolyse; 63 veröffentlichte Wiederholungsthrombolysen innerhalb von 90 Tagen ohne symptomatische Blutung: Deshalb nennen die Behandlungsfenster eines zweiten Verschlusses innerhalb von 3 Monaten nach Infarkt IV-Thrombolyse nicht als Standard und kennzeichnen den Hinweis als relativ.)
- Schaller-Paule MA, Steidl E, Shrestha M, et al. Multicenter prospective analysis of hypertrophic olivary degeneration following infratentorial stroke (HOD-IS): evaluation of disease epidemiology, clinical presentation, and MR-imaging aspects. Front Neurol 2021;12:675123. (Studienprotokoll: Häufigkeit nach Schlaganfall unbekannt.)
- Sciacca S, Lynch J, Davagnanam I, Barker R. Midbrain, pons, and medulla: anatomy and syndromes. Radiographics 2019;39:1110–1125. (Allgemeine Übersicht über Hirnstammanatomie und -syndrome.)
- Shah S, Liang L, Kosinski A, et al. Safety and outcomes of intravenous tPA in acute ischemic stroke patients with prior stroke within 3 months: findings from Get With The Guidelines-Stroke. Circ Cardiovasc Qual Outcomes 2020;13:e006031. (Leitlinien raten von IV-tPA innerhalb von 3 Monaten nach ischämischem Schlaganfall ab; bei 293 Patienten ab 66 Jahren, die innerhalb von 3 Monaten danach thrombolysiert wurden, war symptomatische Blutung nur innerhalb von 14 Tagen häufiger, 16.3% gegenüber 4.8%.)
- Steidl E, Rauch M, Hattingen E, et al. Qualitative and quantitative detectability of hypertrophic olivary degeneration in T2, FLAIR, PD, and DTI: a prospective MRI study. Front Neurol 2022;13:950191. (Bei 38–67% von 15 Patienten sichtbar, abhängig von Sequenz und Beurteiler.)
- Szaflarski JP, Rackley AY, Kleindorfer DO, et al. Incidence of seizures in the acute phase of stroke: a population-based study. Epilepsia 2008;49:974–981. (3.1% von 6044 Schlaganfällen einschließlich Blutungen innerhalb von 24 h.)
- Thomalla G, Simonsen CZ, Boutitie F, et al. MRI-guided thrombolysis for stroke with unknown time of onset (WAKE-UP). N Engl J Med 2018;379:611–622.
- Tilikete C, Desestret V. Hypertrophic olivary degeneration and palatal or oculopalatal tremor. Front Neurol 2017;8:302. (Wochen bis Monate nach der Läsion; häufiger nach Blutung als nach Infarkt.)
- Tobalem S, Schutz JS, Chronopoulos A. Central retinal artery occlusion – rethinking retinal survival time. BMC Ophthalmol 2018;18:101. (Infarkt der inneren Retina wahrscheinlich nach 12–15 min vollständigen Verschlusses; viele Verschlüsse sind unvollständig.)
- Triantafyllou G, Paschopoulos I, Papadopoulos-Manolarakis P, et al. Prevalence of basilar artery variants: a systematic review with meta-analysis of radiological studies. Neuroradiology 2026;68:1607–1617. (Persistierende A. trigeminalis 0.20%.)
- Wang J, Zheng C, Hou B, Huang A, Zhang X, Du B. Four collateral circulation pathways were observed after common carotid artery occlusion. BMC Neurol 2019;19:201. (16 Patienten mit offener ICA und ECA: bei allen antegrader ICA-Fluss, gespeist durch umgekehrten ECA-Fluss, etwa aus Truncus thyrocervicalis und A. thyroidea superior.)
- Xiong Y, Campbell BCV, Schwamm LH, et al. Tenecteplase for ischemic stroke at 4.5 to 24 hours without thrombectomy (TRACE-III). N Engl J Med 2024;391:203–212.
- Yaghi S, Boehme AK, Dibu J, et al. Treatment and outcome of thrombolysis-related hemorrhage: a multicenter retrospective study. JAMA Neurol 2015;72:1451–1457. (Median 470 min von Alteplase-Beginn bis symptomatischer Blutung; Krankenhausmortalität 52%.)
- Yaghi S, Eisenberger A, Willey JZ. Symptomatic intracerebral hemorrhage in acute ischemic stroke after thrombolysis with intravenous recombinant tissue plasminogen activator: a review of natural history and treatment. JAMA Neurol 2014;71:1181–1185.
- Yang P, Song L, Zhang Y, et al. Intensive blood pressure control after endovascular thrombectomy for acute ischaemic stroke (ENCHANTED2/MT): a multicentre, open-label, blinded-endpoint, randomised controlled trial. Lancet 2022;400:1585–1596. (Systolischer Zielwert unter 120 mmHg nach erfolgreicher Thrombektomie führte zu schlechterem funktionellem Ergebnis.)
- Yoshimura S, Sakai N, Yamagami H, et al. Endovascular therapy for acute stroke with a large ischemic region (RESCUE-Japan LIMIT). N Engl J Med 2022;386:1303–1313.

<a id="中風後常見但與病灶部位關聯有限的問題--common-after-stroke-weakly-tied-to-the-lesion-site"></a>
### Nach Schlaganfall häufige Probleme mit begrenztem Bezug zum Läsionsort

Als Häufigkeiten in Populationen neben dem Ergebnis dargestellt, niemals als Symptome des simulierten Falls (`src/anatomy/postStrokeRisks.ts`):

- Hackett ML, Pickles K. Part I: frequency of depression after stroke: an updated systematic review and meta-analysis of observational studies. Int J Stroke 2014;9:1017–1025.
- Ayerbe L et al. Natural history, predictors and outcomes of depression after stroke: systematic review and meta-analysis. Br J Psychiatry 2013;202:14–21.
- Carson AJ et al. Depression after stroke and lesion location: a systematic review. Lancet 2000;356:122–126.
- Knapp P et al. Frequency of anxiety after stroke: an updated systematic review and meta-analysis of observational studies. Int J Stroke 2020;15:244–255.
- Wright F et al. Factors associated with poststroke anxiety: a systematic review and meta-analysis. Stroke Res Treat 2017;2017:2124743.
- Caeiro L, Ferro JM, Costa J. Apathy secondary to stroke: a systematic review and meta-analysis. Cerebrovasc Dis 2013;35:23–39.
- Gillespie DC et al. Prevalence of pseudobulbar affect following stroke: a systematic review and meta-analysis. J Stroke Cerebrovasc Dis 2016;25:688–694.
- Broomfield NM et al. Post-stroke emotionalism: diagnosis, pathophysiology, and treatment. Int J Stroke 2024;19:857–866.
- Cumming TB et al. The prevalence of fatigue after stroke: a systematic review and meta-analysis. Int J Stroke 2016;11:968–977.
- Kutlubaev MA, Duncan FH, Mead GE. Biological correlates of post-stroke fatigue: a systematic review. Acta Neurol Scand 2012;125:219–227.
- Baylan S et al. Incidence and prevalence of post-stroke insomnia: a systematic review and meta-analysis. Sleep Med Rev 2020;49:101222.
- Seiler A et al. Prevalence of sleep-disordered breathing after stroke and TIA: a meta-analysis. Neurology 2019;92:e648–e654.
- Johnson KG, Johnson DC. Frequency of sleep apnea in stroke and TIA patients: a meta-analysis. J Clin Sleep Med 2010;6:131–137.
- Yaggi HK et al. Obstructive sleep apnea as a risk factor for stroke and death. N Engl J Med 2005;353:2034–2041.
- Pendlebury ST, Rothwell PM. Prevalence, incidence, and factors associated with pre-stroke and post-stroke dementia: a systematic review and meta-analysis. Lancet Neurol 2009;8:1006–1018.
- Ghika-Schmid F, Ghika J, Regli F, Bogousslavsky J. Hyperkinetic movement disorders during and after acute stroke: the Lausanne Stroke Registry. J Neurol Sci 1997;146:109–116.
- Postuma RB, Lang AE. Hemiballism: revisiting a classic disorder. Lancet Neurol 2003;2:661–668.
- Kim JS. Delayed onset mixed involuntary movements after thalamic stroke: clinical, radiological and pathophysiological findings. Brain 2001;124:299–309.
- Bogousslavsky J, Regli F, Uske A. Thalamic infarcts: clinical syndromes, etiology, and prognosis. Neurology 1988;38:837–848.
- Bhatia KP, Marsden CD. The behavioural and motor consequences of focal lesions of the basal ganglia in man. Brain 1994;117:859–876.
- Amarenco P et al. One-year risk of stroke after transient ischemic attack or minor stroke. N Engl J Med 2016;374:1533–1542.
- Forster A, Young J. Incidence and consequences of falls due to stroke: a systematic inquiry. BMJ 1995;311:83–86.
- Langhorne P, Stott DJ, Robertson L, MacDonald J, Jones L, McAlpine C, Dick F, Taylor GS, Murray G. Medical complications after stroke: a multicenter study. Stroke 2000;31:1223–1229.
- Lindgren I, Jönsson AC, Norrving B, Lindgren A. Shoulder pain after stroke: a prospective population-based study. Stroke 2007;38:343–348.
- Mohan KM, Wolfe CD, Rudd AG, Heuschmann PU, Kolominsky-Rabas PL, Grieve AP. Risk and cumulative risk of stroke recurrence: a systematic review and meta-analysis. Stroke 2011;42:1489–1494.
- Patel M, Coshall C, Rudd AG, Wolfe CD. Natural history and effects on 2-year outcomes of urinary incontinence after stroke. Stroke 2001;32:122–127.
- Weaver NA et al. Strategic infarct locations for post-stroke cognitive impairment: a pooled analysis of individual patient data from 12 acute ischaemic stroke cohorts. Lancet Neurol 2021;20:448–459.
- Weaver NA et al. Strategic infarct locations for poststroke depressive symptoms: a lesion- and disconnection-symptom mapping study. Biol Psychiatry Cogn Neurosci Neuroimaging 2023;8:387–396.
- Martino R, Foley N, Bhogal S, Diamant N, Speechley M, Teasell R. Dysphagia after stroke: incidence, diagnosis, and pulmonary complications. Stroke 2005;36:2756–2763.

<a id="參考的開源專案未複製程式碼-open-source-projects-consulted-no-code-copied"></a>
## Herangezogene Open-Source-Projekte (kein Code kopiert)

- [openBF (INSIGNEO)](https://github.com/INSIGNEO/openBF) — Apache-2.0
  - Gefäßradien und -längen des Alastruey-2007-Modells des Circulus arteriosus Willisii wurden als Referenz verwendet; kein Code kopiert.
- [WillisWorks](https://github.com/abhogal-lab/WillisWorks) — GPL-3.0
  - Inspirierte die didaktische Darstellung von Autoregulation, Steal-Phänomen und Kollateralen; wegen inkompatibler Lizenz nur Konzepte übernommen, keinen Code.
- [neuroaxis-atlas](https://github.com/linkbag/neuroaxis-atlas) — MIT
  - Seine Hirnstamm-Syndromkarten und Quellenkennzeichnung dienten als Orientierung.
- [brain-game](https://github.com/Rickaym/brain-game) — MIT (code)
  - Seine Zuordnung von Regionen zu Arterien und die Idee eines Schlaganfallsimulators dienten als Orientierung; sein 3D-Modell (CC BY-SA 2.1 JP) wird hier nicht verwendet.

<a id="免責聲明--disclaimer"></a>
## Haftungshinweis

Die klinischen Inhalte sind eine vereinfachte Zusammenstellung für Bildungszwecke und wurden nicht formell durch klinisch tätige Ärzte geprüft; tatsächliche klinische Erscheinungsbilder unterscheiden sich zwischen Personen.

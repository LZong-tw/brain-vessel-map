[繁體中文](REFERENCES.zh-TW.md) · [简体中文](REFERENCES.zh-CN.md) · [English](REFERENCES.md) · [Deutsch](REFERENCES.de.md) · [日本語](REFERENCES.ja.md)

<!-- source-doc: REFERENCES.md; sha256: e10665b0f0ec0da16e2706bcbbc98d9c82db375679b9f642e10bcc9d6a1f2346 -->

<a id="參考文獻與相關專案--references"></a>
# 参考文献与相关项目

应用“来源及许可”显示相同列表，维护于 `src/anatomy/sources.ts`。
许可详情见 [`THIRD_PARTY_NOTICES.zh-CN.md`](THIRD_PARTY_NOTICES.zh-CN.md).

<a id="資料來源--data-sources"></a>
## 数据来源

- **MNI ICBM 152 Nonlinear Asymmetric 2009c template (via TemplateFlow)** — McGill/MNI 宽松许可证（须保留版权声明）。 Copyright (C) 1993–2004 Louis Collins, McConnell Brain Imaging Centre, Montreal Neurological Institute, McGill University. Fonov V et al., NeuroImage 2011;54:313–327; Fonov V et al., NeuroImage 2009;47:S102. 通过 TemplateFlow 分发 (Ciric R et al., Nat Methods 2022). <https://www.templateflow.org/>
  - 大脑、小脑、脑干与深部核团的 3D 表面（由概率图与分割结果以 marching cubes 产生、简化）。
  - 大脑、小脑、脑干与深部核团的 3D 表面（由概率图与分割结果以 marching cubes 产生、简化）。
- **DKT31 cortical labels in MNI152NLin2009cAsym (Mindboggle OASIS-TRT-20 joint fusion)** — CC BY 4.0. Klein A, Tourville J. 101 labeled brain images and a consistent human cortical labeling protocol. Front Neurosci 2012;6:171. Mindboggle-101 (Zenodo). <https://mindboggle.info/data>
  - 皮质脑回分区（决定每个表面点属于哪个功能脑区）。
  - 皮质脑回分区（决定每个表面点属于哪个功能脑区）。
- **FreeSurfer aseg segmentation of MNI152NLin2009cAsym (TemplateFlow)** — 模板许可证（McGill/MNI 声明）。 Fischl B et al. Neuron 2002;33:341–355 (FreeSurfer). 由 TemplateFlow 提供。 <https://www.templateflow.org/>
  - 深部构造（丘脑、尾状核、壳核、苍白球、海马回、杏仁核）与脑干、小脑的分割。
  - 深部构造（丘脑、尾状核、壳核、苍白球、海马回、杏仁核）与脑干、小脑的分割。
- **MIAL67 probabilistic atlas of thalamic nuclei** — CC BY 4.0. Najdenovska E et al. In-vivo probabilistic atlas of human thalamic nuclei based on diffusion-weighted MRI. Sci Data 2018;5:180270. <https://doi.org/10.5281/zenodo.1241074>
  - 把丘脑分成前部、旁正中、腹外侧、后部等血管供应区。
  - 把丘脑分成前部、旁正中、腹外侧、后部等血管供应区。
- **Digital 3D Brain MRI Arterial Territories Atlas** — CC BY-SA 4.0. Digital 3D Brain MRI Arterial Territories Atlas © 2021 The Johns Hopkins University. Liu CF, Hsu J, Xu X, et al. Sci Data 2023;10:74. <https://github.com/Chin-Fu-Liu/Arterial_Atlas>
  - 每个脑组织体素的动脉供应区（大脑前、中、后动脉各分部、豆纹、脉络丛、小脑动脉），并据此找出分水岭区。
  - 每个脑组织体素的动脉供应区（大脑前、中、后动脉各分部、豆纹、脉络丛、小脑动脉），并据此找出分水岭区。
- **Statistical atlas of cerebral arteries (multi-centre MRA)** — CC0 1.0. Mouches P, Forkert ND. A statistical atlas of cerebral arteries generated using multi-center MRA datasets from healthy subjects. Sci Data 2019;6:29. <https://doi.org/10.6084/m9.figshare.c.4215089>
  - 把手绘的血管中心线校正到统计上真实的血管位置（Willis 环、基底动脉、椎动脉、M1、A1/A2、P1/P2 等）。
  - 把手绘的血管中心线校正到统计上真实的血管位置（Willis 环、基底动脉、椎动脉、M1、A1/A2、P1/P2 等）。

<a id="醫學與生理文獻--scientific-references"></a>
## 医学与生理文献

`src/engine/` 和 `src/anatomy/` 中的阈值、时间过程及综合征定义由以下文献简化而来：

<a id="可定位的非運動症狀--localised-non-motor-symptoms"></a>
### 可定位的非运动症状

睡眠、情感表达、体温调节与出汗、味觉和膀胱控制（`src/anatomy/symptoms.ts`、`src/anatomy/regions.ts`）：

- Bassetti C, Mathis J, Gugger M, Lovblad KO, Hess CW. Hypersomnia following paramedian thalamic stroke: a report of 12 patients. Ann Neurol 1996;39:471–480. (持续性嗜睡。)
- Bassetti CL. Sleep and stroke. Semin Neurol 2005;25:19–32. (丘脑或脑干损伤造成持续睡眠–觉醒障碍。)
- Bogousslavsky J, Khurana R, Deruaz JP, Hornung JP, Regli F, Janzer R, Perret C. Respiratory failure and unilateral caudal brainstem infarction. Ann Neurol 1990;28:668–673. (自动呼吸丧失 — 2 例。)
- Grau AJ, Buggle F, Schnitzler P, Spiel M, Lichy C, Hacke W. Fever and infection early after ischemic stroke. J Neurol Sci 1999;171:115–120. (早期发热多为感染，所以中枢性发热仅作为风险警示。)
- Heckmann JG, Stössel C, Lang CJ, Neundörfer B, Tomandl B, Hummel T. Taste disorders in acute stroke: a prospective observational study on taste disorders in 102 stroke patients. Stroke 2005;36:1690–1694.
- Hermann DM, Siccoli M, Brugger P, Wachter K, Mathis J, Achermann P, Bassetti CL. Evolution of neurological, neuropsychological and sleep-wake disturbances after paramedian thalamic stroke. Stroke 2008;39:62–68. (嗜睡病程，单侧与双侧；所有双侧、90% 左侧及 33% 右侧卒中后持续额叶和认知缺损。)
- House A, Dennis M, Molyneux A, Warlow C, Hawton K. Emotionalism after stroke. BMJ 1989;298:991–994.
- Kim BS, Kim YI, Lee KS. Contralateral hyperhidrosis after cerebral infarction. Clinicoanatomic correlations in five cases. Stroke 1995;26:896–899.
- Kim JS. Post-stroke emotional incontinence after small lenticulocapsular stroke: correlation with lesion location. J Neurol 2002;249:805–810.
- Kim JS, Choi-Kwon S. Poststroke depression and emotional incontinence: correlation with lesion location. Neurology 2000;54:1805–1810. (病理性哭泣的定位。)
- Kimura K, Tachibana N, Kohyama J, Otsuka Y, Fukazawa S, Waki R. A discrete pontine ischemic lesion could cause REM sleep behavior disorder. Neurology 2000;55:894–895. (病例报告。)
- Korpelainen JT, Sotaniemi KA, Myllylä VV. Hyperhidrosis as a reflection of autonomic failure in patients with acute hemispheral brain infarction. An evaporimetric study. Stroke 1992;23:1271–1275.
- Korpelainen JT, Sotaniemi KA, Myllylä VV. Ipsilateral hypohidrosis in brain stem infarction. Stroke 1993;24:100–104.
- Korpelainen JT, Sotaniemi KA, Myllylä VV. Asymmetric sweating in stroke: a prospective quantitative study of patients with hemispheral brain infarction. Neurology 1993;43:1211–1214.
- Korpelainen JT, Sotaniemi KA, Myllylä VV. Asymmetrical skin temperature in ischemic stroke. Stroke 1995;26:1543–1547. (梗死对侧肢体较冷。)
- Labar DR, Mohr JP, Nichols FT 3rd, Tatemichi TK. Unilateral hyperhidrosis after cerebral infarction. Neurology 1988;38:1679–1682.
- Landis BN, Leuchter I, San Millán Ruíz D, Lacroix JS, Landis T. Transient hemiageusia in cerebrovascular lateral pontine lesions. J Neurol Neurosurg Psychiatry 2006;77:680–683. (病例报告。)
- Mendoza M, Latorre JG. Pearls and oy-sters: reversible Ondine's curse in a case of lateral medullary infarction. Neurology 2013;80:e13–e16. (病例报告。)
- Odd H, Dore C, Eriksson SH, Heydrich L, Bargiotas P, Ashburner J, Lambert C. Lesion network mapping of REM sleep behaviour disorder. Neuroimage Clin 2025;45:103751.
- Onoda K, Ikeda M, Sekine H, Ogawa H. Clinical study of central taste disorders and discussion of the central gustatory pathway. J Neurol 2012;259:261–266. (按病灶层面划分味觉丧失侧别。)
- Pavšič K, Pretnar-Oblak J, Bajrović FF, Dolenc-Grošelj L. Prospective study of sleep-disordered breathing in 28 patients with acute unilateral lateral medullary infarction. Sleep Breath 2020;24:1557–1563.
- Rousseaux M, Hurtevent JF, Benaim C, Cassim F. Late contralateral hyperhidrosis in lateral medullary infarcts. Stroke 1996;27:991–995. (未模拟。)
- Sacco S, Sarà M, Pistoia F, Conson M, Albertini G, Carolei A. Management of pathologic laughter and crying in patients with locked-in syndrome: a report of 4 cases. Arch Phys Med Rehabil 2008;89:775–778.
- Sakakibara R, Hattori T, Yasuda K, Yamanishi T. Micturitional disturbance and the pontine tegmental lesion: urodynamic and MRI analyses of vascular cases. J Neurol Sci 1996;141:105–110.
- Sung CY, Lee TH, Chu NS. Central hyperthermia in acute stroke. Eur Neurol 2009;62:86–92. (多发生于出血后，全部累及脑干，所以中枢性发热仅显示为风险警示。)
- Tang WK, Hermann DM, Chen YK, Liang HJ, Liu XX, Chu WC, Ahuja AT, Abrigo J, Mok V, Ungvari GS, Wong KS. Brainstem infarcts predict REM sleep behavior disorder in acute ischemic stroke. BMC Neurol 2014;14:88.
- Tellenbach N, Schmidt MH, Alexiev F, Blondiaux E, Cavalloni F, Bassetti CL, Heydrich L, Bargiotas P. REM sleep and muscle atonia in brainstem stroke: a quantitative polysomnographic and lesion analysis study. J Sleep Res 2023;32:e13640. (反对证据：REM 肌肉活动未增加。)
- Wanklyn P, Ilsley DW, Greenstein D, Hampton IF, Roper TA, Kester RC, Mulley GP. The cold hemiplegic arm. Stroke 1994;25:1765–1770.
- Wanklyn P, Forster A, Young J, Mulley G. Prevalence and associated features of the cold hemiplegic arm. Stroke 1995;26:1867–1870.
- Xi Z, Luning W. REM sleep behavior disorder in a patient with pontine stroke. Sleep Med 2009;10:143–146. (病例报告。)

<a id="臨床細節審查a-clinical-detail-audit-a-cortex-deep-structures-medulla-and-cerebellum-late-and-non-motor-nihss"></a>
### 临床细节审查（A）：皮质、深部结构、延髓与小脑、晚期及非运动症状、NIHSS

- Torab-Miandoab A, Samad-Soltani T, Shams-Vahdati S, Rezaei-Hachesu P. An intelligent system for improving adherence to guidelines on acute stroke. Turk J Emerg Med 2020;20:118–134. (附录 3 重现 NIH Stroke Scale 指南，作为项目规则依据：下落、昏睡、构音不能、共济失调、双侧脑干感觉丧失。)
- Aldrich MS, Alessi AG, Beck RW, Gilman S. Cortical blindness: etiology, diagnosis, and prognosis. Ann Neurol 1987;21:149–158. (25 人中只有 3 人否认失明，因此描述 Anton 综合征，不对每例都列出。)
- Amarenco P, Hauw JJ, Hénin D, Duyckaerts C, Roullet E, Laplane D, Gautier JC, Lhermitte F, Buge A, Castaigne P. Cerebellar infarction in the area of the posterior cerebellar artery. Clinicopathology of 28 cases. Rev Neurol (Paris) 1989;145:277–286. (法语，研究小脑下后动脉区域；9 例内侧分支梗死中 5 例延伸至延髓背外侧，4 例表现为 Wallenberg 综合征。)
- Amarenco P, Roullet E, Hommel M, Chaine P, Marteau R. Infarction in the territory of the medial branch of the posterior inferior cerebellar artery. J Neurol Neurosurg Psychiatry 1990;53:731–735.
- Andersen G, Vestergaard K, Ingeman-Nielsen M, Jensen TS. Incidence of central post-stroke pain. Pain 1995;61:187–193.
- Arboix A, Bell Y, García-Eroles L, Massons J, Comes E, Balcells M, Targa C. Clinical study of 35 patients with dysarthria-clumsy hand syndrome. J Neurol Neurosurg Psychiatry 2004;75:231–234.
- Barer DH. The natural history and functional consequences of dysphagia after hemispheric stroke. J Neurol Neurosurg Psychiatry 1989;52:236–241.
- Barow E, Pinnschmidt H, Boutitie F, Königsberg A, Ebinger M, Endres M, Fiebach JB, Fiehler J, Thijs V, Lemmens R, Muir KW, Nighoghossian N, Pedraza S, Simonsen CZ, Gerloff C, Thomalla G, Cheng B; WAKE-UP investigators. Symptoms and probabilistic anatomical mapping of lacunar infarcts. Neurol Res Pract 2020;2:21.
- Bogousslavsky J, Regli F. Unilateral watershed cerebral infarcts. Neurology 1986;36:373–377.
- Bouvier SE, Engel SA. Behavioral deficits and cortical damage loci in cerebral achromatopsia. Cereb Cortex 2006;16:183–191.
- Cals N, Devuyst G, Afsar N, Karapanayiotides T, Bogousslavsky J. Pure superficial posterior cerebral artery territory infarction in The Lausanne Stroke Registry. J Neurol 2002;249:855–861.
- Caplan LR, Schmahmann JD, Kase CS, Feldmann E, Baquis G, Greenberg JP, Gorelick PB, Helgason C, Hier DB. Caudate infarcts. Arch Neurol 1990;47:133–143.
- Carmona S, Martínez C, Zalazar G, Moro M, Batuecas-Caletrio A, Luis L, Gordon C. The diagnostic accuracy of truncal ataxia and HINTS as cardinal signs for acute vestibular syndrome. Front Neurol 2016;7:125. (按行走、站立及直坐时失衡程度分级躯干共济失调。)
- Chamorro A, Sacco RL, Mohr JP, Foulkes MA, Kase CS, Tatemichi TK, Wolf PA, Price TR, Hier DB. Clinical-computed tomographic correlations of lacunar infarction in the Stroke Data Bank. Stroke 1991;22:175–181.
- Cnyrim CD, Rettinger N, Mansmann U, Brandt T, Strupp M. Central compensation of deviated subjective visual vertical in Wallenberg's syndrome. J Neurol Neurosurg Psychiatry 2007;78:527–528. (向病灶同侧的躯体侧倾。)
- Daniels SK, Foundas AL. The role of the insular cortex in dysphagia. Dysphagia 1997;12:146–156.
- Donnan GA, O'Malley HM, Quang L, Hurley S, Bladin PF. The capsular warning syndrome: pathogenesis and clinical features. Neurology 1993;43:957–962.
- Feinberg TE, Schindler RJ, Flanagan NG, Haber LD. Two alien hand syndromes. Neurology 1992;42:19–24.
- Fisher CM. Ataxic hemiparesis. A pathologic study. Arch Neurol 1978;35:126–128.
- Garcia-Larrea L, Perchet C, Creac'h C, Convers P, Peyron R, Laurent B, Mauguière F, Magnin M. Operculo-insular pain (parasylvian pain): a distinct central pain syndrome. Brain 2010;133:2528–2539. (270 人中 5 人；仅文字说明。)
- Gordon C, Hewer RL, Wade DT. Dysphagia in acute stroke. Br Med J (Clin Res Ed) 1987;295:411–414.
- Gorman MJ, Dafer R, Levine SR. Ataxic hemiparesis: critical appraisal of a lacunar syndrome. Stroke 1998;29:2549–2555.
- Hamdy S, Aziz Q, Rothwell JC, Singh KD, Barlow J, Hughes DG, Tallis RC, Thompson DG. The cortical topography of human swallowing musculature in health and disease. Nat Med 1996;2:1217–1224.
- Hamdy S, Aziz Q, Rothwell JC, Crone R, Hughes D, Tallis RC, Thompson DG. Explaining oropharyngeal dysphagia after unilateral hemispheric stroke. Lancet 1997;350:686–692.
- Heilman KM, Rothi L, McFarling D, Rottmann AL. Transcortical sensory aphasia with relatively spared spontaneous speech and naming. Arch Neurol 1981;38:236–239.
- Heutink J, Indorf DL, Cordes C. The neuropsychological rehabilitation of visual agnosia and Balint's syndrome. Neuropsychol Rehabil 2019;29:1489–1508. (高级视觉系统障碍以视力为前提：失明患者列为无法检查，不列 Balint 综合征。)
- Hillis AE, Wityk RJ, Barker PB, Beauchamp NJ, Gailloud P, Murphy K, Cooper O, Metter EJ. Subcortical aphasia and neglect in acute stroke: the role of cortical hypoperfusion. Brain 2002;125:1094–1104.
- Hiraga A, Uzawa A, Kamitsukasa I. Diffusion weighted imaging in ataxic hemiparesis. J Neurol Neurosurg Psychiatry 2007;78:1260–1262.
- Hoche F, Guell X, Vangel MG, Sherman JC, Schmahmann JD. The cerebellar cognitive affective/Schmahmann syndrome scale. Brain 2018;141:248–270.
- Hong JM, Kim TJ, Shin DH, Lee JS, Joo IS. Cardiovascular autonomic function in lateral medullary infarction. Neurol Sci 2013;34:1963–1969.
- Hupperts RM, Lodder J, Heuts-van Raak EP, Kessels F. Infarcts in the anterior choroidal artery territory. Anatomical distribution, clinical syndromes, presumed pathogenesis and early outcome. Brain 1994;117:825–834.
- Husain M, Kennard C. Visual neglect associated with frontal lobe infarction. J Neurol 1996;243:652–657.
- Kanbayashi T, Sonoo M. The course of facial corticobulbar tract fibers in the dorsolateral medulla oblongata. BMC Neurol 2021;21:214. (33 人中 8 人梗死同侧中枢性面瘫，均轻度且出院前消失；仅部分纤维束下行至延髓。)
- Karnath HO, Ferber S, Himmelbach M. Spatial awareness is a function of the temporal not the posterior parietal lobe. Nature 2001;411:950–953.
- Karnath HO, Himmelbach M, Rorden C. The subcortical anatomy of human spatial neglect: putamen, caudate nucleus and pulvinar. Brain 2002;125:350–360.
- Kertesz A, McCabe P. Recovery patterns and prognosis in aphasia. Brain 1977;100:1–18.
- Kertesz A, Nicholson I, Cancelliere A, Kassa K, Black SE. Motor impersistence: a right-hemisphere syndrome. Neurology 1985;35:662–666.
- Kertesz A, Poole E. The aphasia quotient: the taxonomic approach to measurement of aphasic disability. Can J Neurol Sci 2004;31:175–184. (1974 年论文重印；每名患者一种失语类型。)
- Kim HA, Lee BC, Hong JH, Yeo CK, Yi HA, Lee H. Long-term prognosis for hearing recovery in stroke patients presenting vertigo and acute hearing loss. J Neurol Sci 2014;339:176–182.
- Kim JS, Han YS. Medial medullary infarction: clinical, imaging, and outcome study in 86 consecutive patients. Stroke 2009;40:3221–3225.
- Kim JS, Lee JH, Im JH, Lee MC. Syndromes of pontine base infarction. A clinical-radiological correlation study. Stroke 1995;26:950–955.
- Kim JS, Lee JH, Lee MC. Patterns of sensory dysfunction in lateral medullary infarction. Clinical-MRI correlation. Neurology 1997;49:1557–1563.
- Kim JS. Pure lateral medullary infarction: clinical-radiological correlation of 130 acute, consecutive patients. Brain 2003;126:1864–1872.
- Kobayashi S, Suzuki K, Takekawa H, Watanabe Y, Okamura M, Suzuki A, Tsukui D, Hirata K. Bilateral medial medulla infarction mimicking Guillain-Barré syndrome and its variants. Brain Nerve 2020;72:901–905. (日语；病例报告。)
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
- Nasreddine ZS, Saver JL. Pain after thalamic stroke: right diencephalic predominance and clinical features in 180 patients. Neurology 1997;48:1196–1199. (合并已发表病例：右侧较多可能部分来自报告偏倚。)
- Nestmann S, Karnath HO, Rennig J. Hemifield-specific color perception deficits after unilateral V4α lesions. Cortex 2021;142:357–369.
- Norrving B, Cronqvist S. Lateral medullary infarction: prognosis in an unselected series. Neurology 1991;41:244–248.
- Ogawa K, Suzuki Y, Takahashi K, Akimoto T, Kamei S, Soma M. Clinical study of seven patients with infarction in territories of the anterior inferior cerebellar artery. J Stroke Cerebrovasc Dis 2017;26:574–581.
- Palomeras E, Fossas P, Cano AT, Sanz P, Floriach M. Anterior choroidal artery infarction: a clinical, etiologic and prognostic study. Acta Neurol Scand 2008;118:42–47.
- Pashek GV, Holland AL. Evolution of aphasia in the first year post-onset. Cortex 1988;24:411–423.
- Paul NL, Simoni M, Chandratheva A, Rothwell PM. Population-based study of capsular warning syndrome and prognosis after early recurrent TIA. Neurology 2012;79:1356–1362.
- Paulson HL, Galetta SL, Grossman M, Alavi A. Hemiachromatopsia of unilateral occipitotemporal infarcts. Am J Ophthalmol 1994;118:518–523.
- Pedersen PM, Vinter K, Olsen TS. Aphasia after stroke: type, severity and prognosis. The Copenhagen aphasia study. Cerebrovasc Dis 2004;17:35–43. (第一年失语类型均转为较轻形式，流利型从不转为非流利型，例如全面性转为 Wernicke 型；全面性失语从 32 % 降至 7 %。轻度全面性列为 Broca 型，若理解较流利度损害更大则列 Wernicke 型，此后所列类型仅减少特征。)
- Pierrot-Deseilligny C, Gautier JC, Loron P. Acquired ocular motor apraxia due to bilateral frontoparietal infarcts. Ann Neurol 1988;23:199–202. (一例：双侧扫视及追踪障碍。)
- Pierrot-Deseilligny C, Rivaud S, Gaymard B, Müri R, Vermersch AI. Cortical control of saccades. Ann Neurol 1995;37:557–567. (额眼区解除注视并触发自主扫视：双侧丧失时不将眼推向任一侧，但双侧自主凝视受损。)
- Pongmoragot J, Parthasarathy S, Selchen D, Saposnik G. Bilateral medial medullary infarction: a systematic review. J Stroke Cerebrovasc Dis 2013;22:775–780.
- Prosser J, MacGregor L, Lees KR, Diener HC, Hacke W, Davis S; VISTA Investigators. Predictors of early cardiac morbidity and mortality after ischemic stroke. Stroke 2007;38:2295–2302.
- Pryse-Phillips W. Infarction of the medulla and cervical cord after fitness exercises. Stroke 1989;20:292–294. (椎动脉夹层后的延髓及上段颈髓；病例。)
- Ringman JM, Saver JL, Woolson RF, Clarke WR, Adams HP. Frequency, risk factors, anatomy, and course of unilateral neglect in an acute stroke cohort. Neurology 2004;63:468–474.
- Sage JI, Van Uitert RL. Man-in-the-barrel syndrome. Neurology 1986;36:1102–1103.
- Saito T, Itabashi R, Kawabata Y, Yazawa Y. Clinical characteristics of patients with lateral medullary infarction who had fatal respiratory failure. J Neurol Sci 2022;434:120167.
- Saposnik G, Noel de Tilly L, Caplan LR. Pontine warning syndrome. Arch Neurol 2008;65:1375–1377.
- Sato S, Toyoda K, Uehara T, Toratani N, Yokota C, Moriwaki H, Naritomi H, Minematsu K. Baseline NIH Stroke Scale Score predicting outcome in anterior and posterior circulation strokes. Neurology 2008;70:2371–2377. (3 个月良好结局的截止为后循环 NIHSS 至多 5、前循环至多 8。)
- Scheitz JF, Nolte CH, Doehner W, Hachinski V, Endres M. Stroke-heart syndrome: clinical presentation and underlying mechanisms. Lancet Neurol 2018;17:1109–1120.
- Schmahmann JD, Sherman JC. The cerebellar cognitive affective syndrome. Brain 1998;121:561–579.
- Sheehy NP, Boyle GE, Meaney JF. Normal anterior spinal arteries within the cervical region: high-spatial-resolution contrast-enhanced three-dimensional MR angiography. Radiology 2005;236:637–641. (50 人中 24 人可见颈段前脊髓动脉根髓供血支：起始处阻塞威胁模型所包含的上段颈髓。)
- Sommerfeld DK, Eek EU, Svensson AK, Holmqvist LW, von Arbin MH. Spasticity after stroke: its occurrence and association with motor impairments and activity limitations. Stroke 2004;35:134–139.
- Sposato LA, Cipriano LE, Saposnik G, Ruíz Vargas E, Riccio PM, Hachinski V. Diagnosis of atrial fibrillation after stroke and transient ischaemic attack: a systematic review and meta-analysis. Lancet Neurol 2015;14:377–387.
- Suntrup S, Kemmling A, Warnecke T, Hamacher C, Oelenberg S, Niederstadt T, Heindel W, Wiendl H, Dziewas R. The impact of lesion location on dysphagia incidence, pattern and complications in acute stroke. Part 1: dysphagia incidence, severity and aspiration. Eur J Neurol 2015;22:832–838.
- Takano K, Takasugi K. A case of bilateral lower pons-medial medullary infarction presenting quadriparesis. No To Shinkei 2003;55:879–883. (日语；病例报告。)
- Tatemichi TK, Desmond DW, Prohovnik I, Cross DT, Gropen TI, Mohr JP, Stern Y. Confusion and memory loss from capsular genu infarction: a thalamocortical disconnection syndrome? Neurology 1992;42:1966–1979.
- Uemura M, Naritomi H, Uno H, Umesaki A, Miyashita K, Toyoda K, Minematsu K, Nagatsuka K. Ipsilateral hemiparesis in lateral medullary infarction: clinical investigation of the lesion location on magnetic resonance imaging. J Neurol Sci 2016;365:40–45. (Opalski 变异型。)
- Urban PP, Wicht S, Vucorevic G, Fitzek S, Marx J, Thömke F, Mika-Grüttner A, Fitzek C, Stoeter P, Hopf HC. The course of corticofacial projections in the human brainstem. Brain 2001;124:1866–1876. (部分人皮质面神经纤维向下绕至上延髓，交叉后沿背外侧上行至面神经核；延髓外侧梗死可造成同侧面部无力。)
- Urban PP, Wolf T, Uebele M, Marx JJ, Vogt T, Stoeter P, Bauermann T, Weibrich C, Vucurevic GD, Schneider A, Wissel J. Occurence and clinical predictors of spasticity after ischemic stroke. Stroke 2010;41:2016–2020.
- Vynckier J, Maamari B, Grunder L, Goeldlin MB, Meinel TR, Kaesmacher J, Hakim A, Arnold M, Gralla J, Seiffge DJ, Fischer U. Early neurologic deterioration in lacunar stroke: clinical and imaging predictors and association with long-term outcome. Neurology 2021;97:e1437–e1446.
- Watson RT, Heilman KM. Callosal apraxia. Brain 1983;106:391–403.
- Wissel J, Schelosky LD, Scott J, Christe W, Faiss JH, Mueller J. Early development of spasticity following stroke: a prospective, observational trial. J Neurol 2010;257:1067–1072.
- Zhang X, Kedar S, Lynn MJ, Newman NJ, Biousse V. Homonymous hemianopias: clinical-anatomic correlations in 904 cases. Neurology 2006;66:906–910.

<a id="血流組織與臨床模型--flow-tissue-and-clinical-model"></a>
### 血流、组织与临床模型

- Alastruey J, Parker KH, Peiró J, Byrd SM, Sherwin SJ. Modelling the circle of Willis to assess the effects of anatomical variations and occlusions on cerebral flows. J Biomech 2007;40:1794–1805. (血管尺寸；另参考 openBF 实现，Apache-2.0。)
- Astrup J, Siesjö BK, Symon L. Thresholds in cerebral ischemia – the ischemic penumbra. Stroke 1981;12:723–725. (半暗带概念。)
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
- Keane JR. Blindness following tentorial herniation. Ann Neurol 1980;8:186–190. (七名患者因单侧或双侧占位、天幕脑疝后双侧永久失明，其中两名 CT 可见枕叶梗死；所以与对侧一起向下脑疝的半球保留自身肿胀造成的大脑后动脉梗死。)
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
- Brott T et al. Measurements of acute cerebral infarction: a clinical examination scale. Stroke 1989;20:864–870. (原始 15 项量表。)
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
- Plum F, Posner JB. The Diagnosis of Stupor and Coma (脑干病灶的呼吸模式).
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
- Menon BK et al. J Neurointerv Surg 2019;11:1065–1069 (M2 阻塞的取栓，HERMES).
- Nogueira RG et al. Thrombectomy 6 to 24 hours after stroke with a mismatch between deficit and infarct (DAWN). N Engl J Med 2018;378:11–21.
- Yang P et al. Endovascular thrombectomy with or without intravenous alteplase in acute stroke (DIRECT-MT). N Engl J Med 2020;382:1981–1993.
- Fischer U et al. Lancet 2022;400:104–115 (SWIFT DIRECT：单独取栓与联合静脉阿替普酶比较).
- LeCouffe NE et al. A randomized trial of intravenous alteplase before endovascular treatment for stroke (MR CLEAN-NO IV). N Engl J Med 2021;385:1833–1844.
- Knapen RRMM et al. Cardiovasc Intervent Radiol 2025;48:1869–1877 (VERITAS 基底动脉阻塞试验的合并分析).
- Strbian D et al. Eur Stroke J 2024;9:835–884 (ESO/ESMINT 基底动脉阻塞指南).
- Yi T et al. Predictors of futile recanalization in basilar artery occlusion patients undergoing endovascular treatment: a post hoc analysis of the ATTENTION trial. Front Neurol 2023;14:1308036.
- Bhatia R et al. Low rates of acute recanalization with intravenous recombinant tissue plasminogen activator in ischemic stroke: real-world experience and a call for action. Stroke 2010;41:2254–2258.
- Menon BK et al. JAMA 2018;320:1017–1026 (INTERRSeCT：按阻塞部位分析静脉溶栓后的再通).
- Seners P et al. Stroke 2016;47:2409–2412 (按阻塞部位分析静脉溶栓后的早期再通).
- Riedel CH et al. The importance of size: successful recanalization by intravenous thrombolysis in acute anterior stroke depends on thrombus length. Stroke 2011;42:1775–1777.
- The NINDS rt-PA Stroke Study Group. Tissue plasminogen activator for acute ischemic stroke. N Engl J Med 1995;333:1581–1587.
- Hacke W et al. Thrombolysis with alteplase 3 to 4.5 hours after acute ischemic stroke (ECASS III). N Engl J Med 2008;359:1317–1329.
- Wahlgren N et al. Thrombolysis with alteplase for acute ischaemic stroke in the Safe Implementation of Thrombolysis in Stroke-Monitoring Study (SITS-MOST). Lancet 2007;369:275–282.
- Alexandrov AV, Grotta JC. Arterial reocclusion in stroke patients treated with intravenous tissue plasminogen activator. Neurology 2002;59:862–867.
- Rha JH, Saver JL. The impact of recanalization on ischemic stroke outcome: a meta-analysis. Stroke 2007;38:967–973. (53 项研究，2066 人：自发再通 24.1 %，静脉溶栓后 46.2 %；再通与 3 个月良好结局相关，比值比 4.43；所以自行开放动脉也描述为再通。)
- Liebeskind DS, Bracard S, Guillemin F, et al. eTICI reperfusion: defining success in endovascular stroke therapy. J Neurointerv Surg 2019;11:433–438. (扩展 TICI 按目标阻塞下游区域的再灌注比例分级：3 = 100 %，2c = 90–99 %，2b67 = 67–89 %，2b50 = 50–66 %；碎片阻塞分支会降低血管造影显示级别。)
- Mosimann PJ et al. Stroke 2018;49:2643–2651 (取栓后的再闭塞).
- Marto JP et al. Stroke 2019;50:2960–2963 (取栓后的早期再闭塞).
- Beyeler M et al. J Neurointerv Surg 2022;14:326–332 (取栓过程中栓子进入新的供血区).
- Singh N et al. Stroke 2023;54:1477–1483 (取栓后的新供血区梗死，ESCAPE-NA1).
- Wong GJ et al. Stroke 2021;52:2241–2249 (取栓前后 MRI 上的栓塞证据).
- Ng FC et al. Neurology 2022;98:e790–e801 (成功再灌注后的无复流).
- ter Schiphorst A et al. J Cereb Blood Flow Metab 2021;41:253–266 (再通后的组织无复流).
- Wheeler HM, Mlynash M, Inoue M, et al. The growth rate of early DWI lesions is highly variable and associated with penumbral salvage and clinical outcomes following endovascular reperfusion. Int J Stroke 2015;10:723–729. (DEFUSE 2：早期梗死增长中位数 3.1 mL/h；梗死增长校准目标。)
- Ospel JM, McDonough R, Demchuk AM, et al. Predictors and clinical impact of infarct progression rate in the ESCAPE-NA1 trial. J Neurointerv Surg 2022;14:886–891. (梗死进展中位数 4.74 mL/h。)
- Sarraj A, Hassan AE, Grotta J, et al. Early infarct growth rate correlation with endovascular thrombectomy clinical outcomes: analysis from the SELECT study. Stroke 2021;52:57–69. (快速进展：至少 10 mL/h。)
- Seners P, Yuen N, Olivot JM, et al. Factors associated with fast early infarct growth in patients with acute ischemic stroke with a large vessel occlusion. Neurology 2023;101:e2126–e2137. (多数快速进展者侧支差。)
- Desai SM, Rocha M, Jovin TG, Jadhav AP. High variability in neuronal loss. Stroke 2019;50:34–37. (ICA 和 M1 阻塞每分钟神经元丧失：最快超过每分钟 27 百万，按 Saver 2006 的每 mL 22 百万 神经元估计，约 74 mL/h。)
- Thomalla G, Hartmann F, Juettler E, et al. Prediction of malignant middle cerebral artery infarction by magnetic resonance imaging within 6 hours of symptom onset: a prospective multicenter observational study. Ann Neurol 2010;68:435–445. (6 h 内 DWI 病灶超过 82 mL。)
- d'Esterre CD, Boesen ME, Ahn SH, et al. Time-dependent computed tomographic perfusion thresholds for patients with acute ischemic stroke. Stroke 2015;46:3390–3397. (血流越早恢复，组织发生梗死的血流阈值越低。)
- Boned S, Padroni M, Rubiera M, et al. Admission CT perfusion may overestimate initial infarct core: the ghost infarct core concept. J Neurointerv Surg 2017;9:66–69.
- Berkhemer OA, Jansen IG, Beumer D, et al. Collateral status on baseline computed tomographic angiography and intra-arterial treatment effect in patients with proximal anterior circulation stroke. Stroke 2016;47:768–776. (MR CLEAN：取栓获益随侧支分级提高。)
- Memezawa H, Smith ML, Siesjö BK. Penumbral tissues salvaged by reperfusion following middle cerebral artery occlusion in rats. Stroke 1992;23:552–559. (终末动脉供血的尾状壳核在几分钟内损伤，皮质较晚。)
- Garcia JH, Liu KF, Ho KL. Neuronal necrosis after middle cerebral artery occlusion in Wistar rats progresses at different time intervals in the caudoputamen and the cortex. Stroke 1995;26:636–642.
- Desai SM, Catapano JS, Tonetti DA, et al. Ultra-early functional improvement after stroke thrombectomy: predictors and implications. Stroke Vasc Interv Neurol 2022;2:e000138. (少数患者在再通后 30 min 内改善；模型中获救功能缓慢恢复。)
- Kniep H, Meyer L, Bechstein M, et al. How much of the thrombectomy related improvement in functional outcome is already apparent at 24 hours and at hospital discharge? Stroke 2022;53:2828–2837. (24 h 达约一半获益，出院时约四分之三。)
- Fransen PS, Berkhemer OA, Lingsma HF, et al. Time to reperfusion and treatment effect for acute ischemic stroke: a randomized clinical trial. JAMA Neurol 2016;73:190–196.
- Klapproth S, Meyer L, Kniep H, et al. Delayed neurological recovery in ischemic stroke patients undergoing endovascular treatment is associated with baseline hyperglycemia: a treatable cause of the stunned brain phenomenon? J Neurol 2025;272:313.
- Guadagno JV, Jones PS, Aigbirhio FI, et al. Selective neuronal loss in rescued penumbra relates to initial hypoperfusion. Brain 2008;131:2666–2678.
- Shelton FN, Reding MJ. Effect of lesion location on upper limb motor recovery after stroke. Stroke 2001;32:107–112. (上肢恢复：皮质优于内囊后肢。)
- Feng W, Wang J, Chhatbar PY, et al. Corticospinal tract lesion load: an imaging biomarker for stroke motor outcomes. Ann Neurol 2015;78:860–870.
- Nijland RH, van Wegen EE, Harmeling-van der Wel BC, Kwakkel G. Presence of finger extension and shoulder abduction within 72 hours after stroke predicts functional recovery: early prediction of functional outcome after stroke: the EPOS cohort study. Stroke 2010;41:745–750.
- Stinear CM, Byblow WD, Ackerley SJ, Smith MC, Borges VM, Barber PA. PREP2: a biomarker-based algorithm for predicting upper limb function after stroke. Ann Clin Transl Neurol 2017;4:811–820.
- Byblow WD, Stinear CM, Barber PA, Petoe MA, Ackerley SJ. Proportional recovery after stroke depends on corticomotor integrity. Ann Neurol 2015;78:848–859.
- Kaesmacher J, Kaesmacher M, Berndt M, et al. Early thrombectomy protects the internal capsule in patients with proximal middle cerebral artery occlusion. Stroke 2021;52:1570–1579. (全部 92 人有纹状体缺血，45 人累及内囊皮质脊髓部分；豆纹动脉再灌注每延迟一小时，比值比增加 3.47 倍：深部白质病程。)
- Kleine JF, Kaesmacher M, Wiestler B, Kaesmacher J. Tissue-selective salvage of the white matter by successful endovascular stroke therapy. Stroke 2017;48:2776–2783. (白质梗死通常比灰质晚开始。)
- Kleine JF, Beller E, Zimmer C, Kaesmacher J. Lenticulostriate infarctions after successful mechanical thrombectomy in middle cerebral artery occlusion. J Neurointerv Surg 2017;9:234–239. (豆纹动脉阻塞后，取栓很少避免纹状体梗死。)
- Lazar RM, Minzer B, Antoniello D, Festa JR, Krakauer JW, Marshall RS. Improvement in aphasia scores after stroke is well predicted by initial severity. Stroke 2010;41:1485–1488. (21 人在 90 天达到 Western Aphasia Battery 可能改善量的约 0.73：比例恢复。)
- Wilson SM, Entrup JL, Schneck SM, et al. Recovery from aphasia in the first year after stroke. Brain 2023;146:1021–1039. (218 名失语患者：仅 MCA 全分布广泛损伤或广泛颞顶损伤常有持续中重度缺损；模型语言恢复随左 MCA 皮质损失比例下降。)
- Heiss WD, Thiel A. A proposed regional hierarchy in recovery of post-stroke aphasia. Brain Lang 2006;98:118–123. (左半球网络未受损区域比右半球同源区提供更好恢复。)
- Winters C, van Wegen EE, Daffertshofer A, Kwakkel G. Generalizability of the maximum proportional recovery rule to visuospatial neglect early poststroke. Neurorehabil Neural Repair 2017;31:334–342. (90 人中 80 人忽视按比例恢复；未恢复的 10 人起病忽视最重。)
- Karnath HO, Rennig J, Johannsen L, Rorden C. The anatomy underlying acute versus chronic spatial neglect: a longitudinal study. Brain 2011;134:903–912. (约三分之一急性忽视患者出现慢性忽视，由颞上／中回、基底核及下方纤维束损伤预测。)
- Steiner I, Melamed E. Conjugate eye deviation after acute hemispheric stroke: delayed recovery after previous contralateral frontal lobe damage. Ann Neurol 1984;16:509–511. (42 人中 38 人在 5 天内消失；只有先前对侧额叶损伤后持续数周，所以凝视偏斜恢复不按梗死大小缩放。)
- Woo D, Broderick JP, Kothari RU, et al. Does the National Institutes of Health Stroke Scale favor left hemisphere strokes? Stroke 1999;30:2355–2359. (相同 NIHSS 下右半球梗死约为左侧两倍。)
- Boers AMM, Jansen IGH, Beenen LFM, et al. Association of follow-up infarct volume with functional outcome in acute ischemic stroke: a pooled analysis of seven randomized trials. J Neurointerv Surg 2018;10:1137–1142. (1665 人：最终梗死每增加 10 mL，较好改良 Rankin 分数的比值比为 0.88；再通保留至少 50 mL 评为获益。)
- Hommel M, Besson G, Pollak P, Kahane P, Le Bas JF, Perret J. Hemiplegia in posterior cerebral artery occlusion. Neurology 1990;40:1496–1499. (四名中脑外侧梗死偏瘫患者，阻塞位于后交通动脉远端。)
- Strbian D, Sairanen T, Silvennoinen H, Salonen O, Kaste M, Lindsberg PJ. Thrombolysis of basilar artery occlusion: impact of baseline ischemia and time. Ann Neurol 2013;73:688–694. (无广泛基线缺血时，再通后半数良好，至 48 h 内不依赖治疗时间；模型按晚再通留下的脑干梗死分级，不按时间上限。)
- Adams JH, Graham DI, Jennett B. The neuropathology of the vegetative state after an acute brain insult. Brain 2000;123:1327–1338. (49 名直到死亡仍为植物状态者全部有深重皮质下白质或丘脑中继核损伤，使完整皮质不能工作；所以双半球破坏存活者列意识障碍。)
- Multi-Society Task Force on PVS. Medical aspects of the persistent vegetative state (1). N Engl J Med 1994;330:1499–1508. (非创伤性持续植物状态 3 个月后恢复极罕见；寿命多为 2–5 年。)
- De Renzi E, Motti F, Nichelli P. Imitating gestures: a quantitative approach to ideomotor apraxia. Arch Neurol 1980;37:6–10. (以模仿检查失用，无须语言；左半球患者几乎均有失语但相关弱，因此理解不足的失语旁仍列失用。)
- Powers WJ, Rabinstein AA, Ackerson T, et al. Guidelines for the early management of patients with acute ischemic stroke: 2019 update to the 2018 guidelines for the early management of acute ischemic stroke: a guideline for healthcare professionals from the American Heart Association/American Stroke Association. Stroke 2019;50:e344–e418. (持续缺损按卒中处理：立即脑影像，致残缺损可静脉溶栓、轻且不致残者不可；阿司匹林在 24–48 h，静脉溶栓后通常至少 24 h；发作缺损持续时列治疗窗口，消失后才给 TIA 抗血小板建议。)
- Wong KS, Gao S, Chan YL, et al. Mechanisms of acute cerebral infarctions in patients with middle cerebral artery stenosis: a diffusion-weighted imaging and microemboli monitoring study. Ann Neurol 2002;52:74–81. (30 名 MCA 狭窄患者中，多发梗死最常见链状深部边界区模式，为 15 人中的 11 人；所以重 M1 狭窄如颈动脉狭窄或低血压，是分水岭标签背景。)
- Naeser MA, Helm-Estabrooks N, Haas G, Auerbach S, Srinivasan M. Relationship between lesion extent in 'Wernicke's area' on computed tomographic scan and predicting recovery of comprehension in Wernicke's aphasia. Arch Neurol 1987;44:73–82. (理解取决于 Wernicke 区损伤量而非整体颞顶病灶：不超过一半时 6 个月良好，超过一半时 1 年仍差，颞中回累及更差；所以 Wernicke 失语恢复随该区梗死比例下降。)
- Naeser MA, Gaddie A, Palumbo CL, Stiassny-Eder D. Late recovery of auditory comprehension in global aphasia. Improved recovery observed with subcortical temporal isthmus lesion vs Wernicke's cortical area lesion. Arch Neurol 1990;47:425–432. (9 名 Wernicke 区损伤超过一半的全面失语者中 8 人在 1–2 年仍有中重度理解缺损。)
- Kertesz A, Lau WK, Polk M. The structural determinants of recovery in Wernicke's aphasia. Brain Lang 1993;44:153–164. (22 人：持续 Wernicke 失语通常也累及缘上回及角回；恢复良好组颞上／中回累及较少。)
- Haussen DC, Oliveira RA, Patel V, Nogueira RG. Functional independence following endovascular treatment for basilar artery occlusion despite extensive bilateral pontine infarcts on diffusion-weighted imaging: refuting a self-fulfilling prophecy. Interv Neurol 2016;5:179–184. (广泛双侧脑桥 DWI 病灶并非再通后结局差的确定信号；所以双侧低于阈值的小梗死如单侧一样代偿，瓶颈仅在接近经典闭锁综合征时完全起效。)
- Serdaru M, Schaison M, Lhermitte F. Pupil sparing in oculomotor palsy and Claude Bernard Horner syndrome. Ann Neurol 1983;14:697–698. (同侧 Horner 综合征可使动眼神经麻痹看似瞳孔保留；所以动眼神经麻痹的眼不再列自身 Horner 综合征。)
- Bassetti C, Staikov IN. Hemiplegia vegetativa alterna (ipsilateral Horner's syndrome and contralateral hemihyperhidrosis) following proximal posterior cerebral artery occlusion. Stroke 1995;26:702–704. (PCA 阻塞通常有视野缺损、偏身感觉丧失和神经心理缺损；Horner 伴近端阻塞，梗死中脑前外侧及丘脑。)
- Searls DE, Pazdera L, Korbel E, Vysata O, Caplan LR. Symptoms and signs of posterior circulation ischemia in the New England Medical Center Posterior Circulation Registry. Arch Neurol 2012;69:346–351. (407 人：Horner 对应近端区域，视野缺损对应远端区域。)
- Robertson CE, Brown RD Jr, Wijdicks EF, Rabinstein AA. Recovery after spinal cord infarcts: long-term outcome in 115 patients. Neurology 2012;78:114–121. (68 % 在 1 h 内达到最大缺损；最低点 81 % 需轮椅、86 % 导尿；平均 3 年 23 % 死亡，出院坐轮椅者 41 % 可行走：脊髓叙述及病程。)
- Zalewski NL, Rabinstein AA, Krecke KN, Brown RD Jr, Wijdicks EFM, Weinshenker BG, Kaufmann TJ, Morris JM, Aksamit AJ, Bartleson JD, Lanzino G, Blessing MM, Flanagan EP. Characteristics of spontaneous spinal cord infarction and proposed diagnostic criteria. JAMA Neurol 2019;76:56–63. (133 人：77 % 在 12 h 内达最低点；首次 MRI 24 % 正常；猫头鹰眼征 65 %、铅笔征 40 %；29 人中 19 人扩散受限；邻近夹层或阻塞 20 %。)
- Masson C, Pruvo JP, Meder JF, Cordonnier C, Touzé E, De La Sayette V, Giroud M, Mas JL, Leys D; Study Group on Spinal Cord Infarction of the French Neurovascular Society. Spinal cord infarction: clinical and magnetic resonance imaging findings and short term outcome. J Neurol Neurosurg Psychiatry 2004;75:1431–1435. (28 人：2 个月结局随初始严重度；部分严重损害但起始本体感觉正常者良好。)
- Read SJ, Hirano T, Abbott DF, Markus R, Sachinidis JI, Tochon-Danguy HJ, Chan JG, Egan GF, Scott AM, Bladin CF, McKay WJ, Donnan GA. The fate of hypoxic tissue on 18F-fluoromisonidazole positron emission tomography after ischemic stroke. Ann Neurol 2000;48:228–235. (24 人起病后至 51 h 检查：缺氧仍存活组织的人数比例及量随时间减少，平均 45 % 存活；所以组织最多两天列为有风险半暗带。)
- Markus R, Reutens DC, Kazui S, Read S, Wright P, Pearce DC, Tochon-Danguy HJ, Sachinidis JI, Donnan GA. Hypoxic tissue in ischaemic stroke: persistence and clinical consequences of spontaneous survival. Brain 2004;127:1427–1436. (起病 12 h 内 60 % 检查、12–48 h 内 16 % 检查中，缺氧组织超过缺血体积五分之一。)

<a id="臨床細節審查b-clinical-detail-audit-b-treatment-haemodynamics-brainstem-and-thalamus-acute-course"></a>
### 临床细节审查（B）：治疗、血流动力学、脑干与丘脑、急性病程

- Alamowitch S, Turc G, Palaiodimou L, et al. European Stroke Organisation (ESO) expedited recommendation on tenecteplase for acute ischaemic stroke. Eur Stroke J 2023;8:8–54. (Tenecteplase 0.25 mg/kg 可替代 alteplase，大血管阻塞优选；不用于仅平扫 CT 筛选的醒后卒中。)
- Alemdar M. Hyperthermia associated with bilateral mesencephalothalamic infarction. J Stroke Cerebrovasc Dis 2012;21:907.e13–907.e15. (缺血，双侧旁正中中脑–丘脑；无感染 39.3 °C。)
- Alemseged F, Van der Hoeven E, Di Giuliano F, et al. Response to late-window endovascular revascularization is associated with collateral status in basilar artery occlusion. Stroke 2019;50:1415–1422. (BATMAN 或 PC-CS 不利时，6 h 内而非更晚再血管化与良好结局相关。)
- Amarenco P, Hauw JJ. Cerebellar infarction in the territory of the superior cerebellar artery: a clinicopathologic study of 33 cases. Neurology 1990;40:1383–1390. (尸检系列：9 名有小脑和前庭体征者中 6 人因小脑肿胀延迟昏迷；PICA 梗死常伴 SCA 梗死。)
- Arauz A, Patiño-Rodríguez HM, Vargas-González JC, Arguelles-Morales N, Silos H, Ruiz-Franco A, Ochoa MA. Clinical spectrum of artery of Percheron infarct: clinical-radiological correlations. J Stroke Cerebrovasc Dis 2014;23:1083–1088. (连续 15 人：平均 55 个月，累及中脑者 8 人中 2 人（25%）mRS ≤ 2，未累及者 6 人中 4 人（67%）。)
- Ayling OGS, Alotaibi NM, Wang JZ, Fatehi M, Ibrahim GM, Benavente O, Field TS, Gooderham PA, Macdonald RL. Suboccipital decompressive craniectomy for cerebellar infarction: a systematic review and meta-analysis. World Neurosurg 2018;110:450–459.e5. (11 项研究，283 人：枕下减压后合并死亡率 20%。)
- Baki E, Baumgart L, Kehl V, et al. Predictors of malignant swelling in space-occupying cerebellar infarction. Stroke Vasc Neurol 2025;10:323–329. (93 人中 33 人，35.5%；超过 38 cm³ 超过半数；脑干梗死仅单变量相关；33 人中 13 人超过 3 天。)
- Bang OY, Chung JW, Kim SK, et al. Therapeutic-induced hypertension in patients with noncardioembolic acute stroke. Neurology 2019;93:e1955–e1963. (随机，n = 153，Class III；不符合再灌注治疗条件。)
- Barow E, Boutitie F, Cheng B, et al. Functional outcome of intravenous thrombolysis in patients with lacunar infarcts in the WAKE-UP trial. JAMA Neurol 2019;76:641–649. (腔隙卒中：alteplase 效应与其他卒中无差异。)
- Bassetti C, Bogousslavsky J, Barth A, Regli F. Isolated infarcts of the pons. Neurology 1996;46:165–175. (36 人中 21 人腹侧；仅 4 人交叉缺损，无人符合经典脑桥综合征。)
- Beghi E, D'Alessandro R, Beretta S, et al. Incidence and predictors of acute symptomatic seizures after stroke. Neurology 2011;77:1785–1793. (7 天内癫痫发作：梗死 4.2%，32 名出血性转化者 12.5%，OR 2.7，0.8–9.6；皮质累及 OR 3.1。)
- Bendszus M, Fiehler J, Subtil F, et al. Endovascular thrombectomy for acute ischaemic stroke with established large infarct: multicentre, open-label, randomised trial (TENSION). Lancet 2023;402:1753–1763.
- Benke T. Peduncular hallucinosis: a syndrome of impaired reality monitoring. J Neurol 2006;253:1561–1571. (5 人；其余单病例报告；幻觉持续数月反复。)
- Bladin CF, Alexandrov AV, Bellavance A, et al. Seizures after stroke: a prospective multicenter study. Arch Neurol 2000;57:1617–1622. (缺血卒中后平均 9 个月 8.6%；全部 1897 人中 2.5% 癫痫；晚期首次发作对癫痫 HR 12.37。)
- Brandt T, Dieterich M. Skew deviation with ocular torsion: a vestibular brainstem sign of topographic diagnostic value. Ann Neurol 1993;33:528–534. (尾侧脑桥延髓病灶同侧眼较低，头侧脑桥中脑病灶对侧眼较低。)
- Campbell BCV, Mitchell PJ, Churilov L, et al. Tenecteplase versus alteplase before thrombectomy for ischemic stroke (EXTEND-IA TNK). N Engl J Med 2018;378:1573–1582.
- Caplan LR. "Top of the basilar" syndrome. Neurology 1980;30:72–79. (头侧脑干梗死伴嗜睡、生动幻觉及梦样行为。)
- Carrera E, Bogousslavsky J. The thalamus and behavior: effects of anatomically distinct strokes. Neurology 2006;66:1817–1823. (前部：持续重复、淡漠、遗忘；旁正中：脱抑制、人格改变、自我激活丧失、遗忘，广泛时丘脑“痴呆”。)
- Castaigne P, Lhermitte F, Buge A, Escourolle R, Hauw JJ, Lyon-Caen O. Paramedian thalamic and midbrain infarct: clinical and neuropathological study. Ann Neurol 1981;10:127–148. (嗜睡、深昏迷或无动性缄默；异常运动始终延迟出现。)
- Chang YY, Tsai TC, Shih PY, Liu JS. Unilateral symptomatic palatal myoclonus: MRI evidence of contralateral inferior olivary lesion. Gaoxiong Yi Xue Ke Xue Za Zhi 1993;9:371–376. (病灶后 1 和 3 个月眼腭肌阵挛。)
- CLOTS (Clots in Legs Or sTockings after Stroke) Trials Collaboration. Effectiveness of intermittent pneumatic compression in reduction of risk of deep vein thrombosis in patients who have had a stroke (CLOTS 3): a multicentre randomised controlled trial. Lancet 2013;382:516–524. (不能自行走到厕所的无法活动患者在第 0 至 3 天入组；30 天内近端深静脉血栓，间歇气压压迫组 8.5%，未压迫组 12.1%。)
- Costalat V, Jovin TG, Albucher JF, et al. Trial of thrombectomy for stroke with a large infarct of unrestricted size (LASTE). N Engl J Med 2024;390:1677–1689.
- de Bastos Maximiano ML, Gonçalves OR, Falcão L, et al. Endovascular treatment in patients with cervical or intracranial isolated internal carotid artery occlusion: a systematic review and meta-analysis. Neuroradiol J 2026;39:557–566.
- Deuschl G, Bain P, Brin M. Consensus statement of the Movement Disorder Society on Tremor. Ad Hoc Scientific Committee. Mov Disord 1998;13 Suppl 3:2–23. (Holmes 震颤作为独立震颤综合征。)
- Deuschl G, Toro C, Hallett M. Symptomatic and essential palatal tremor. 2. Differences of palatal movements. Mov Disord 1994;9:676–678. (耳内咔嗒声属于特发性而非症状性腭震颤。)
- Fiorelli M, Bastianello S, von Kummer R, et al. Hemorrhagic transformation within 36 hours of a cerebral infarct: relationships with early clinical deterioration and 3-month outcome in the European Cooperative Acute Stroke Study I (ECASS I) cohort. Stroke 1999;30:2280–2284.
- Förster A, Kerl HU, Goerlitz J, Wenz H, Groden C. Crossed cerebellar diaschisis in acute isolated thalamic infarction detected by dynamic susceptibility contrast perfusion MRI. PLoS One 2014;9:e88044. (39 名急性孤立丘脑梗死者中 9 人对侧小脑低灌注，23.1%，全部为丘脑结节、旁正中或下外侧；构音障碍或较大病灶更常见。)
- Galovic M, Döhler N, Erdélyi-Canavese B, et al. Prediction of late seizures after ischaemic stroke with a novel prognostic model (the SeLECT score): a multivariable prediction model development and validation study. Lancet Neurol 2018;17:143–152. (晚期癫痫发作 1 年 4%、5 年 8%；SeLECT 1 年 0.7–63%。)
- Ghika-Schmid F, Bogousslavsky J. The acute behavioral syndrome of anterior thalamic infarction: a prospective study of 12 cases. Ann Neurol 2000;48:220–227. (全部找词困难，构音障碍 8 人、低音量 5 人，理解和复述保留；左侧后语言记忆损失，右侧后视空间记忆损失；记忆损失及淡漠持续。)
- Goyal M, Versnick E, Tuite P, Cyr JS, Kucharczyk W, Montanera W, Willinsky R, Mikulis D. Hypertrophic olivary degeneration: metaanalysis of the temporal evolution of MR findings. AJNR Am J Neuroradiol 2000;21:1073–1077. (T2 信号 1 个月起持续数年；6 个月起增大，3–4 年消退。)
- Harper C, Cardullo PA, Weyman AK, Patterson RB. Transcranial Doppler ultrasonography of the basilar artery in patients with retrograde vertebral artery flow. J Vasc Surg 2008;48:859–864. (25 人中 19 人休息时基底动脉顺向流。)
- Huang H, Niu Z, Liu G, Jiang M, Jia Q, Li X, Su Y. Early consciousness disorder in acute large hemispheric infarction: an analysis based on quantitative EEG and brain network characteristics. Neurocrit Care 2020;33:376–388. (大半球梗死至少为 MCA 区三分之二；约 77% 有早期意识障碍。)
- Huang W, Zhang Y, Zhuang Y, Shi Y, Feng Y. An anatomical study of persistent trigeminal artery detected by computed tomography angiography and magnetic resonance angiography: proposal for a modified classification and a novel basilar artery grading system. Surg Radiol Anat 2023;45:947–957. (94,487 人中 57 人，0.06%。)
- Huang YS, Hsiao MC, Lee M, Huang YC, Lee JD. Baclofen successfully abolished prolonged central hyperthermia in a patient with basilar artery occlusion. Acta Neurol Taiwan 2009;18:118–122. (缺血性；严重脑干卒中高热预后差。)
- Huo X, Ma G, Tong X, et al. Trial of endovascular therapy for acute ischemic stroke with large infarct (ANGEL-ASPECT). N Engl J Med 2023;388:1272–1283.
- Jauss M, Krieger D, Hornig C, Schramm J, Busse O. Surgical and medical management of patients with massive cerebellar infarctions: results of the German-Austrian Cerebellar Infarction Study. J Neurol 1999;246:257–264. (84 人：意识水平最强预测因子；清醒／困倦或嗜睡／昏睡者手术不更好；第 2–4 天恶化，多数第 3 天。)
- Kargiotis O, Psychogios K, Safouris A, et al. Diagnosis and treatment of acute isolated proximal internal carotid artery occlusions: a narrative review. Ther Adv Neurol Disord 2022;15:17562864221136335.
- Kattah JC, Talkad AV, Wang DZ, Hsieh YH, Newman-Toker DE. HINTS to diagnose stroke in the acute vestibular syndrome: three-step bedside oculomotor examination more sensitive than early MRI diffusion-weighted imaging. Stroke 2009;40:3504–3510. (脑干累及 30% 有斜偏，外周 4%。)
- Kilpatrick CJ, Davis SM, Tress BM, Rossiter SC, Hopper JL, Vandendriesen ML. Epileptic seizures in acute stroke. Arch Neurol 1990;47:157–160. (皮质梗死 6.5%，通常 48 h 内；腔隙梗死无人。)
- Kumral E, Bayülkem G, Evyapan D. Clinical spectrum of pontine infarction. Clinical-MRI correlations. J Neurol 2002;249:1659–1670. (150 名孤立脑桥梗死：前内侧 58%，双侧 11% 且短暂意识丧失。)
- Labovitz DL, Hauser WA, Sacco RL. Prevalence and predictors of early seizure and status epilepticus after first stroke. Neurology 2001;57:200–206. (早期癫痫发作 4.1%：脑叶梗死 5.9%、深部 0.6%；其中 27% 癫痫持续状态；NIHSS 非独立预测因子。)
- Labropoulos N, Nandivada P, Bekelis K. Prevalence and impact of the subclavian steal syndrome. Ann Surg 2010;252:166–170. (多无症状；上肢压力差超过 40–50 mmHg 时症状较多。)
- Laureys S, Pellas F, Van Eeckhout P, et al. The locked-in syndrome: what is it like to be conscious but paralyzed and voiceless? Prog Brain Res 2005;150:495–511. (常昏迷数天至数周后醒为闭锁；诊断平均耗时 2.5 个月。)
- Lazzaro NA, Wright B, Castillo M, Fischbein NJ, Glastonbury CM, Hildenbrand PG, Wiggins RH, Quigley EP, Osborn AG. Artery of Percheron infarction: imaging patterns and clinical spectrum. AJNR Am J Neuroradiol 2010;31:1283–1289. (37 人：含中脑 43%、不含 38%、含丘脑前部及中脑 14%、丘脑前部不含中脑 5%。)
- Leonardi-Bee J, Bath PM, Phillips SJ, Sandercock PA; IST Collaborative Group. Blood pressure and clinical outcomes in the International Stroke Trial. Stroke 2002;33:1315–1320. (收缩压与结局 U 形关系；高压与早期复发及水肿死亡相关，不与有症状出血相关。)
- Lyden P, Brott T, Tilley B, Welch KM, Mascha EJ, Levine S, Haley EC, Grotta J, Marler J. Improved reliability of the NIH Stroke Scale using video training. NINDS TPA Stroke Study Group. Stroke 1994;25:2220–2226. (NINDS t-PA 试验使用的 NIHSS，含视频认证。)
- Ma H, Campbell BCV, Parsons MW, et al. Thrombolysis guided by perfusion imaging up to 9 hours after onset of stroke (EXTEND). N Engl J Med 2019;380:1795–1803.
- Menon BK, Buck BH, Singh N, et al. Intravenous tenecteplase compared with alteplase for acute ischaemic stroke in Canada (AcT): a pragmatic, multicentre, open-label, registry-linked, randomised, controlled, non-inferiority trial. Lancet 2022;400:161–169.
- Neau JP, Bogousslavsky J. The syndrome of posterior choroidal artery territory infarction. Ann Neurol 1996;39:779–788. (2,925 名卒中者中 10 人；外侧：象限盲 ± 偏身感觉丧失、经皮质失语、记忆；水平扇形盲罕见；晚期疼痛及异常运动。)
- O'Donnell JC, Browne KD, Kilbaugh TJ, Chen HI, Whyte J, Cullen DK. Challenges and demand for modeling disorders of consciousness following traumatic brain injury. Neurosci Biobehav Rev 2019;98:336–346. (仅定义：昏迷很少超过两周，随后为无反应觉醒或最低意识状态。)
- Osiro S, Zurada A, Gielecki J, Shoja MM, Tubbs RS, Loukas M. A review of subclavian steal syndrome with clinical correlation. Med Sci Monit 2012;18:RA57–RA63. (盗血现象是椎动脉逆流；综合征是椎基底或上肢症状；通常无症状。)
- Phuyal S, Pokhrel B, Lamsal R, Mishra B, Nayak MK. Sequential mechanical thrombectomies in acute bilateral middle cerebral artery strokes: a case report and review of literature. J Neurosci Rural Pract 2024;15:381–383. (双侧 MCAs 同时阻塞通常灾难性；高 NIHSS 与低意识水平是线索。)
- Prabhakaran S, Gonzalez NR, Zachrison KS, et al. 2026 Guideline for the early management of patients with acute ischemic stroke: a guideline from the American Heart Association/American Stroke Association. Stroke 2026;57:e316–e436. (重要更新包括溶栓药选择及适应条件；仅在摘要层面引用。)
- Qureshi AI, Suarez JI, Yahia AM, et al. Timing of neurologic deterioration in massive middle cerebral artery infarction: a multicenter review. Crit Care Med 2003;31:272–277. (53 人：24 h 内 36% 恶化，48 h 内 68%；死亡峰值第 3 天。)
- Raina GB, Cersosimo MG, Folgar SS, et al. Holmes tremor: clinical description, lesion localization, and treatment in a series of 29 cases. Neurology 2016;86:931–938. (病灶至震颤中位数 2 个月；levodopa 帮助 24 人中 13 人。)
- Regenhardt RW, Das AS, Stapleton CJ, Chandra RV, Rabinov JD, Patel AB, Hirsch JA, Leslie-Mazwi TM. Blood pressure and penumbral sustenance in stroke from large vessel occlusion. Front Neurol 2017;8:317. (Astrup 半暗带：约 10 以下梗死，10 和 20 mL/100 g/min 之间可存活数小时。)
- Sacco RL, Freddo L, Bello JA, Odel JG, Onesti ST, Mohr JP. Wallenberg's lateral medullary syndrome. Clinical-magnetic resonance imaging correlations. Arch Neurol 1993;50:609–614. (33 人中 11 人复视或视物模糊，不一定超出延髓外侧。)
- Sandset EC, Palaiodimou L, Jahr SH, et al. 2025 update to European Stroke Organisation (ESO) guideline on blood pressure management in acute ischaemic stroke and intracerebral haemorrhage. Eur Stroke J 2026;11:aakag004. (溶栓前低于 185/110 mmHg，之后 24 h 低于 180/105 mmHg；无再灌注时不鼓励常规升压药。)
- Sarraj A, Hassan AE, Abraham MG, et al. Trial of endovascular thrombectomy for large ischemic strokes (SELECT2). N Engl J Med 2023;388:1259–1271.
- Scala I, Ciacciarelli A, Cancelloni V, et al. Safety and efficacy of repeated intravenous thrombolysis within 3 months for acute ischemic stroke: a systematic review and individual-patient data meta-analysis. J Neurol 2026;273:607. (当前指南将 3 个月内缺血卒中列为静脉溶栓相对禁忌，主要依据专家共识；90 天内 63 例已发表重复溶栓无症状性出血；所以梗死 3 个月内第二阻塞治疗窗口注明静脉溶栓非标准，并明确建议相对性。)
- Schaller-Paule MA, Steidl E, Shrestha M, et al. Multicenter prospective analysis of hypertrophic olivary degeneration following infratentorial stroke (HOD-IS): evaluation of disease epidemiology, clinical presentation, and MR-imaging aspects. Front Neurol 2021;12:675123. (研究方案：卒中后发生频率未知。)
- Sciacca S, Lynch J, Davagnanam I, Barker R. Midbrain, pons, and medulla: anatomy and syndromes. Radiographics 2019;39:1110–1125. (脑干解剖及综合征一般综述。)
- Shah S, Liang L, Kosinski A, et al. Safety and outcomes of intravenous tPA in acute ischemic stroke patients with prior stroke within 3 months: findings from Get With The Guidelines-Stroke. Circ Cardiovasc Qual Outcomes 2020;13:e006031. (指南反对缺血卒中 3 个月内静脉 tPA；293 名至少 66 岁、3 个月内溶栓者，仅 14 天内症状性出血较多，16.3% 对 4.8%。)
- Steidl E, Rauch M, Hattingen E, et al. Qualitative and quantitative detectability of hypertrophic olivary degeneration in T2, FLAIR, PD, and DTI: a prospective MRI study. Front Neurol 2022;13:950191. (15 人中 38–67%，依序列和评分者变化。)
- Szaflarski JP, Rackley AY, Kleindorfer DO, et al. Incidence of seizures in the acute phase of stroke: a population-based study. Epilepsia 2008;49:974–981. (6044 例卒中含出血者中 3.1%，在 24 h 内。)
- Thomalla G, Simonsen CZ, Boutitie F, et al. MRI-guided thrombolysis for stroke with unknown time of onset (WAKE-UP). N Engl J Med 2018;379:611–622.
- Tilikete C, Desestret V. Hypertrophic olivary degeneration and palatal or oculopalatal tremor. Front Neurol 2017;8:302. (病灶后数周至数月；出血后多于梗死。)
- Tobalem S, Schutz JS, Chronopoulos A. Central retinal artery occlusion – rethinking retinal survival time. BMC Ophthalmol 2018;18:101. (完全阻塞约 12–15 min 后可能视网膜内层梗死；许多阻塞不完全。)
- Triantafyllou G, Paschopoulos I, Papadopoulos-Manolarakis P, et al. Prevalence of basilar artery variants: a systematic review with meta-analysis of radiological studies. Neuroradiology 2026;68:1607–1617. (永存三叉动脉 0.20%。)
- Wang J, Zheng C, Hou B, Huang A, Zhang X, Du B. Four collateral circulation pathways were observed after common carotid artery occlusion. BMC Neurol 2019;19:201. (16 名 ICA、ECA 通畅者：全部 ICA 顺向，经逆流 ECA 供血，例如甲状颈干和甲状腺上动脉。)
- Xiong Y, Campbell BCV, Schwamm LH, et al. Tenecteplase for ischemic stroke at 4.5 to 24 hours without thrombectomy (TRACE-III). N Engl J Med 2024;391:203–212.
- Yaghi S, Boehme AK, Dibu J, et al. Treatment and outcome of thrombolysis-related hemorrhage: a multicenter retrospective study. JAMA Neurol 2015;72:1451–1457. (alteplase 开始至症状性出血中位数 470 min；院内死亡率 52%。)
- Yaghi S, Eisenberger A, Willey JZ. Symptomatic intracerebral hemorrhage in acute ischemic stroke after thrombolysis with intravenous recombinant tissue plasminogen activator: a review of natural history and treatment. JAMA Neurol 2014;71:1181–1185.
- Yang P, Song L, Zhang Y, et al. Intensive blood pressure control after endovascular thrombectomy for acute ischaemic stroke (ENCHANTED2/MT): a multicentre, open-label, blinded-endpoint, randomised controlled trial. Lancet 2022;400:1585–1596. (成功取栓后收缩压目标低于 120 mmHg 导致更差功能结局。)
- Yoshimura S, Sakai N, Yamagami H, et al. Endovascular therapy for acute stroke with a large ischemic region (RESCUE-Japan LIMIT). N Engl J Med 2022;386:1303–1313.

<a id="中風後常見但與病灶部位關聯有限的問題--common-after-stroke-weakly-tied-to-the-lesion-site"></a>
### 卒中后常见、但与病灶部位关联有限的问题

作为群体统计显示于结局旁，不作为模拟病例症状（`src/anatomy/postStrokeRisks.ts`）：

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
## 参考的开源项目（未复制代码）

- [openBF (INSIGNEO)](https://github.com/INSIGNEO/openBF) — Apache-2.0
  - 参考其 Alastruey 2007 Willis 环模型的血管半径与长度；未复制代码。
  - 参考其 Alastruey 2007 Willis 环模型的血管半径与长度；未复制代码。
- [WillisWorks](https://github.com/abhogal-lab/WillisWorks) — GPL-3.0
  - 启发了自动调节、盗血与侧支的教学呈现方式；因授权不相容，只参考概念、未使用任何代码。
  - 启发了自动调节、盗血与侧支的教学呈现方式；因授权不相容，只参考概念、未使用任何代码。
- [neuroaxis-atlas](https://github.com/linkbag/neuroaxis-atlas) — MIT
  - 参考其脑干综合征卡片与数据来源标示方式。
  - 参考其脑干综合征卡片与数据来源标示方式。
- [brain-game](https://github.com/Rickaym/brain-game) — MIT（代码）
  - 参考其脑区—动脉对照与卒中模拟的教学构想；其 3D 模型为 CC BY-SA 2.1 JP，本项目未使用。
  - 参考其脑区—动脉对照与卒中模拟的教学构想；其 3D 模型为 CC BY-SA 2.1 JP，本项目未使用。

<a id="免責聲明--disclaimer"></a>
## 免责声明

本项目的临床内容是为了教育目的而简化的整理，未经临床医师正式审阅；实际临床表现因人而异。
临床内容为简化教学整理，未经临床医师正式审阅；真实表现存在差异。

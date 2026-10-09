import type { ContentTranslations } from './content';

export const SUPPORTING_TRANSLATIONS = {
  "Post-stroke depression": {
    "zh-CN": "脑卒中后抑郁",
    "de": "Depression nach Schlaganfall",
    "ja": "脳卒中後うつ病"
  },
  "Persistent low mood or loss of interest and pleasure, often with changes in sleep, appetite and energy; it slows rehabilitation and can be screened for and treated.": {
    "zh-CN": "持续的情绪低落、失去兴趣或乐趣，常伴随睡眠、食欲与活力的改变；会拖慢康复，可以筛检与治疗。",
    "de": "Anhaltende Niedergeschlagenheit oder Verlust von Interesse und Freude, oft mit Veränderungen von Schlaf, Appetit und Energie; dies verzögert die Rehabilitation und kann durch Screening erkannt und behandelt werden.",
    "ja": "持続する気分の落ち込みや興味・喜びの喪失で、睡眠、食欲、活力の変化を伴うことが多い。リハビリテーションを遅らせるが、スクリーニングと治療が可能である。"
  },
  "pooled over assessments at any time after the stroke (about 25 % between 1 and 5 years)": {
    "zh-CN": "脑卒中后任一时间点的合并估计（1–5 年间约 25%）",
    "de": "zusammengefasste Untersuchungen zu beliebigen Zeitpunkten nach dem Schlaganfall (etwa 25 % zwischen 1 und 5 Jahren)",
    "ja": "脳卒中後の各時点の評価を統合した推定（1–5 年では約 25 %）"
  },
  "Consistent predictors: disability, depression before the stroke, cognitive impairment, stroke severity and anxiety (Ayerbe 2013; prevalence 29 % in that review, cumulative incidence 39–52 % within 5 years). Lesion site: a systematic review found no support for more depression after left-hemisphere or left anterior lesions (left vs right relative risk 0.95, 95% CI 0.83–1.10; Carson 2000); one large lesion-mapping study (553 patients, validated in 459) linked depressive symptoms to infarcts of the right amygdala and pallidum (Weaver 2023).": {
    "zh-CN": "一致的预测因子：残疾、脑卒中前就有抑郁、认知障碍、脑卒中严重度与焦虑（Ayerbe 2013；该回顾的患病率为 29%，5 年内累积发生率 39–52%）。病灶位置：系统性回顾不支持「左半球或左前方病灶较易抑郁」的假说（左对右相对风险 0.95，95% CI 0.83–1.10；Carson 2000）；一个大型病灶定位研究（553 人，另在 459 人验证）则发现右侧杏仁体与苍白球的梗死与抑郁症状有关（Weaver 2023）。",
    "de": "Übereinstimmende Prädiktoren: Behinderung, Depression vor dem Schlaganfall, kognitive Beeinträchtigung, Schlaganfallschwere und Angst (Ayerbe 2013; Prävalenz in dieser Übersicht 29 %, kumulative Inzidenz innerhalb von 5 Jahren 39–52 %). Läsionsort: Eine systematische Übersicht fand keine Hinweise auf häufigere Depressionen nach linkshemisphärischen oder links anterioren Läsionen (relatives Risiko links gegenüber rechts 0.95, 95%-KI 0.83–1.10; Carson 2000); eine große Läsionskartierungsstudie (553 Patienten, in 459 validiert) verband depressive Symptome mit Infarkten der rechten Amygdala und des Pallidums (Weaver 2023).",
    "ja": "一貫した予測因子は、障害、脳卒中前からのうつ病、認知機能障害、脳卒中の重症度、不安である（Ayerbe 2013；同レビューの有病率 29 %、5 年以内の累積発症率 39–52 %）。病変部位について、系統的レビューは左半球または左前方病変でうつ病が多いという見解を支持しなかった（左対右の相対リスク 0.95、95% CI 0.83–1.10；Carson 2000）。大規模な病変マッピング研究（553 人、別の 459 人で検証）は、右扁桃体と淡蒼球の梗塞を抑うつ症状と関連づけた（Weaver 2023）。"
  },
  "Anxiety after stroke": {
    "zh-CN": "脑卒中后焦虑",
    "de": "Angst nach Schlaganfall",
    "ja": "脳卒中後の不安"
  },
  "Excessive worry, tension or panic (for example fear of another stroke or of falling) that interferes with daily life and rehabilitation.": {
    "zh-CN": "过度担心、紧张或恐慌（例如害怕再次脑卒中、害怕跌倒），干扰日常生活与康复。",
    "de": "Übermäßige Sorgen, Anspannung oder Panik (etwa Angst vor einem weiteren Schlaganfall oder einem Sturz), die Alltag und Rehabilitation beeinträchtigen.",
    "ja": "過度の心配、緊張、パニック（再発や転倒への恐怖など）で、日常生活とリハビリテーションに支障を来す。"
  },
  "by diagnostic interview (about 24 % by rating scale); not meaningfully lower up to 24 months after the stroke": {
    "zh-CN": "以诊断性会谈判定（用评量表则约 24%）；到脑卒中后 24 个月都没有明显下降",
    "de": "durch diagnostisches Interview (etwa 24 % mit Bewertungsskalen); bis 24 Monate nach dem Schlaganfall nicht wesentlich niedriger",
    "ja": "診断面接による評価（評価尺度では約 24 %）；脳卒中後 24 か月まで明らかな低下なし"
  },
  "Most consistently associated with post-stroke depression (odds ratio 4.66, 95% CI 2.23–9.74); poor sleep, fatigue and anxiety before the stroke are also associated, from fewer studies (Wright 2017). Neither review ties anxiety to a lesion site.": {
    "zh-CN": "最一致的关联是脑卒中后抑郁（比值比 4.66，95% CI 2.23–9.74）；睡眠困扰、疲劳与脑卒中前的焦虑也有关联，但研究较少（Wright 2017）。这两篇回顾都没有把焦虑归因于特定病灶位置。",
    "de": "Am konsistentesten mit Depression nach Schlaganfall verbunden (Odds Ratio 4.66, 95%-KI 2.23–9.74); schlechter Schlaf, Fatigue und Angst vor dem Schlaganfall sind ebenfalls assoziiert, gestützt auf weniger Studien (Wright 2017). Keine der beiden Übersichten ordnet Angst einem bestimmten Läsionsort zu.",
    "ja": "最も一貫した関連は脳卒中後うつ病である（オッズ比 4.66、95% CI 2.23–9.74）。睡眠不良、疲労、脳卒中前からの不安も関連するが、研究数は少ない（Wright 2017）。いずれのレビューも不安を特定の病変部位に結びつけていない。"
  },
  "Apathy": {
    "zh-CN": "冷漠（动机缺乏）",
    "de": "Apathie",
    "ja": "アパシー"
  },
  "Reduced initiative and motivation: little drive to start things, without necessarily feeling sad — distinct from depression, though the two can coexist.": {
    "zh-CN": "主动性与动机降低：对事情提不起劲、不主动开始活动，但不一定感到悲伤——与抑郁不同，两者也可能同时存在。",
    "de": "Verminderte Eigeninitiative und Motivation: wenig Antrieb, etwas zu beginnen, ohne notwendigerweise traurig zu sein — von Depression zu unterscheiden, obwohl beides zusammen auftreten kann.",
    "ja": "自発性と意欲の低下。活動を始める動機が乏しいが、必ずしも悲しさを伴わない。うつ病とは異なるが、両者は併存し得る。"
  },
  "similar in the acute and post-acute phases (39.5 % and 34.3 %)": {
    "zh-CN": "急性期与急性期后相近（39.5% 与 34.3%）",
    "de": "ähnlich in der akuten und postakuten Phase (39.5 % und 34.3 %)",
    "ja": "急性期と急性期後で同程度（39.5 % と 34.3 %）"
  },
  "People with apathy were on average about 2.7 years older and more often depressed (odds ratio 2.29) and cognitively impaired (odds ratio 2.90); rates were similar after ischaemic and haemorrhagic stroke and after left- and right-hemisphere lesions (Caeiro 2013).": {
    "zh-CN": "有冷漠的病人平均年长约 2.7 岁，较常合并抑郁（比值比 2.29）与认知障碍（比值比 2.90）；缺血性与出血性脑卒中、左侧与右侧半球病灶的比率相近（Caeiro 2013）。",
    "de": "Menschen mit Apathie waren im Mittel etwa 2.7 Jahre älter und häufiger depressiv (Odds Ratio 2.29) sowie kognitiv beeinträchtigt (Odds Ratio 2.90); die Häufigkeiten waren nach ischämischem und hämorrhagischem Schlaganfall sowie nach links- und rechtshemisphärischen Läsionen ähnlich (Caeiro 2013).",
    "ja": "アパシーのある人は平均で約 2.7 歳高齢で、うつ病（オッズ比 2.29）と認知機能障害（オッズ比 2.90）が多かった。虚血性と出血性脳卒中、左半球と右半球病変で頻度は同程度だった（Caeiro 2013）。"
  },
  "Post-stroke emotionalism (pathological crying or laughing)": {
    "zh-CN": "脑卒中后情绪失控（病理性哭笑）",
    "de": "Emotionale Labilität nach Schlaganfall (pathologisches Weinen oder Lachen)",
    "ja": "脳卒中後の情動失禁（病的な泣き・笑い）"
  },
  "Sudden, hard-to-control crying (the commoner form) or laughing, out of proportion to what the person feels.": {
    "zh-CN": "突然、难以控制的哭泣（较常见）或大笑，与当下的感受不相称。",
    "de": "Plötzliches, schwer kontrollierbares Weinen (häufiger) oder Lachen, das nicht dem tatsächlichen Empfinden entspricht.",
    "ja": "本人の感情に見合わない、突然で制御しにくい泣き（より多い）や笑い。"
  },
  "1–6 months after the stroke (17 % within the first month, 12 % beyond 6 months)": {
    "zh-CN": "脑卒中后 1–6 个月（1 个月内 17%，6 个月后 12%）",
    "de": "1–6 Monate nach dem Schlaganfall (17 % im ersten Monat, 12 % nach mehr als 6 Monaten)",
    "ja": "脳卒中後 1–6 か月（最初の 1 か月は 17 %、6 か月以降は 12 %）"
  },
  "Overall frequency from Gillespie 2016. Unlike the items above, growing evidence points to damage to specific areas and pathways for emotional expression or regulation and to serotonin pathways (Broomfield 2024, narrative review), so some lesion sites do make it more likely; the figure here is for all strokes.": {
    "zh-CN": "整体频率见 Gillespie 2016。与上面几项不同，越来越多证据指向与情绪表达或调节有关的特定脑区、其连结路径与血清素系统受损（Broomfield 2024 叙述性回顾），所以部分病灶位置确实比较容易出现；这里列的是所有脑卒中的整体比率。",
    "de": "Gesamthäufigkeit nach Gillespie 2016. Anders als bei den obigen Punkten weisen zunehmende Befunde auf Schäden bestimmter Regionen und Bahnen für Emotionsausdruck oder -regulation sowie serotonerger Bahnen hin (Broomfield 2024, narrative Übersicht); manche Läsionsorte erhöhen daher tatsächlich das Risiko. Die hier genannte Zahl gilt für alle Schlaganfälle.",
    "ja": "全体の頻度は Gillespie 2016 による。上の項目と異なり、情動表出・調節に関わる特定の領域や経路、およびセロトニン経路の損傷を示す知見が増えている（Broomfield 2024、叙述的レビュー）。したがって一部の病変部位では発症しやすいが、ここで示す値は全脳卒中の頻度である。"
  },
  "Post-stroke fatigue": {
    "zh-CN": "脑卒中后疲劳",
    "de": "Fatigue nach Schlaganfall",
    "ja": "脳卒中後疲労"
  },
  "Tiredness and lack of energy out of proportion to activity, and not much relieved by rest.": {
    "zh-CN": "与活动量不成比例、休息后也不太改善的疲倦与精力不足。",
    "de": "Müdigkeit und Energiemangel, die nicht im Verhältnis zur Aktivität stehen und durch Ruhe kaum gebessert werden.",
    "ja": "活動量に見合わない疲れと活力低下で、休息でもあまり改善しない。"
  },
  "by the Fatigue Severity Scale (≥ 4), pooled over time points; lower in Asian studies (35 %)": {
    "zh-CN": "以疲劳严重度量表（FSS ≥ 4）判定，各时间点合并；亚洲研究较低（35%）",
    "de": "mit der Fatigue Severity Scale (≥ 4), über Zeitpunkte zusammengefasst; niedriger in asiatischen Studien (35 %)",
    "ja": "Fatigue Severity Scale（≥ 4）による評価、各時点を統合；アジアの研究では低い（35 %）"
  },
  "Estimates vary widely between studies, and neither depression nor time since stroke explained it (Cumming 2016). No association with white-matter lesions, brain atrophy or stroke type; evidence on lesion site is inconclusive — 4 of 13 studies linked it to infratentorial (especially brainstem) or basal ganglia strokes (Kutlubaev 2012).": {
    "zh-CN": "研究间差异很大，抑郁状态与脑卒中后时间都无法解释（Cumming 2016）。与白质病变、脑萎缩或脑卒中类型无关；病灶位置的证据不一致——13 篇研究中有 4 篇发现与天幕下（尤其脑干）或基底核脑卒中有关（Kutlubaev 2012）。",
    "de": "Die Schätzungen unterscheiden sich stark zwischen Studien; weder Depression noch Zeit seit dem Schlaganfall erklärten dies (Cumming 2016). Keine Assoziation mit Läsionen der weißen Substanz, Hirnatrophie oder Schlaganfalltyp; die Befunde zum Läsionsort sind uneinheitlich — 4 von 13 Studien fanden eine Verbindung mit infratentoriellen (insbesondere Hirnstamm-) oder Basalganglieninfarkten (Kutlubaev 2012).",
    "ja": "推定値は研究間で大きく異なり、うつ病や脳卒中からの時間では説明できなかった（Cumming 2016）。白質病変、脳萎縮、脳卒中の型との関連はなく、病変部位に関する知見は一致しない。13 研究中 4 研究で、テント下（特に脳幹）または大脳基底核の脳卒中との関連があった（Kutlubaev 2012）。"
  },
  "Insomnia": {
    "zh-CN": "失眠",
    "de": "Insomnie",
    "ja": "不眠症"
  },
  "Difficulty falling asleep, staying asleep or waking too early, with effects during the day.": {
    "zh-CN": "难以入睡、睡不久或太早醒，白天因此受影响。",
    "de": "Probleme beim Einschlafen, Durchschlafen oder zu frühes Erwachen mit Auswirkungen am Tag.",
    "ja": "入眠困難、中途覚醒、早朝覚醒で、日中にも影響がある。"
  },
  "insomnia or insomnia symptoms, pooled across studies; about 32 % with diagnostic tools": {
    "zh-CN": "失眠或失眠症状，各研究合并；用诊断工具判定约 32%",
    "de": "Insomnie oder Insomniesymptome, über Studien zusammengefasst; etwa 32 % mit diagnostischen Instrumenten",
    "ja": "不眠症または不眠症状、研究を統合；診断用尺度では約 32 %"
  },
  "Insomnia symptoms were greater with depression or anxiety; the review found no incidence studies and did not analyse lesion site (Baylan 2020).": {
    "zh-CN": "合并抑郁或焦虑的人失眠症状较多；该回顾没有找到发生率研究，也没有分析病灶位置（Baylan 2020）。",
    "de": "Insomniesymptome waren bei Depression oder Angst stärker; die Übersicht fand keine Inzidenzstudien und analysierte den Läsionsort nicht (Baylan 2020).",
    "ja": "うつ病や不安があると不眠症状が強かった。レビューでは発症率の研究はなく、病変部位も分析していない（Baylan 2020）。"
  },
  "Sleep apnoea (sleep-disordered breathing)": {
    "zh-CN": "睡眠呼吸暂停（睡眠呼吸障碍）",
    "de": "Schlafapnoe (schlafbezogene Atmungsstörung)",
    "ja": "睡眠時無呼吸（睡眠呼吸障害）"
  },
  "Repeated pauses or shallow breathing during sleep (apnoea–hypopnoea index > 5/h), mostly obstructive; often unnoticed and found only by a sleep study.": {
    "zh-CN": "睡眠中反复呼吸停止或变浅（呼吸暂停低通气指数 AHI > 5 次／小时），大多是阻塞型；常没有自觉，需要睡眠检查才能发现。",
    "de": "Wiederholte Atempausen oder flache Atmung im Schlaf (Apnoe-Hypopnoe-Index > 5/h), meist obstruktiv; häufig unbemerkt und erst durch eine Schlafuntersuchung erkannt.",
    "ja": "睡眠中に呼吸停止や浅い呼吸を繰り返す（無呼吸低呼吸指数 > 5/h）。主に閉塞性で、本人が気づかず睡眠検査で初めて発見されることも多い。"
  },
  "similar in the acute, subacute and chronic phases (severe, AHI > 30: about 30 %); includes TIA": {
    "zh-CN": "急性期、亚急性期与慢性期相近（AHI > 30 的重度约 30%）；包含 TIA",
    "de": "ähnlich in der akuten, subakuten und chronischen Phase (schwer, AHI > 30: etwa 30 %); einschließlich TIA",
    "ja": "急性期・亜急性期・慢性期で同程度（重症、AHI > 30：約 30 %）；TIA を含む"
  },
  "Its prevalence is about the same early and late after a stroke (Johnson 2010; Seiler 2019), which suggests that much of it predates the stroke; obstructive sleep apnoea is itself associated with a higher combined risk of stroke or death (Yaggi 2005, adjusted hazard ratio about 2). Only about 7 % is mainly central; it is commoner in men and after recurrent strokes, and does not differ between ischaemic stroke, haemorrhage and TIA (it is less common after cardioembolic stroke). These reviews do not tie it to a lesion site.": {
    "zh-CN": "脑卒中后早期与晚期的患病率差不多（Johnson 2010；Seiler 2019），表示很大一部分在脑卒中前就已存在；阻塞性睡眠呼吸暂停本身与较高的「脑卒中或死亡」合并风险有关（Yaggi 2005，校正后风险比约 2）。只有约 7% 以中枢型为主；男性与再次脑卒中者比率较高；缺血性脑卒中、脑出血与 TIA 之间没有差别（心源性栓塞的脑卒中较少）。这些回顾没有把它归因于病灶位置。",
    "de": "Die Prävalenz ist früh und spät nach einem Schlaganfall etwa gleich (Johnson 2010; Seiler 2019), was nahelegt, dass vieles schon vorher bestand; obstruktive Schlafapnoe ist selbst mit einem höheren kombinierten Risiko für Schlaganfall oder Tod verbunden (Yaggi 2005, adjustierte Hazard Ratio etwa 2). Nur etwa 7 % sind überwiegend zentral; häufiger bei Männern und nach wiederholten Schlaganfällen, ohne Unterschied zwischen ischämischem Schlaganfall, Blutung und TIA (seltener nach kardioembolischem Schlaganfall). Diese Übersichten ordnen sie keinem Läsionsort zu.",
    "ja": "脳卒中後の早期と晩期で有病率はほぼ同じであり（Johnson 2010；Seiler 2019）、多くは発症前から存在していたと考えられる。閉塞性睡眠時無呼吸自体が脳卒中または死亡の複合リスク上昇に関連する（Yaggi 2005、調整ハザード比は約 2）。主に中枢性なのは約 7 % にとどまる。男性と再発脳卒中で多く、虚血性脳卒中、出血、TIA で差はない（心原性脳塞栓症では少ない）。これらのレビューは特定の病変部位に結びつけていない。"
  },
  "Dementia after stroke": {
    "zh-CN": "脑卒中后痴呆",
    "de": "Demenz nach Schlaganfall",
    "ja": "脳卒中後認知症"
  },
  "A new decline in overall cognition after the stroke that is severe enough to affect daily life (not just a single language or spatial deficit).": {
    "zh-CN": "脑卒中后新出现、足以影响日常生活的整体认知功能衰退（不只是单一的语言或空间缺损）。",
    "de": "Neu aufgetretener allgemeiner kognitiver Abbau nach dem Schlaganfall, der den Alltag erheblich beeinträchtigt (über ein einzelnes Sprach- oder Raumwahrnehmungsdefizit hinaus).",
    "ja": "脳卒中後に新たに生じた全般的認知機能の低下で、日常生活に支障を来す程度に重いもの（単一の言語・空間認知障害だけではない）。"
  },
  "within the first year after a first stroke (population-based studies, dementia before the stroke excluded)": {
    "zh-CN": "首次脑卒中后 1 年内（以人口为基础的研究，排除脑卒中前已痴呆者）",
    "de": "im ersten Jahr nach einem ersten Schlaganfall (bevölkerungsbasierte Studien, Demenz vor dem Schlaganfall ausgeschlossen)",
    "ja": "初回脳卒中後の最初の 1 年（地域住民研究、発症前の認知症を除外）"
  },
  "Most strongly associated with the characteristics and complications of the stroke itself and with multiple lesions in time and place; the authors see the stroke itself, rather than the underlying vascular risk factors, as the central cause. More than a third have dementia after a recurrent stroke, and about one in ten already had dementia before the first one (Pendlebury 2009). Milder post-stroke cognitive impairment affects about half in the first year; in a lesion-mapping analysis of 2950 patients from 12 cohorts, infarcts of the left frontotemporal lobes, left thalamus and right parietal lobe were the most strongly associated with it (Weaver 2021). Specific cognitive deficits (aphasia, neglect) depend on the lesion site and are listed with the case’s symptoms.": {
    "zh-CN": "与脑卒中后痴呆最相关的是脑卒中本身的特征与并发症，以及时间与位置上多发的病灶；作者认为主因是脑卒中本身，而不是背后的血管危险因子。再次脑卒中后超过三分之一有痴呆；另有约一成在首次脑卒中前就已痴呆（Pendlebury 2009）。较轻的脑卒中后认知障碍在第一年约有一半；12 个队列、2950 人的病灶定位分析中，左侧额颞叶、左侧丘脑与右侧顶叶的梗死关联最强（Weaver 2021）。个别认知缺损（失语、忽略）取决于病灶位置，已列在病例的症状里。",
    "de": "Am stärksten mit Merkmalen und Komplikationen des Schlaganfalls selbst und mit mehreren Läsionen zu verschiedenen Zeiten und an verschiedenen Orten verbunden; die Autoren sehen den Schlaganfall selbst und nicht die zugrunde liegenden vaskulären Risikofaktoren als zentrale Ursache. Nach wiederholtem Schlaganfall hat mehr als ein Drittel eine Demenz; etwa jeder Zehnte hatte bereits vor dem ersten Schlaganfall eine Demenz (Pendlebury 2009). Leichtere kognitive Beeinträchtigungen betreffen im ersten Jahr etwa die Hälfte; in einer Läsionskartierungsanalyse von 2950 Patienten aus 12 Kohorten waren Infarkte der linken frontotemporalen Lappen, des linken Thalamus und des rechten Parietallappens am stärksten damit verbunden (Weaver 2021). Spezifische kognitive Defizite (Aphasie, Neglect) hängen vom Läsionsort ab und stehen bei den Symptomen des Falls.",
    "ja": "脳卒中自体の特徴と合併症、および時間的・空間的に複数の病変と最も強く関連する。著者らは基礎にある血管危険因子より脳卒中そのものを中心的原因と考えている。再発後は 3 分の 1 超に認知症があり、約 10 人に 1 人は初回発症前から認知症があった（Pendlebury 2009）。軽度の脳卒中後認知機能障害は最初の 1 年に約半数にみられる。12 コホート、2950 人の病変マッピング解析では、左前頭側頭葉、左視床、右頭頂葉の梗塞との関連が最も強かった（Weaver 2021）。失語や半側空間無視などの特定の認知障害は病変部位によって異なり、この症例の症状欄に示す。"
  },
  "Falls": {
    "zh-CN": "跌倒",
    "de": "Stürze",
    "ja": "転倒"
  },
  "Balance, strength, vision and attention can all be worse after a stroke, so falls are common; they can cause fractures, and the fear of falling makes people less active.": {
    "zh-CN": "脑卒中后平衡、肌力、视野与注意力都可能变差，跌倒很常见，可能造成骨折，也让人因为害怕跌倒而更少活动。",
    "de": "Gleichgewicht, Kraft, Sehen und Aufmerksamkeit können nach einem Schlaganfall beeinträchtigt sein; Stürze sind daher häufig. Sie können Frakturen verursachen, und Sturzangst verringert die Aktivität.",
    "ja": "脳卒中後は平衡、筋力、視覚、注意が低下し得るため、転倒が多い。骨折を来すことがあり、転倒への恐怖は活動を減らす。"
  },
  "of people aged 60 or over who went home with residual disability (one cohort)": {
    "zh-CN": "的 60 岁以上、出院回家时留有残疾的病人（单一队列）",
    "de": "der mindestens 60-Jährigen, die mit verbleibender Behinderung nach Hause zurückkehrten (eine Kohorte)",
    "ja": "障害が残った状態で自宅に戻った 60 歳以上の人（1 コホート）"
  },
  "at least one fall within 6 months of going home (people aged 60 or over with some residual disability, 79 of 108); about 25 % during the hospital stay": {
    "zh-CN": "出院回家后 6 个月内至少跌倒一次（60 岁以上、留有部分残疾的人，108 人中 79 人）；住院期间约 25%",
    "de": "mindestens ein Sturz innerhalb von 6 Monaten nach Heimkehr (mindestens 60-Jährige mit verbleibender Behinderung, 79 von 108); etwa 25 % während des Krankenhausaufenthalts",
    "ja": "退院後 6 か月以内に 1 回以上転倒（障害の残る 60 歳以上、108 人中 79 人）；入院中は約 25 %"
  },
  "People who fell in hospital were more likely to fall repeatedly at home; repeated fallers were less socially active and more often low in mood at 6 months, and their carers more stressed (Forster 1995). The in-hospital figure comes from a multicentre cohort (Langhorne 2000). These studies do not tie falls to a lesion site.": {
    "zh-CN": "住院时就跌倒过的人，回家后较容易反复跌倒；反复跌倒的人 6 个月时社交活动较少、较常情绪低落，照顾者的压力也较大（Forster 1995）。住院期间的比率来自一个多中心队列（Langhorne 2000）。这些研究没有把跌倒归因于病灶位置。",
    "de": "Wer im Krankenhaus stürzte, stürzte zu Hause häufiger wiederholt; wiederholt Stürzende waren nach 6 Monaten sozial weniger aktiv und häufiger niedergeschlagen, ihre Betreuungspersonen stärker belastet (Forster 1995). Die Krankenhauszahl stammt aus einer multizentrischen Kohorte (Langhorne 2000). Diese Studien ordnen Stürze keinem Läsionsort zu.",
    "ja": "入院中に転倒した人は自宅でも反復転倒しやすかった。反復転倒者は 6 か月時点で社会活動が少なく気分の落ち込みが多く、介護者の負担も大きかった（Forster 1995）。入院中の値は多施設コホートによる（Langhorne 2000）。これらの研究は転倒を特定の病変部位に結びつけていない。"
  },
  "Shoulder pain after stroke": {
    "zh-CN": "脑卒中后肩膀痛",
    "de": "Schulterschmerz nach Schlaganfall",
    "ja": "脳卒中後の肩痛"
  },
  "Pain in the shoulder of the weak arm, linked to a hanging arm without muscle support, partial dislocation or a stiff joint; it gets in the way of dressing, walking and rehabilitation.": {
    "zh-CN": "无力那一侧的肩膀疼痛：手臂垂著没有肌肉支撑、关节半脱位或活动受限都有关；会妨碍穿衣、行走与康复。",
    "de": "Schmerz in der Schulter des schwachen Arms, verbunden mit einem ohne Muskelstütze hängenden Arm, Subluxation oder Gelenksteife; er erschwert Ankleiden, Gehen und Rehabilitation.",
    "ja": "筋による支持を失って下垂した腕、亜脱臼、関節拘縮などに関連する、麻痺側上肢の肩の痛み。着替え、歩行、リハビリテーションを妨げる。"
  },
  "new within 4 months of a first stroke (a population-based study), almost a third by 16 months; about 9 % during the hospital stay": {
    "zh-CN": "首次脑卒中后 4 个月内新出现（以人口为基础的研究）；到 16 个月时接近三分之一；住院期间约 9%",
    "de": "neu innerhalb von 4 Monaten nach dem ersten Schlaganfall (bevölkerungsbasierte Studie), bis 16 Monate fast ein Drittel; etwa 9 % während des Krankenhausaufenthalts",
    "ja": "初回脳卒中後 4 か月以内の新規発症（地域住民研究）、16 か月までに約 3 分の 1；入院中は約 9 %"
  },
  "Predicted by lost or impaired arm movement and a higher NIHSS at onset; most of the pain was moderate to severe (Lindgren 2007).": {
    "zh-CN": "预测因子是手臂动作丧失或变差，以及脑卒中当时较高的 NIHSS；大多数是中度到重度的疼痛（Lindgren 2007）。",
    "de": "Prädiktoren waren verlorene oder eingeschränkte Armbeweglichkeit und ein höherer NIHSS bei Beginn; die Schmerzen waren überwiegend mittelstark bis stark (Lindgren 2007).",
    "ja": "上肢運動の消失・障害と発症時の高い NIHSS が予測因子で、痛みの多くは中等度から重度だった（Lindgren 2007）。"
  },
  "Urinary incontinence": {
    "zh-CN": "尿失禁",
    "de": "Harninkontinenz",
    "ja": "尿失禁"
  },
  "Loss of bladder control. After a stroke it is mostly not tied to the lesion site but to how severe the stroke is, immobility and being able to ask for or reach the toilet in time; damage to the medial frontal lobe is a separate, specific cause (listed with the case’s symptoms).": {
    "zh-CN": "无法控制排尿。脑卒中后大多与病灶位置无关，而与脑卒中的严重度、行动不便和能不能及时表达、到厕所有关；内侧额叶受损是另一个特定的原因（会列在病例的症状里）。",
    "de": "Verlust der Blasenkontrolle. Nach Schlaganfall hängt dies meist eher mit Schlaganfallschwere, Immobilität und der Fähigkeit zusammen, rechtzeitig um Hilfe zu bitten oder die Toilette zu erreichen, als mit dem Läsionsort. Schäden des medialen Frontallappens sind eine gesonderte, spezifische Ursache (bei den Symptomen des Falls aufgeführt).",
    "ja": "膀胱制御の喪失。脳卒中後では病変部位より、重症度、動けないこと、適時に介助を求めたりトイレに到達できるかとの関連が多い。内側前頭葉の損傷は別の特異的原因であり、症例の症状欄に示す。"
  },
  "about 10 days after the stroke (19 % at 3 months, 15 % at 1 year, 10 % at 2 years)": {
    "zh-CN": "脑卒中后约 10 天（3 个月 19%，1 年 15%，2 年 10%）",
    "de": "etwa 10 Tage nach dem Schlaganfall (19 % nach 3 Monaten, 15 % nach 1 Jahr, 10 % nach 2 Jahren)",
    "ja": "脳卒中後約 10 日（3 か月は 19 %、1 年は 15 %、2 年は 10 %）"
  },
  "Independently associated with age over 75, dysphagia, limb weakness and a visual field defect; less common after lacunar infarcts. Those incontinent early had higher death, institutionalisation and disability rates at 2 years (Patel 2001). About 24 % had a urinary tract infection during the hospital stay (Langhorne 2000).": {
    "zh-CN": "独立相关因子：年龄大于 75 岁、吞咽困难、肢体无力与视野缺损；腔隙性梗死较少见。早期尿失禁的人 2 年时死亡、住进照护机构与残疾的比率都较高（Patel 2001）。住院期间约 24% 有尿路感染（Langhorne 2000）。",
    "de": "Unabhängig mit Alter über 75, Dysphagie, Extremitätenschwäche und Gesichtsfeldausfall verbunden; seltener nach lakunären Infarkten. Früh inkontinente Patienten hatten nach 2 Jahren höhere Sterbe-, Institutionalisierungs- und Behinderungsraten (Patel 2001). Etwa 24 % hatten während des Krankenhausaufenthalts einen Harnwegsinfekt (Langhorne 2000).",
    "ja": "75 歳超、嚥下障害、四肢筋力低下、視野欠損と独立して関連し、ラクナ梗塞では少ない。早期に尿失禁があった人は 2 年後の死亡、施設入所、障害の率が高かった（Patel 2001）。入院中に約 24 % が尿路感染症を発症した（Langhorne 2000）。"
  },
  "Infections (urinary tract, chest)": {
    "zh-CN": "感染（尿路、肺部）",
    "de": "Infektionen (Harnwege, Atemwege)",
    "ja": "感染症（尿路・呼吸器）"
  },
  "Among the commonest complications during the hospital stay: urinary tract infection and pneumonia (often from dysphagia and aspiration). Fever after a stroke means looking for an infection first.": {
    "zh-CN": "脑卒中后住院期间最常见的并发症之一：尿路感染与肺炎（常与吞咽困难、吸入有关）。脑卒中后发烧要先找感染。",
    "de": "Zu den häufigsten Komplikationen im Krankenhaus gehören Harnwegsinfekte und Pneumonie (oft durch Dysphagie und Aspiration). Bei Fieber nach Schlaganfall muss zuerst nach einer Infektion gesucht werden.",
    "ja": "入院中に最も多い合併症の一つは尿路感染症と肺炎（嚥下障害や誤嚥によることが多い）である。脳卒中後の発熱ではまず感染症を調べる。"
  },
  "of patients in hospital (one cohort)": {
    "zh-CN": "的住院病人（单一队列）",
    "de": "der stationären Patienten (eine Kohorte)",
    "ja": "入院患者（1 コホート）"
  },
  "urinary tract infection during the hospital stay (chest infection 22 %; one multicentre cohort of 311)": {
    "zh-CN": "住院期间的尿路感染（肺部感染 22%；一个多中心队列，311 人）",
    "de": "Harnwegsinfekt während des Krankenhausaufenthalts (Atemwegsinfekt 22 %; eine multizentrische Kohorte mit 311 Patienten)",
    "ja": "入院中の尿路感染症（呼吸器感染症 22 %；311 人の多施設コホート）"
  },
  "85 % had at least one complication in hospital; infections and falls stayed common during follow-up, their frequency related to how dependent the patient was (Langhorne 2000). Dysphagia raises the risk of pneumonia about threefold, and confirmed aspiration about elevenfold (Martino 2005).": {
    "zh-CN": "住院期间 85% 至少有一种并发症；感染与跌倒在之后的追踪中仍然常见，频率与病人的依赖程度有关（Langhorne 2000）。吞咽困难让肺炎风险增加约 3 倍，确认有吸入时约 11 倍（Martino 2005）。",
    "de": "85 % hatten mindestens eine Komplikation im Krankenhaus; Infektionen und Stürze blieben bei der Nachbeobachtung häufig, abhängig vom Hilfebedarf des Patienten (Langhorne 2000). Dysphagie erhöht das Pneumonierisiko etwa um das Dreifache, nachgewiesene Aspiration etwa um das Elffache (Martino 2005).",
    "ja": "85 % が入院中に 1 つ以上の合併症を発症した。追跡中も感染症と転倒は多く、その頻度は患者の介助依存度と関連した（Langhorne 2000）。嚥下障害は肺炎リスクを約 3 倍、確認された誤嚥は約 11 倍に高める（Martino 2005）。"
  },
  "Recurrent stroke": {
    "zh-CN": "再次脑卒中",
    "de": "Erneuter Schlaganfall",
    "ja": "脳卒中再発"
  },
  "Another stroke after the first. The risk is highest in the first weeks to months and keeps adding up over the years; secondary prevention (blood pressure, antithrombotic drugs, treating carotid stenosis or atrial fibrillation) lowers it.": {
    "zh-CN": "脑卒中后再发生一次脑卒中。风险在最初几周到几个月最高，之后逐年累积；控制血压、抗血栓药物、治疗颈动脉狭窄或心房颤动等次级预防可以降低。",
    "de": "Ein weiterer Schlaganfall nach dem ersten. Das Risiko ist in den ersten Wochen bis Monaten am höchsten und summiert sich über die Jahre; Sekundärprävention (Blutdruck, antithrombotische Medikamente, Behandlung von Karotisstenose oder Vorhofflimmern) senkt es.",
    "ja": "初回後の新たな脳卒中。最初の数週から数か月でリスクが最も高く、その後も累積する。血圧管理、抗血栓薬、頸動脈狭窄や心房細動の治療などの二次予防で低下する。"
  },
  "cumulative risk 1 year after a first stroke (3.1 % at 30 days, 26.4 % at 5 years, 39.2 % at 10 years); about 9 % during the hospital stay": {
    "zh-CN": "首次脑卒中后 1 年的累积风险（30 天 3.1%，5 年 26.4%，10 年 39.2%）；住院期间约 9%",
    "de": "kumulatives Risiko 1 Jahr nach dem ersten Schlaganfall (3.1 % nach 30 Tagen, 26.4 % nach 5 Jahren, 39.2 % nach 10 Jahren); etwa 9 % während des Krankenhausaufenthalts",
    "ja": "初回脳卒中後 1 年の累積リスク（30 日は 3.1 %、5 年は 26.4 %、10 年は 39.2 %）；入院中は約 9 %"
  },
  "Estimates vary widely between studies, and the 5-year risk fell from 32 % to 16.2 % across them, which the authors relate to case mix and changes in secondary prevention (Mohan 2011). After a TIA or minor stroke assessed rapidly by stroke specialists the 1-year stroke risk was 5.1 %; multiple infarcts, large-artery atherosclerosis and an ABCD² score of 6–7 each more than doubled it (Amarenco 2016).": {
    "zh-CN": "各研究差异很大，较新的研究 5 年风险较低（32% 降到 16.2%），作者认为可能反映病人组成的差异与次级预防的改变（Mohan 2011）。在快速由脑卒中专科评估的 TIA 或轻微脑卒中病人，1 年脑卒中风险是 5.1%；多发性梗死、大动脉粥状硬化与 ABCD² 分数 6–7 分各让风险增加一倍以上（Amarenco 2016）。",
    "de": "Die Schätzungen unterscheiden sich stark zwischen Studien; das 5-Jahres-Risiko sank über die Studien hinweg von 32 % auf 16.2 %, was die Autoren mit Patientenstruktur und Veränderungen der Sekundärprävention erklären (Mohan 2011). Nach TIA oder leichtem Schlaganfall mit rascher fachärztlicher Beurteilung betrug das 1-Jahres-Schlaganfallrisiko 5.1 %; multiple Infarkte, Atherosklerose großer Arterien und ein ABCD²-Score von 6–7 erhöhten es jeweils auf mehr als das Doppelte (Amarenco 2016).",
    "ja": "推定値は研究間で大きく異なる。研究を通じて 5 年リスクは 32 % から 16.2 % に低下し、著者らは症例構成と二次予防の変化によると考えている（Mohan 2011）。脳卒中専門医が迅速に評価した TIA または軽症脳卒中後の 1 年リスクは 5.1 % で、多発梗塞、大血管アテローム硬化、ABCD² スコア 6–7 はそれぞれリスクを 2 倍超にした（Amarenco 2016）。"
  },
  "Movement disorders after stroke (hemichorea–hemiballism, dystonia)": {
    "zh-CN": "脑卒中后不自主运动（偏侧舞蹈—投掷症、肌张力异常）",
    "de": "Bewegungsstörungen nach Schlaganfall (Hemichorea–Hemiballismus, Dystonie)",
    "ja": "脳卒中後の運動異常症（片側舞踏運動・バリズム、ジストニア）"
  },
  "Involuntary movements after a stroke: flinging or writhing movements of the limbs on one side (hemichorea–hemiballism), sustained twisting postures (dystonia), less often tremor or jerks.": {
    "zh-CN": "脑卒中后出现的不自主运动：手脚不由自主地甩动或扭动（偏侧舞蹈—投掷症）、持续的扭转姿势（肌张力异常），较少见的还有颤抖或肌跃。",
    "de": "Unwillkürliche Bewegungen nach Schlaganfall: schleudernde oder windende Bewegungen der Extremitäten einer Seite (Hemichorea–Hemiballismus), anhaltende verdrehte Haltungen (Dystonie), seltener Tremor oder Zuckungen.",
    "ja": "脳卒中後の不随意運動。一側四肢の投げ出すような動きやくねる動き（片側舞踏運動・バリズム）、持続するねじれた姿勢（ジストニア）、より少ない振戦や急な筋収縮。"
  },
  "first strokes, during the acute phase or later (Lausanne Stroke Registry, 29 of 2500)": {
    "zh-CN": "首次脑卒中、急性期或之后才出现（洛桑脑卒中登录，2500 人中 29 人）",
    "de": "erste Schlaganfälle, in der akuten Phase oder später (Lausanne Stroke Registry, 29 von 2500)",
    "ja": "初回脳卒中、急性期またはその後（Lausanne Stroke Registry、2500 人中 29 人）"
  },
  "Mostly hemichorea–hemiballism and hemidystonia, after infarcts of the basal ganglia and adjacent white matter (middle or posterior cerebral artery territory); they usually regress — only 3 lasted beyond 6 months (Ghika-Schmid 1997). Hemiballism seldom involves the subthalamic nucleus itself and mostly has a benign course (Postuma 2003). After lateral thalamic strokes, involuntary movements (dystonia, athetosis, chorea, tremor) often appear only some time later (delayed onset), tied to severe position-sense loss and ataxia and becoming more evident as the weakness recovers (Kim 2001); 3 of 40 thalamic infarcts (Bogousslavsky 1988). Among published cases, lentiform (especially putaminal) lesions were often reported with dystonia and caudate lesions seldom with movement disorders (Bhatia 1994; reported cases, not incidence).": {
    "zh-CN": "最常见的是偏侧舞蹈—投掷症与偏侧肌张力异常，多在基底核与邻近白质（大脑中动脉或大脑后动脉区）梗死之后，大多会自行消退——超过 6 个月的只有 3 人（Ghika-Schmid 1997）。偏侧投掷症很少真正来自底丘脑核，多数预后良好（Postuma 2003）。外侧丘脑脑卒中后，不自主运动（肌张力异常、手足徐动、舞蹈、颤抖）常在脑卒中一段时间之后才出现，与严重的本体觉丧失和共济失调有关，无力恢复时反而更明显（Kim 2001）；40 例丘脑梗死中有 3 例（Bogousslavsky 1988）。文献病例中，豆状核（尤其壳核）病灶常伴肌张力异常，尾状核病灶则很少有运动障碍（Bhatia 1994；为已发表病例，不能当作发生率）。",
    "de": "Meist Hemichorea–Hemiballismus und Hemidystonie nach Infarkten der Basalganglien und angrenzenden weißen Substanz (Versorgungsgebiet der Arteria cerebri media oder posterior); meist bilden sie sich zurück — nur 3 dauerten länger als 6 Monate (Ghika-Schmid 1997). Hemiballismus betrifft selten den Nucleus subthalamicus selbst und verläuft meist gutartig (Postuma 2003). Nach lateralen Thalamusinfarkten treten unwillkürliche Bewegungen (Dystonie, Athetose, Chorea, Tremor) oft erst verzögert auf, verbunden mit starkem Verlust des Lagesinns und Ataxie; sie werden bei Rückbildung der Schwäche deutlicher (Kim 2001); 3 von 40 Thalamusinfarkten (Bogousslavsky 1988). Unter veröffentlichten Fällen wurden lentiforme (besonders putaminale) Läsionen häufig mit Dystonie und Kaudatusläsionen selten mit Bewegungsstörungen beschrieben (Bhatia 1994; Fallberichte, keine Inzidenz).",
    "ja": "主に大脳基底核と隣接白質（中大脳動脈または後大脳動脈領域）の梗塞後の片側舞踏運動・バリズムと片側ジストニアで、通常は軽快する。6 か月を超えて持続したのは 3 人のみだった（Ghika-Schmid 1997）。片側バリズムは視床下核自体を侵すことが少なく、経過は多くが良好である（Postuma 2003）。外側視床梗塞後の不随意運動（ジストニア、アテトーゼ、舞踏運動、振戦）は遅れて出現することが多く、重度の位置覚障害と失調に関連し、筋力低下の回復とともに目立つ（Kim 2001）；視床梗塞 40 人中 3 人（Bogousslavsky 1988）。報告例ではレンズ核、特に被殻の病変とジストニアが多く、尾状核病変と運動異常症は少なかった（Bhatia 1994；症例報告であり発症率ではない）。"
  },
  "Recanalisation of distal occlusions (M3, ACA and PCA reported together) after IV thrombolysis alone: INTERRSeCT 17/40 (42.5%, rAOL 2b–3); a single, small group.": {
    "zh-CN": "仅静脉血栓溶解后远端阻塞（M3、ACA、PCA 合并报告）再通的比例：INTERRSeCT 17/40（42.5%，rAOL 2b–3），单一研究、人数少。",
    "de": "Rekanalisation distaler Verschlüsse (M3, ACA und PCA zusammen berichtet) nach alleiniger IV-Thrombolyse: INTERRSeCT 17/40 (42.5%, rAOL 2b–3); eine einzelne kleine Gruppe.",
    "ja": "静脈内血栓溶解療法のみの後の遠位閉塞（M3、ACA、PCA をまとめた報告）の再開通：INTERRSeCT 17/40（42.5%、rAOL 2b–3）；単一の少数群。"
  },
  "Reperfusion of > 50% of the territory, or no retrievable clot, at the first angiogram in ICA, M1 or basilar occlusions due for thrombectomy: tenecteplase 22% vs alteplase 10% (EXTEND-IA TNK, within 4.5 h); symptomatic haemorrhage 1% in each group.": {
    "zh-CN": "准备取栓的 ICA、M1 或基底动脉阻塞，在第一张血管造影时已有 > 50% 再灌注或已无可取血栓：tenecteplase 22%，alteplase 10%（EXTEND-IA TNK，4.5 小时内）；症状性出血两组都是 1%。",
    "de": "Reperfusion von > 50% des Versorgungsgebiets oder kein bergbarer Thrombus bei der ersten Angiografie vor geplanter Thrombektomie bei ICA-, M1- oder Basilarisverschlüssen: Tenecteplase 22% gegenüber Alteplase 10% (EXTEND-IA TNK, innerhalb von 4.5 h); symptomatische Blutung jeweils 1%.",
    "ja": "血栓回収予定の ICA、M1、脳底動脈閉塞で、初回血管造影時に領域の > 50% が再灌流、または回収可能な血栓がない割合：テネクテプラーゼ 22%、アルテプラーゼ 10%（EXTEND-IA TNK、4.5 h 以内）；症候性出血は両群 1%。"
  },
  "Reocclusion of a recanalised M1/M2 during transcranial Doppler monitoring up to 2 h after IV alteplase: 34% of any recanalisation (16/47); 22% after complete and 41% (12/29) after partial recanalisation. 60 patients.": {
    "zh-CN": "静脉 alteplase 后已再通的 M1／M2 在 2 小时内经颅多普勒监测下再阻塞的比例：任何再通者 34%（16/47），完全再通者 22%，部分再通者 41%（29 位中 12 位）。共 60 位病人。",
    "de": "Reokklusion einer rekanalisierten M1/M2 während transkranieller Dopplerüberwachung bis 2 h nach IV-Alteplase: 34% aller Rekanalisationen (16/47); 22% nach vollständiger und 41% (12/29) nach partieller Rekanalisation. 60 Patienten.",
    "ja": "静注アルテプラーゼ後 2 h までの経頭蓋ドプラ監視中に、再開通した M1/M2 が再閉塞：再開通全体の 34%（16/47）；完全再開通後 22%、部分再開通後 41%（12/29）。60 人。"
  },
  "Reocclusion on follow-up imaging after successful thrombectomy (mTICI 2b–3): prospective cohort 2.3% (16/711, 24–48 h); Lausanne registry 6.6% (28/423, 24 h, anterior and posterior circulation).": {
    "zh-CN": "取栓成功（mTICI 2b–3）后 24–48 小时追踪影像上的再阻塞：前瞻性队列 2.3%（16/711，24–48 小时）；Lausanne 登记 6.6%（28/423，24 小时，含前后循环）。",
    "de": "Reokklusion in der Verlaufskontrolle nach erfolgreicher Thrombektomie (mTICI 2b–3): prospektive Kohorte 2.3% (16/711, 24–48 h); Lausanne-Register 6.6% (28/423, 24 h, vordere und hintere Zirkulation).",
    "ja": "血栓回収成功（mTICI 2b–3）後の追跡画像での再閉塞：前向きコホート 2.3%（16/711、24–48 h）；Lausanne レジストリ 6.6%（28/423、24 h、前方・後方循環）。"
  },
  "Surfaces of the cerebrum, cerebellum, brainstem and deep nuclei (marching-cubes meshes, decimated).": {
    "zh-CN": "大脑、小脑、脑干与深部核团的 3D 表面（由概率图与分割结果以 marching cubes 产生、简化）。",
    "de": "Oberflächen von Großhirn, Kleinhirn, Hirnstamm und tiefen Kernen (reduzierte Marching-Cubes-Netze).",
    "ja": "大脳、小脳、脳幹、深部核の表面（marching-cubes メッシュを簡略化）。"
  },
  "Cortical gyral parcellation (assigns each surface point to a functional region).": {
    "zh-CN": "皮质脑回分区（决定每个表面点属于哪个功能脑区）。",
    "de": "Parzellierung der kortikalen Gyri (ordnet jeden Oberflächenpunkt einer funktionellen Region zu).",
    "ja": "大脳皮質の脳回区分（各表面点を機能領域に割り当てる）。"
  },
  "Segmentation of deep nuclei, brainstem and cerebellum.": {
    "zh-CN": "深部构造（丘脑、尾状核、壳核、苍白球、海马、杏仁体）与脑干、小脑的分割。",
    "de": "Segmentierung tiefer Kerne, des Hirnstamms und des Kleinhirns.",
    "ja": "深部核、脳幹、小脳のセグメンテーション。"
  },
  "Splits the thalamus into anterior, paramedian, ventrolateral and posterior vascular territories.": {
    "zh-CN": "把丘脑分成前部、旁正中、腹外侧、后部等血管供应区。",
    "de": "Unterteilt den Thalamus in anteriore, paramediane, ventrolaterale und posteriore vaskuläre Versorgungsgebiete.",
    "ja": "視床を前部、傍正中部、腹外側部、後部の血管支配領域に分ける。"
  },
  "Arterial territory of every tissue voxel (ACA, MCA and PCA subdivisions, lenticulostriate, choroidal, cerebellar), and the border zones between them.": {
    "zh-CN": "每个脑组织体素的动脉供应区（大脑前动脉（ACA）、大脑中动脉（MCA）、大脑后动脉（PCA）各分部、豆纹、脉络丛、小脑动脉），并据此找出分水岭区。",
    "de": "Arterielles Versorgungsgebiet jedes Gewebevoxels (ACA-, MCA- und PCA-Untergebiete, lentikulostriatale, choroidale und Kleinhirngebiete) und die Grenzzonen dazwischen.",
    "ja": "各組織ボクセルの動脈支配領域（ACA、MCA、PCA の区分、線条体、脈絡叢、小脳の領域）と、その間の境界領域。"
  },
  "Snaps hand-authored centrelines onto statistically real artery positions (circle of Willis, basilar, vertebral, M1, A1/A2, P1/P2 …).": {
    "zh-CN": "把手绘的血管中心线校正到统计上真实的血管位置（Willis 环、基底动脉、椎动脉、M1、A1/A2、P1/P2 等）。",
    "de": "Passt handgezeichnete Mittellinien an statistisch ermittelte reale Arterienpositionen an (Circulus arteriosus cerebri, Arteria basilaris, Arteria vertebralis, M1, A1/A2, P1/P2 …).",
    "ja": "手描きの中心線を統計的な実際の動脈位置に合わせる（ウィリス動脈輪、脳底動脈、椎骨動脈、M1、A1/A2、P1/P2 …）。"
  },
  "Vessel radii/lengths of its Alastruey 2007 circle-of-Willis model used as reference; no code copied.": {
    "zh-CN": "参考其 Alastruey 2007 Willis 环模型的血管半径与长度；未复制程式码。",
    "de": "Gefäßradien und -längen des Circulus-arteriosus-cerebri-Modells nach Alastruey 2007 dienen als Referenz; kein Code wurde übernommen.",
    "ja": "Alastruey 2007 のウィリス動脈輪モデルの血管半径・長さを参照した。コードの転載なし。"
  },
  "Inspired the teaching presentation of autoregulation, steal and collaterals; concepts only — no code used (licence incompatible).": {
    "zh-CN": "启发了自动调节、窃血与侧支的教学呈现方式；因授权不相容，只参考概念、未使用任何程式码。",
    "de": "Inspirierte die didaktische Darstellung von Autoregulation, Steal und Kollateralen; nur Konzepte — kein Code verwendet (inkompatible Lizenz).",
    "ja": "自動調節、盗血、側副血行の教育的な説明に着想を得た。概念のみで、ライセンスが適合しないためコードは使用していない。"
  },
  "Its brainstem syndrome cards and attribution practice informed ours.": {
    "zh-CN": "参考其脑干综合征卡片与资料来源标示方式。",
    "de": "Die Karten zu Hirnstammsyndromen und die Quellenangaben beeinflussten unsere Darstellung.",
    "ja": "脳幹症候群のカードと出典明示の方法を参考にした。"
  },
  "Its region–artery mapping and stroke-simulator ideas informed ours; its 3D model (CC BY-SA 2.1 JP) is not used here.": {
    "zh-CN": "参考其脑区—动脉对照与脑卒中模拟的教学构想；其 3D 模型为 CC BY-SA 2.1 JP，本专案未使用。",
    "de": "Die Zuordnung von Regionen zu Arterien und die Ideen zur Schlaganfallsimulation beeinflussten unsere Darstellung; das 3D-Modell (CC BY-SA 2.1 JP) wird hier nicht verwendet.",
    "ja": "領域と動脈の対応および脳卒中シミュレータの考え方を参考にした。3D モデル（CC BY-SA 2.1 JP）は使用していない。"
  },
  "ACA": {
    "zh-CN": "大脑前动脉（ACA）",
    "de": "ACA",
    "ja": "ACA"
  },
  "Medial lenticulostriate": {
    "zh-CN": "内侧豆纹动脉",
    "de": "Mediale lentikulostriatale Arterien",
    "ja": "内側線条体動脈"
  },
  "Lateral lenticulostriate": {
    "zh-CN": "外侧豆纹动脉",
    "de": "Laterale lentikulostriatale Arterien",
    "ja": "外側線条体動脈"
  },
  "MCA frontal": {
    "zh-CN": "大脑中动脉（MCA）（额叶部）",
    "de": "MCA frontal",
    "ja": "MCA 前頭葉"
  },
  "MCA parietal": {
    "zh-CN": "大脑中动脉（MCA）（顶叶部）",
    "de": "MCA parietal",
    "ja": "MCA 頭頂葉"
  },
  "MCA temporal": {
    "zh-CN": "大脑中动脉（MCA）（颞叶部）",
    "de": "MCA temporal",
    "ja": "MCA 側頭葉"
  },
  "MCA occipital": {
    "zh-CN": "大脑中动脉（MCA）（枕叶部）",
    "de": "MCA okzipital",
    "ja": "MCA 後頭葉"
  },
  "MCA insular": {
    "zh-CN": "大脑中动脉（MCA）（岛叶部）",
    "de": "MCA insulär",
    "ja": "MCA 島葉"
  },
  "PCA temporal": {
    "zh-CN": "大脑后动脉（PCA）（颞叶部）",
    "de": "PCA temporal",
    "ja": "PCA 側頭葉"
  },
  "PCA occipital": {
    "zh-CN": "大脑后动脉（PCA）（枕叶部）",
    "de": "PCA okzipital",
    "ja": "PCA 後頭葉"
  },
  "Posterior choroidal & thalamoperforators": {
    "zh-CN": "脉络丛后动脉与丘脑穿通动脉",
    "de": "Posteriore choroidale Arterien und thalamoperforierende Arterien",
    "ja": "後脈絡叢動脈・視床貫通動脈"
  },
  "Anterior choroidal": {
    "zh-CN": "脉络丛前动脉",
    "de": "Arteria choroidea anterior",
    "ja": "前脈絡叢動脈"
  },
  "Basilar perforators": {
    "zh-CN": "基底动脉穿通支",
    "de": "Perforatoren der Arteria basilaris",
    "ja": "脳底動脈穿通枝"
  },
  "Superior cerebellar": {
    "zh-CN": "小脑上动脉",
    "de": "Arteria superior cerebelli",
    "ja": "上小脳動脈"
  },
  "Inferior cerebellar (PICA/AICA)": {
    "zh-CN": "小脑下动脉（PICA／AICA）",
    "de": "Untere Kleinhirnarterien (PICA/AICA)",
    "ja": "下小脳動脈（PICA/AICA）"
  },
  "Unassigned": {
    "zh-CN": "未分类",
    "de": "Nicht zugeordnet",
    "ja": "未割り当て"
  },
  "Onset": {
    "zh-CN": "发生时",
    "de": "Beginn",
    "ja": "発症時"
  },
  "15 min": {
    "zh-CN": "15 分",
    "de": "15 min",
    "ja": "15 分"
  },
  "30 min": {
    "zh-CN": "30 分",
    "de": "30 min",
    "ja": "30 分"
  },
  "1 h": {
    "zh-CN": "1 小时",
    "de": "1 h",
    "ja": "1 時間"
  },
  "2 h": {
    "zh-CN": "2 小时",
    "de": "2 h",
    "ja": "2 時間"
  },
  "3 h": {
    "zh-CN": "3 小时",
    "de": "3 h",
    "ja": "3 時間"
  },
  "4.5 h": {
    "zh-CN": "4.5 小时",
    "de": "4.5 h",
    "ja": "4.5 時間"
  },
  "6 h": {
    "zh-CN": "6 小时",
    "de": "6 h",
    "ja": "6 時間"
  },
  "12 h": {
    "zh-CN": "12 小时",
    "de": "12 h",
    "ja": "12 時間"
  },
  "1 day": {
    "zh-CN": "1 天",
    "de": "1 Tag",
    "ja": "1 日"
  },
  "2 days": {
    "zh-CN": "2 天",
    "de": "2 Tage",
    "ja": "2 日"
  },
  "3 days": {
    "zh-CN": "3 天",
    "de": "3 Tage",
    "ja": "3 日"
  },
  "5 days": {
    "zh-CN": "5 天",
    "de": "5 Tage",
    "ja": "5 日"
  },
  "1 week": {
    "zh-CN": "1 周",
    "de": "1 Woche",
    "ja": "1 週間"
  },
  "2 weeks": {
    "zh-CN": "2 周",
    "de": "2 Wochen",
    "ja": "2 週間"
  },
  "1 month": {
    "zh-CN": "1 个月",
    "de": "1 Monat",
    "ja": "1 か月"
  },
  "3 months": {
    "zh-CN": "3 个月",
    "de": "3 Monate",
    "ja": "3 か月"
  },
  "6 months": {
    "zh-CN": "6 个月",
    "de": "6 Monate",
    "ja": "6 か月"
  },
  "Hyperacute (0–6 h)": {
    "zh-CN": "超急性期（0–6 小时）",
    "de": "Hyperakut (0–6 h)",
    "ja": "超急性期（0–6 h）"
  },
  "Acute (6 h–1 week)": {
    "zh-CN": "急性期（6 小时–1 周）",
    "de": "Akut (6 h–1 Woche)",
    "ja": "急性期（6 h–1 週間）"
  },
  "Subacute (1–4 weeks)": {
    "zh-CN": "亚急性期（1–4 周）",
    "de": "Subakut (1–4 Wochen)",
    "ja": "亜急性期（1–4 週間）"
  },
  "Chronic (> 1 month)": {
    "zh-CN": "慢性期（1 个月以上）",
    "de": "Chronisch (> 1 Monat)",
    "ja": "慢性期（> 1 か月）"
  },
  "Consciousness": {
    "zh-CN": "意识",
    "de": "Bewusstsein",
    "ja": "意識"
  },
  "Motor": {
    "zh-CN": "运动",
    "de": "Motorik",
    "ja": "運動"
  },
  "Sensation": {
    "zh-CN": "感觉",
    "de": "Sensibilität",
    "ja": "感覚"
  },
  "Language": {
    "zh-CN": "语言",
    "de": "Sprache",
    "ja": "言語"
  },
  "Vision": {
    "zh-CN": "视觉",
    "de": "Sehen",
    "ja": "視覚"
  },
  "Eye movements": {
    "zh-CN": "眼球运动",
    "de": "Augenbewegungen",
    "ja": "眼球運動"
  },
  "Cranial nerves (face, swallowing, hearing)": {
    "zh-CN": "脑神经（脸、吞咽、听觉）",
    "de": "Hirnnerven (Gesicht, Schlucken, Hören)",
    "ja": "脳神経（顔面・嚥下・聴覚）"
  },
  "Balance & coordination": {
    "zh-CN": "平衡与协调",
    "de": "Gleichgewicht und Koordination",
    "ja": "平衡・協調運動"
  },
  "Cognition & behaviour": {
    "zh-CN": "认知与行为",
    "de": "Kognition und Verhalten",
    "ja": "認知・行動"
  },
  "Mood & emotional expression": {
    "zh-CN": "情绪与情感表达",
    "de": "Stimmung und Emotionsausdruck",
    "ja": "気分・情動表出"
  },
  "Sleep & breathing in sleep": {
    "zh-CN": "睡眠与睡眠中的呼吸",
    "de": "Schlaf und Atmung im Schlaf",
    "ja": "睡眠・睡眠中の呼吸"
  },
  "Autonomic": {
    "zh-CN": "自主神经",
    "de": "Autonomes Nervensystem",
    "ja": "自律神経"
  },
  "Temperature regulation & sweating": {
    "zh-CN": "体温调节与出汗",
    "de": "Temperaturregulation und Schwitzen",
    "ja": "体温調節・発汗"
  },
  "Limb circulation": {
    "zh-CN": "肢体血流",
    "de": "Extremitätendurchblutung",
    "ja": "四肢血流"
  },
  "This case has arm weakness; lost or impaired arm movement is associated with a higher risk of shoulder pain.": {
    "zh-CN": "此病例有手臂无力；手臂动作丧失或变差与较高的脑卒中后肩膀痛风险相关。",
    "de": "Dieser Fall zeigt Armschwäche; verlorene oder eingeschränkte Armbeweglichkeit ist mit höherem Schulterschmerzrisiko verbunden.",
    "ja": "この症例には上肢筋力低下がある。上肢運動の消失・障害は肩痛のリスク上昇と関連する。"
  },
  "Early on this case has limb weakness with a visual field defect or dysphagia; these are associated with a higher risk of incontinence after stroke.": {
    "zh-CN": "此病例早期有肢体无力，加上视野缺损或吞咽困难；这些都与较高的脑卒中后尿失禁风险相关。",
    "de": "Dieser Fall zeigt früh Extremitätenschwäche mit Gesichtsfeldausfall oder Dysphagie; dies ist mit höherem Inkontinenzrisiko nach Schlaganfall verbunden.",
    "ja": "この症例は早期に四肢筋力低下と視野欠損または嚥下障害を示す。これらは脳卒中後尿失禁のリスク上昇と関連する。"
  },
  "Early on this case has dysphagia; dysphagia is associated with a higher risk of pneumonia.": {
    "zh-CN": "此病例早期有吞咽困难；吞咽困难与较高的肺炎风险相关。",
    "de": "Dieser Fall zeigt früh Dysphagie; Dysphagie ist mit höherem Pneumonierisiko verbunden.",
    "ja": "この症例は早期に嚥下障害を示す。嚥下障害は肺炎のリスク上昇と関連する。"
  },
  "This case is left with a moderate or worse neurological deficit; greater stroke severity and disability are associated with a higher risk of depression.": {
    "zh-CN": "此病例最后仍留有中度以上的神经缺损；脑卒中较严重、残疾较多，都与较高的脑卒中后抑郁风险相关。",
    "de": "In diesem Fall bleibt ein mindestens mittelschweres neurologisches Defizit; stärkere Schlaganfallschwere und Behinderung sind mit höherem Depressionsrisiko verbunden.",
    "ja": "この症例には中等度以上の神経学的障害が残る。重症な脳卒中と障害はうつ病のリスク上昇と関連する。"
  },
  "This case leaves a cognitive deficit; cognitive impairment is associated with a higher risk of depression.": {
    "zh-CN": "此病例留下认知方面的缺损；认知障碍与较高的脑卒中后抑郁风险相关。",
    "de": "In diesem Fall bleibt ein kognitives Defizit; kognitive Beeinträchtigung ist mit höherem Depressionsrisiko verbunden.",
    "ja": "この症例には認知機能障害が残る。認知機能障害はうつ病のリスク上昇と関連する。"
  },
  "This case’s infarct involves the basal ganglia or the lateral thalamus; infarcts there are associated with a higher risk of post-stroke movement disorders, which still remain uncommon and mostly regress.": {
    "zh-CN": "此病例的梗死涉及基底核或外侧丘脑；这些部位的梗死与较高的脑卒中后不自主运动风险相关，但它仍不常见，多半会消退。",
    "de": "Der Infarkt dieses Falls betrifft die Basalganglien oder den lateralen Thalamus; Infarkte dort sind mit höherem Risiko für Bewegungsstörungen nach Schlaganfall verbunden, die dennoch selten bleiben und sich meist zurückbilden.",
    "ja": "この症例の梗塞は大脳基底核または外側視床を含む。これらの梗塞は脳卒中後運動異常症のリスク上昇と関連するが、それでも頻度は低く、多くは軽快する。"
  },
  "This case’s infarct lies at a site linked to emotionalism (the lentiform nucleus and internal capsule, the ventral pons or the frontal lobe), so the symptom list names it as possible; lesions there are associated with a higher risk, though not everyone develops it.": {
    "zh-CN": "此病例的梗死位在与病理性哭笑较有关的部位（豆状核—内囊、脑桥腹侧或额叶），所以症状清单把它列为「可能出现」；这些部位的病灶与较高的风险相关，但仍不是每个人都会出现。",
    "de": "Der Infarkt dieses Falls liegt an einem mit emotionaler Labilität verbundenen Ort (Nucleus lentiformis und Capsula interna, ventrale Brücke oder Frontallappen); deshalb nennt die Symptomliste sie als Möglichkeit. Läsionen dort sind mit höherem Risiko verbunden, aber nicht alle Betroffenen entwickeln sie.",
    "ja": "この症例の梗塞は情動失禁と関連する部位（レンズ核と内包、橋腹側部、前頭葉）にあるため、症状欄に可能性を示す。これらの病変ではリスクが高いが、全員に発症するわけではない。"
  },
  "This case leaves a cognitive deficit; cognitive impairment is more common in people with apathy after stroke.": {
    "zh-CN": "此病例留下认知方面的缺损；脑卒中后有冷漠的人较常合并认知障碍。",
    "de": "In diesem Fall bleibt ein kognitives Defizit; kognitive Beeinträchtigung ist bei Menschen mit Apathie nach Schlaganfall häufiger.",
    "ja": "この症例には認知機能障害が残る。認知機能障害は脳卒中後アパシーのある人に多い。"
  }
} satisfies ContentTranslations;

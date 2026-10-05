/**
 * Problems that are common after a stroke but that the lesion site does not determine, or only
 * weakly: depression, anxiety, fatigue, insomnia, sleep-disordered breathing, apathy … — and an
 * uncommon one that a lesion site makes possible but cannot predict, the post-stroke movement
 * disorders (about 1 %; C6-F3).
 *
 * The tissue model cannot tell who will develop them, so they are shown as population figures
 * beside the outcome — how often they occur after a stroke and what is known to raise the risk —
 * never as symptoms of the simulated case, never in the NIHSS or the deficit counts.
 */
import type { L, SymptomSystem } from './types';

export interface PostStrokeRisk {
  id: string;
  /** the function it belongs to (for grouping with the case's symptoms) */
  system: SymptomSystem;
  name: L;
  /** what it is, in plain language */
  desc: L;
  /**
   * share of stroke survivors affected (0–1), from a systematic review or meta-analysis; `low` /
   * `high` are its confidence interval or range when reported
   */
  prevalence: { value: number; low?: number; high?: number };
  /** when after the stroke the figure applies, e.g. "within the first year" */
  window: L;
  /** factors with consistent evidence, and what is (or is not) known about the lesion site */
  factors: L;
  /** citations, each exactly as listed in SCIENTIFIC_REFERENCES (sources.ts) */
  sources: string[];
  /** when it typically starts, hours after the stroke (to place it along the course) */
  typicalOnsetH: number;
}

// ── citations (each also in SCIENTIFIC_REFERENCES; the figures were checked against the abstracts) ──
const HACKETT_2014 =
  'Hackett ML, Pickles K. Part I: frequency of depression after stroke: an updated systematic review and meta-analysis of observational studies. Int J Stroke 2014;9:1017–1025.';
const AYERBE_2013 = 'Ayerbe L et al. Natural history, predictors and outcomes of depression after stroke: systematic review and meta-analysis. Br J Psychiatry 2013;202:14–21.';
const CARSON_2000 = 'Carson AJ et al. Depression after stroke and lesion location: a systematic review. Lancet 2000;356:122–126.';
const KNAPP_2020 = 'Knapp P et al. Frequency of anxiety after stroke: an updated systematic review and meta-analysis of observational studies. Int J Stroke 2020;15:244–255.';
const WRIGHT_2017 = 'Wright F et al. Factors associated with poststroke anxiety: a systematic review and meta-analysis. Stroke Res Treat 2017;2017:2124743.';
const CUMMING_2016 = 'Cumming TB et al. The prevalence of fatigue after stroke: a systematic review and meta-analysis. Int J Stroke 2016;11:968–977.';
const KUTLUBAEV_2012 = 'Kutlubaev MA, Duncan FH, Mead GE. Biological correlates of post-stroke fatigue: a systematic review. Acta Neurol Scand 2012;125:219–227.';
const BAYLAN_2020 = 'Baylan S et al. Incidence and prevalence of post-stroke insomnia: a systematic review and meta-analysis. Sleep Med Rev 2020;49:101222.';
const SEILER_2019 = 'Seiler A et al. Prevalence of sleep-disordered breathing after stroke and TIA: a meta-analysis. Neurology 2019;92:e648–e654.';
const JOHNSON_2010 = 'Johnson KG, Johnson DC. Frequency of sleep apnea in stroke and TIA patients: a meta-analysis. J Clin Sleep Med 2010;6:131–137.';
const YAGGI_2005 = 'Yaggi HK et al. Obstructive sleep apnea as a risk factor for stroke and death. N Engl J Med 2005;353:2034–2041.';
const CAEIRO_2013 = 'Caeiro L, Ferro JM, Costa J. Apathy secondary to stroke: a systematic review and meta-analysis. Cerebrovasc Dis 2013;35:23–39.';
const GILLESPIE_2016 =
  'Gillespie DC et al. Prevalence of pseudobulbar affect following stroke: a systematic review and meta-analysis. J Stroke Cerebrovasc Dis 2016;25:688–694.';
const BROOMFIELD_2024 = 'Broomfield NM et al. Post-stroke emotionalism: diagnosis, pathophysiology, and treatment. Int J Stroke 2024;19:857–866.';
const PENDLEBURY_2009 =
  'Pendlebury ST, Rothwell PM. Prevalence, incidence, and factors associated with pre-stroke and post-stroke dementia: a systematic review and meta-analysis. Lancet Neurol 2009;8:1006–1018.';
const GHIKA_SCHMID_1997 =
  'Ghika-Schmid F, Ghika J, Regli F, Bogousslavsky J. Hyperkinetic movement disorders during and after acute stroke: the Lausanne Stroke Registry. J Neurol Sci 1997;146:109–116.';
const KIM_2001 = 'Kim JS. Delayed onset mixed involuntary movements after thalamic stroke: clinical, radiological and pathophysiological findings. Brain 2001;124:299–309.';
const BOGOUSSLAVSKY_1988 = 'Bogousslavsky J, Regli F, Uske A. Thalamic infarcts: clinical syndromes, etiology, and prognosis. Neurology 1988;38:837–848.';
const POSTUMA_2003 = 'Postuma RB, Lang AE. Hemiballism: revisiting a classic disorder. Lancet Neurol 2003;2:661–668.';
const BHATIA_1994 = 'Bhatia KP, Marsden CD. The behavioural and motor consequences of focal lesions of the basal ganglia in man. Brain 1994;117:859–876.';

/**
 * Pooled figures from systematic reviews / meta-analyses. Each `prevalence` is the review's own
 * pooled estimate with its 95 % confidence interval; `window` says which time after the stroke
 * (and, where it matters, which measure) the figure belongs to. `typicalOnsetH` is a rough
 * placement along the course (when the reviews first measure it), not a modelled onset.
 */
export const POST_STROKE_RISKS: PostStrokeRisk[] = [
  {
    id: 'depression',
    system: 'mood',
    name: { zh: '中風後憂鬱', en: 'Post-stroke depression' },
    desc: {
      zh: '持續的情緒低落、失去興趣或樂趣，常伴隨睡眠、食慾與活力的改變；會拖慢復健，可以篩檢與治療。',
      en: 'Persistent low mood or loss of interest and pleasure, often with changes in sleep, appetite and energy; it slows rehabilitation and can be screened for and treated.',
    },
    prevalence: { value: 0.31, low: 0.28, high: 0.35 },
    window: {
      zh: '中風後任一時間點的合併估計（1–5 年間約 25%）',
      en: 'pooled over assessments at any time after the stroke (about 25 % between 1 and 5 years)',
    },
    factors: {
      zh: '一致的預測因子：失能、中風前就有憂鬱、認知障礙、中風嚴重度與焦慮（Ayerbe 2013；該回顧的盛行率為 29%，5 年內累積發生率 39–52%）。病灶位置：系統性回顧不支持「左半球或左前方病灶較易憂鬱」的假說（左對右相對風險 0.95，95% CI 0.83–1.10；Carson 2000）。',
      en: 'Consistent predictors: disability, depression before the stroke, cognitive impairment, stroke severity and anxiety (Ayerbe 2013; prevalence 29 % in that review, cumulative incidence 39–52 % within 5 years). Lesion site: a systematic review found no support for more depression after left-hemisphere or left anterior lesions (left vs right relative risk 0.95, 95% CI 0.83–1.10; Carson 2000).',
    },
    sources: [HACKETT_2014, AYERBE_2013, CARSON_2000],
    typicalOnsetH: 720,
  },
  {
    id: 'anxiety',
    system: 'mood',
    name: { zh: '中風後焦慮', en: 'Anxiety after stroke' },
    desc: {
      zh: '過度擔心、緊張或恐慌（例如害怕再次中風、害怕跌倒），干擾日常生活與復健。',
      en: 'Excessive worry, tension or panic (for example fear of another stroke or of falling) that interferes with daily life and rehabilitation.',
    },
    prevalence: { value: 0.187, low: 0.125, high: 0.249 },
    window: {
      zh: '以診斷性會談判定（用評量表則約 24%）；到中風後 24 個月都沒有明顯下降',
      en: 'by diagnostic interview (about 24 % by rating scale); not meaningfully lower up to 24 months after the stroke',
    },
    factors: {
      zh: '最一致的關聯是中風後憂鬱（勝算比 4.66，95% CI 2.23–9.74）；睡眠困擾、疲勞與中風前的焦慮也有關聯，但研究較少（Wright 2017）。這兩篇回顧都沒有把焦慮歸因於特定病灶位置。',
      en: 'Most consistently associated with post-stroke depression (odds ratio 4.66, 95% CI 2.23–9.74); poor sleep, fatigue and anxiety before the stroke are also associated, from fewer studies (Wright 2017). Neither review ties anxiety to a lesion site.',
    },
    sources: [KNAPP_2020, WRIGHT_2017],
    typicalOnsetH: 336,
  },
  {
    id: 'apathy',
    system: 'mood',
    name: { zh: '冷漠（動機缺乏）', en: 'Apathy' },
    desc: {
      zh: '主動性與動機降低：對事情提不起勁、不主動開始活動，但不一定感到悲傷——與憂鬱不同，兩者也可能同時存在。',
      en: 'Reduced initiative and motivation: little drive to start things, without necessarily feeling sad — distinct from depression, though the two can coexist.',
    },
    prevalence: { value: 0.363, low: 0.303, high: 0.428 },
    window: {
      zh: '急性期與急性期後相近（39.5% 與 34.3%）',
      en: 'similar in the acute and post-acute phases (39.5 % and 34.3 %)',
    },
    factors: {
      zh: '有冷漠的病人平均年長約 2.7 歲，較常合併憂鬱（勝算比 2.29）與認知障礙（勝算比 2.90）；缺血性與出血性中風、左側與右側半球病灶的比率相近（Caeiro 2013）。',
      en: 'People with apathy were on average about 2.7 years older and more often depressed (odds ratio 2.29) and cognitively impaired (odds ratio 2.90); rates were similar after ischaemic and haemorrhagic stroke and after left- and right-hemisphere lesions (Caeiro 2013).',
    },
    sources: [CAEIRO_2013],
    typicalOnsetH: 24,
  },
  {
    id: 'emotionalism',
    system: 'mood',
    name: { zh: '中風後情緒失控（病理性哭笑）', en: 'Post-stroke emotionalism (pathological crying or laughing)' },
    desc: {
      zh: '突然、難以控制的哭泣（較常見）或大笑，與當下的感受不相稱。',
      en: 'Sudden, hard-to-control crying (the commoner form) or laughing, out of proportion to what the person feels.',
    },
    prevalence: { value: 0.2, low: 0.14, high: 0.29 },
    window: {
      zh: '中風後 1–6 個月（1 個月內 17%，6 個月後 12%）',
      en: '1–6 months after the stroke (17 % within the first month, 12 % beyond 6 months)',
    },
    factors: {
      zh: '整體頻率見 Gillespie 2016。與上面幾項不同，越來越多證據指向與情緒表達或調節有關的特定腦區、其連結路徑與血清素系統受損（Broomfield 2024 敘述性回顧），所以部分病灶位置確實比較容易出現；這裡列的是所有中風的整體比率。',
      en: 'Overall frequency from Gillespie 2016. Unlike the items above, growing evidence points to damage to specific areas and pathways for emotional expression or regulation and to serotonin pathways (Broomfield 2024, narrative review), so some lesion sites do make it more likely; the figure here is for all strokes.',
    },
    sources: [GILLESPIE_2016, BROOMFIELD_2024],
    typicalOnsetH: 168,
  },
  {
    id: 'fatigue',
    system: 'sleep',
    name: { zh: '中風後疲勞', en: 'Post-stroke fatigue' },
    desc: {
      zh: '與活動量不成比例、休息後也不太改善的疲倦與精力不足。',
      en: 'Tiredness and lack of energy out of proportion to activity, and not much relieved by rest.',
    },
    prevalence: { value: 0.5, low: 0.43, high: 0.57 },
    window: {
      zh: '以疲勞嚴重度量表（FSS ≥ 4）判定，各時間點合併；亞洲研究較低（35%）',
      en: 'by the Fatigue Severity Scale (≥ 4), pooled over time points; lower in Asian studies (35 %)',
    },
    factors: {
      zh: '研究間差異很大，憂鬱狀態與中風後時間都無法解釋（Cumming 2016）。與白質病變、腦萎縮或中風類型無關；病灶位置的證據不一致——13 篇研究中有 4 篇發現與天幕下（尤其腦幹）或基底核中風有關（Kutlubaev 2012）。',
      en: 'Estimates vary widely between studies, and neither depression nor time since stroke explained it (Cumming 2016). No association with white-matter lesions, brain atrophy or stroke type; evidence on lesion site is inconclusive — 4 of 13 studies linked it to infratentorial (especially brainstem) or basal ganglia strokes (Kutlubaev 2012).',
    },
    sources: [CUMMING_2016, KUTLUBAEV_2012],
    typicalOnsetH: 168,
  },
  {
    id: 'insomnia',
    system: 'sleep',
    name: { zh: '失眠', en: 'Insomnia' },
    desc: {
      zh: '難以入睡、睡不久或太早醒，白天因此受影響。',
      en: 'Difficulty falling asleep, staying asleep or waking too early, with effects during the day.',
    },
    prevalence: { value: 0.382, low: 0.301, high: 0.465 },
    window: {
      zh: '失眠或失眠症狀，各研究合併；用診斷工具判定約 32%',
      en: 'insomnia or insomnia symptoms, pooled across studies; about 32 % with diagnostic tools',
    },
    factors: {
      zh: '合併憂鬱或焦慮的人失眠症狀較多；該回顧沒有找到發生率研究，也沒有分析病灶位置（Baylan 2020）。',
      en: 'Insomnia symptoms were greater with depression or anxiety; the review found no incidence studies and did not analyse lesion site (Baylan 2020).',
    },
    sources: [BAYLAN_2020],
    typicalOnsetH: 24,
  },
  {
    id: 'sleep_apnoea',
    system: 'sleep',
    name: { zh: '睡眠呼吸中止（睡眠呼吸障礙）', en: 'Sleep apnoea (sleep-disordered breathing)' },
    desc: {
      zh: '睡眠中反覆呼吸停止或變淺（呼吸中止低通氣指數 AHI > 5 次／小時），大多是阻塞型；常沒有自覺，需要睡眠檢查才能發現。',
      en: 'Repeated pauses or shallow breathing during sleep (apnoea–hypopnoea index > 5/h), mostly obstructive; often unnoticed and found only by a sleep study.',
    },
    prevalence: { value: 0.71, low: 0.666, high: 0.748 },
    window: {
      zh: '急性期、亞急性期與慢性期相近（AHI > 30 的重度約 30%）；包含 TIA',
      en: 'similar in the acute, subacute and chronic phases (severe, AHI > 30: about 30 %); includes TIA',
    },
    factors: {
      zh: '很大一部分在中風前就已存在：阻塞型睡眠呼吸中止本身就會增加中風與死亡的風險（Yaggi 2005）。只有約 7% 以中樞型為主；男性與再次中風者比率較高，與中風類型或中風後時間無關（Johnson 2010；Seiler 2019）。這些回顧沒有把它歸因於病灶位置。',
      en: 'Much of it was there before the stroke: obstructive sleep apnoea itself raises the risk of stroke and death (Yaggi 2005). Only about 7 % is mainly central; it is commoner in men and after recurrent strokes, and does not differ by stroke type or time since stroke (Johnson 2010; Seiler 2019). These reviews do not tie it to a lesion site.',
    },
    sources: [SEILER_2019, JOHNSON_2010, YAGGI_2005],
    typicalOnsetH: 0,
  },
  {
    id: 'dementia',
    system: 'cognition',
    name: { zh: '中風後失智', en: 'Dementia after stroke' },
    desc: {
      zh: '中風後新出現、足以影響日常生活的整體認知功能衰退（不只是單一的語言或空間缺損）。',
      en: 'A new decline in overall cognition after the stroke that is severe enough to affect daily life (not just a single language or spatial deficit).',
    },
    prevalence: { value: 0.074, low: 0.048, high: 0.1 },
    window: {
      zh: '首次中風後 1 年內（以人口為基礎的研究，排除中風前已失智者）',
      en: 'within the first year after a first stroke (population-based studies, dementia before the stroke excluded)',
    },
    factors: {
      zh: '與中風後失智最相關的是中風本身的特徵與併發症，以及時間與位置上多發的病灶；作者認為主因是中風本身，而不是背後的血管危險因子。再次中風後超過三分之一有失智；另有約一成在首次中風前就已失智（Pendlebury 2009）。個別認知缺損（失語、忽略）取決於病灶位置，已列在病例的症狀裡。',
      en: 'Most strongly associated with the characteristics and complications of the stroke itself and with multiple lesions in time and place; the authors see the stroke itself, rather than the underlying vascular risk factors, as the central cause. More than a third have dementia after a recurrent stroke, and about one in ten already had dementia before the first one (Pendlebury 2009). Specific cognitive deficits (aphasia, neglect) depend on the lesion site and are listed with the case’s symptoms.',
    },
    sources: [PENDLEBURY_2009],
    typicalOnsetH: 2160,
  },
  {
    // not a symptom of the case (C6-F3): a registry of first strokes, not a systematic review
    id: 'movement_disorders',
    system: 'motor',
    name: { zh: '中風後不自主運動（偏側舞蹈—投擲症、肌張力異常）', en: 'Movement disorders after stroke (hemichorea–hemiballism, dystonia)' },
    desc: {
      zh: '中風後出現的不自主運動：手腳不由自主地甩動或扭動（偏側舞蹈—投擲症）、持續的扭轉姿勢（肌張力異常），較少見的還有顫抖或肌躍。',
      en: 'Involuntary movements after a stroke: flinging or writhing movements of the limbs on one side (hemichorea–hemiballism), sustained twisting postures (dystonia), less often tremor or jerks.',
    },
    prevalence: { value: 29 / 2500 },
    window: {
      zh: '首次中風、急性期或之後才出現（洛桑中風登錄，2500 人中 29 人）',
      en: 'first strokes, during the acute phase or later (Lausanne Stroke Registry, 29 of 2500)',
    },
    factors: {
      zh: '最常見的是偏側舞蹈—投擲症與偏側肌張力異常，多在基底核與鄰近白質（中大腦或後大腦動脈區）梗塞之後，大多會自行消退——超過 6 個月的只有 3 人（Ghika-Schmid 1997）。偏側投擲症很少真正來自視丘下核，多數預後良好（Postuma 2003）。外側視丘中風後，不自主運動（肌張力異常、手足徐動、舞蹈、顫抖）常在中風一段時間之後才出現，與嚴重的本體覺喪失和運動失調有關，無力恢復時反而更明顯（Kim 2001）；40 例視丘梗塞中有 3 例（Bogousslavsky 1988）。文獻病例中，豆狀核（尤其殼核）病灶常伴肌張力異常，尾狀核病灶則很少有運動障礙（Bhatia 1994；為已發表病例，不能當作發生率）。',
      en: 'Mostly hemichorea–hemiballism and hemidystonia, after infarcts of the basal ganglia and adjacent white matter (middle or posterior cerebral artery territory); they usually regress — only 3 lasted beyond 6 months (Ghika-Schmid 1997). Hemiballism seldom involves the subthalamic nucleus itself and mostly has a benign course (Postuma 2003). After lateral thalamic strokes, involuntary movements (dystonia, athetosis, chorea, tremor) often appear only some time later (delayed onset), tied to severe position-sense loss and ataxia and becoming more evident as the weakness recovers (Kim 2001); 3 of 40 thalamic infarcts (Bogousslavsky 1988). Among published cases, lentiform (especially putaminal) lesions were often reported with dystonia and caudate lesions seldom with movement disorders (Bhatia 1994; reported cases, not incidence).',
    },
    sources: [GHIKA_SCHMID_1997, POSTUMA_2003, KIM_2001, BOGOUSSLAVSKY_1988, BHATIA_1994],
    typicalOnsetH: 0,
  },
];

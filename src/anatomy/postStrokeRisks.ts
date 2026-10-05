/**
 * Problems that are common after a stroke but that the lesion site does not determine, or only
 * weakly: depression, anxiety, fatigue, insomnia, sleep-disordered breathing, apathy … — the
 * commonest complications (falls, shoulder pain, urinary incontinence, infections, a recurrent
 * stroke; C10-F4, F6) — and an uncommon one that a lesion site makes possible but cannot predict,
 * the post-stroke movement disorders (about 1 %; C6-F3).
 *
 * The tissue model cannot tell who will develop them, so they are shown as population figures
 * beside the outcome — how often they occur after a stroke and what is known to raise the risk —
 * never as symptoms of the simulated case, never in the NIHSS or the deficit counts.
 */
import type { L, SymptomSystem } from './types';

/**
 * where a risk is grouped: the function it belongs to (as the case's symptoms), or `general` for
 * what belongs to no one function (infections, a recurrent stroke)
 */
export type RiskGroupId = SymptomSystem | 'general';

export interface PostStrokeRisk {
  id: string;
  /** the function it belongs to (for grouping with the case's symptoms), or `general` */
  system: RiskGroupId;
  name: L;
  /** what it is, in plain language */
  desc: L;
  /**
   * share of stroke survivors affected (0–1), from a systematic review or meta-analysis; `low` /
   * `high` are its confidence interval or range when reported
   */
  prevalence: { value: number; low?: number; high?: number };
  /**
   * whom the figure counts when it is not stroke survivors as a whole: a single selected cohort
   * (R3-7), shown after the figure instead of "of stroke survivors"; it reads on from the figure
   * ("about 73 % …")
   */
  population?: L;
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
// C10 (checked against the abstracts on PubMed)
const LANGHORNE_2000 =
  'Langhorne P, Stott DJ, Robertson L, MacDonald J, Jones L, McAlpine C, Dick F, Taylor GS, Murray G. Medical complications after stroke: a multicenter study. Stroke 2000;31:1223–1229.';
const FORSTER_1995 = 'Forster A, Young J. Incidence and consequences of falls due to stroke: a systematic inquiry. BMJ 1995;311:83–86.';
const LINDGREN_2007 = 'Lindgren I, Jönsson AC, Norrving B, Lindgren A. Shoulder pain after stroke: a prospective population-based study. Stroke 2007;38:343–348.';
const MOHAN_2011 =
  'Mohan KM, Wolfe CD, Rudd AG, Heuschmann PU, Kolominsky-Rabas PL, Grieve AP. Risk and cumulative risk of stroke recurrence: a systematic review and meta-analysis. Stroke 2011;42:1489–1494.';
const AMARENCO_2016 = 'Amarenco P et al. One-year risk of stroke after transient ischemic attack or minor stroke. N Engl J Med 2016;374:1533–1542.';
const PATEL_2001 = 'Patel M, Coshall C, Rudd AG, Wolfe CD. Natural history and effects on 2-year outcomes of urinary incontinence after stroke. Stroke 2001;32:122–127.';
const MARTINO_2005 =
  'Martino R, Foley N, Bhogal S, Diamant N, Speechley M, Teasell R. Dysphagia after stroke: incidence, diagnosis, and pulmonary complications. Stroke 2005;36:2756–2763.';
const WEAVER_2021 =
  'Weaver NA et al. Strategic infarct locations for post-stroke cognitive impairment: a pooled analysis of individual patient data from 12 acute ischaemic stroke cohorts. Lancet Neurol 2021;20:448–459.';
const WEAVER_2023 =
  'Weaver NA et al. Strategic infarct locations for poststroke depressive symptoms: a lesion- and disconnection-symptom mapping study. Biol Psychiatry Cogn Neurosci Neuroimaging 2023;8:387–396.';

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
      zh: '一致的預測因子：失能、中風前就有憂鬱、認知障礙、中風嚴重度與焦慮（Ayerbe 2013；該回顧的盛行率為 29%，5 年內累積發生率 39–52%）。病灶位置：系統性回顧不支持「左半球或左前方病灶較易憂鬱」的假說（左對右相對風險 0.95，95% CI 0.83–1.10；Carson 2000）；一個大型病灶定位研究（553 人，另在 459 人驗證）則發現右側杏仁核與蒼白球的梗塞與憂鬱症狀有關（Weaver 2023）。',
      en: 'Consistent predictors: disability, depression before the stroke, cognitive impairment, stroke severity and anxiety (Ayerbe 2013; prevalence 29 % in that review, cumulative incidence 39–52 % within 5 years). Lesion site: a systematic review found no support for more depression after left-hemisphere or left anterior lesions (left vs right relative risk 0.95, 95% CI 0.83–1.10; Carson 2000); one large lesion-mapping study (553 patients, validated in 459) linked depressive symptoms to infarcts of the right amygdala and pallidum (Weaver 2023).',
    },
    sources: [HACKETT_2014, AYERBE_2013, CARSON_2000, WEAVER_2023],
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
      zh: '中風後早期與晚期的盛行率差不多（Johnson 2010；Seiler 2019），表示很大一部分在中風前就已存在；阻塞型睡眠呼吸中止本身與較高的「中風或死亡」合併風險有關（Yaggi 2005，校正後風險比約 2）。只有約 7% 以中樞型為主；男性與再次中風者比率較高；缺血性中風、腦出血與 TIA 之間沒有差別（心因性栓塞的中風較少）。這些回顧沒有把它歸因於病灶位置。',
      en: 'Its prevalence is about the same early and late after a stroke (Johnson 2010; Seiler 2019), which suggests that much of it predates the stroke; obstructive sleep apnoea is itself associated with a higher combined risk of stroke or death (Yaggi 2005, adjusted hazard ratio about 2). Only about 7 % is mainly central; it is commoner in men and after recurrent strokes, and does not differ between ischaemic stroke, haemorrhage and TIA (it is less common after cardioembolic stroke). These reviews do not tie it to a lesion site.',
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
      zh: '與中風後失智最相關的是中風本身的特徵與併發症，以及時間與位置上多發的病灶；作者認為主因是中風本身，而不是背後的血管危險因子。再次中風後超過三分之一有失智；另有約一成在首次中風前就已失智（Pendlebury 2009）。較輕的中風後認知障礙在第一年約有一半；12 個世代、2950 人的病灶定位分析中，左側額顳葉、左側視丘與右側頂葉的梗塞關聯最強（Weaver 2021）。個別認知缺損（失語、忽略）取決於病灶位置，已列在病例的症狀裡。',
      en: 'Most strongly associated with the characteristics and complications of the stroke itself and with multiple lesions in time and place; the authors see the stroke itself, rather than the underlying vascular risk factors, as the central cause. More than a third have dementia after a recurrent stroke, and about one in ten already had dementia before the first one (Pendlebury 2009). Milder post-stroke cognitive impairment affects about half in the first year; in a lesion-mapping analysis of 2950 patients from 12 cohorts, infarcts of the left frontotemporal lobes, left thalamus and right parietal lobe were the most strongly associated with it (Weaver 2021). Specific cognitive deficits (aphasia, neglect) depend on the lesion site and are listed with the case’s symptoms.',
    },
    sources: [PENDLEBURY_2009, WEAVER_2021],
    typicalOnsetH: 2160,
  },
  {
    // C10-F4: falls — after discharge, in people aged 60 or over who went home with some disability
    id: 'falls',
    system: 'motor',
    name: { zh: '跌倒', en: 'Falls' },
    desc: {
      zh: '中風後平衡、肌力、視野與注意力都可能變差，跌倒很常見，可能造成骨折，也讓人因為害怕跌倒而更少活動。',
      en: 'Balance, strength, vision and attention can all be worse after a stroke, so falls are common; they can cause fractures, and the fear of falling makes people less active.',
    },
    prevalence: { value: 0.73 },
    // one trial cohort of 108 people aged 60 or over, at home with residual disability (Forster 1995)
    population: { zh: '的 60 歲以上、出院回家時留有失能的病人（單一世代）', en: 'of people aged 60 or over who went home with residual disability (one cohort)' },
    window: {
      zh: '出院回家後 6 個月內至少跌倒一次（60 歲以上、留有部分失能的人，108 人中 79 人）；住院期間約 25%',
      en: 'at least one fall within 6 months of going home (people aged 60 or over with some residual disability, 79 of 108); about 25 % during the hospital stay',
    },
    factors: {
      zh: '住院時就跌倒過的人，回家後較容易反覆跌倒；反覆跌倒的人 6 個月時社交活動較少、較常情緒低落，照顧者的壓力也較大（Forster 1995）。住院期間的比率來自一個多中心世代（Langhorne 2000）。這些研究沒有把跌倒歸因於病灶位置。',
      en: 'People who fell in hospital were more likely to fall repeatedly at home; repeated fallers were less socially active and more often low in mood at 6 months, and their carers more stressed (Forster 1995). The in-hospital figure comes from a multicentre cohort (Langhorne 2000). These studies do not tie falls to a lesion site.',
    },
    sources: [FORSTER_1995, LANGHORNE_2000],
    typicalOnsetH: 168,
  },
  {
    // C10-F4: hemiplegic shoulder pain — first-ever strokes, population-based
    id: 'shoulder_pain',
    system: 'motor',
    name: { zh: '中風後肩膀痛', en: 'Shoulder pain after stroke' },
    desc: {
      zh: '無力那一側的肩膀疼痛：手臂垂著沒有肌肉支撐、關節半脫位或活動受限都有關；會妨礙穿衣、行走與復健。',
      en: 'Pain in the shoulder of the weak arm, linked to a hanging arm without muscle support, partial dislocation or a stiff joint; it gets in the way of dressing, walking and rehabilitation.',
    },
    prevalence: { value: 0.22 },
    window: {
      zh: '首次中風後 4 個月內新出現（以人口為基礎的研究）；到 16 個月時接近三分之一；住院期間約 9%',
      en: 'new within 4 months of a first stroke (a population-based study), almost a third by 16 months; about 9 % during the hospital stay',
    },
    factors: {
      zh: '預測因子是手臂動作喪失或變差，以及中風當時較高的 NIHSS；大多數是中度到重度的疼痛（Lindgren 2007）。',
      en: 'Predicted by lost or impaired arm movement and a higher NIHSS at onset; most of the pain was moderate to severe (Lindgren 2007).',
    },
    sources: [LINDGREN_2007, LANGHORNE_2000],
    typicalOnsetH: 336,
  },
  {
    // C10-F6: urinary incontinence — 235 incident strokes (a population register)
    id: 'incontinence',
    system: 'autonomic',
    name: { zh: '尿失禁', en: 'Urinary incontinence' },
    desc: {
      zh: '無法控制排尿。中風後大多與病灶位置無關，而與中風的嚴重度、行動不便和能不能及時表達、到廁所有關；內側額葉受損是另一個特定的原因（會列在病例的症狀裡）。',
      en: 'Loss of bladder control. After a stroke it is mostly not tied to the lesion site but to how severe the stroke is, immobility and being able to ask for or reach the toilet in time; damage to the medial frontal lobe is a separate, specific cause (listed with the case’s symptoms).',
    },
    prevalence: { value: 0.4 },
    window: {
      zh: '中風後約 10 天（3 個月 19%，1 年 15%，2 年 10%）',
      en: 'about 10 days after the stroke (19 % at 3 months, 15 % at 1 year, 10 % at 2 years)',
    },
    factors: {
      zh: '獨立相關因子：年齡大於 75 歲、吞嚥困難、肢體無力與視野缺損；腔隙性梗塞較少見。早期尿失禁的人 2 年時死亡、住進照護機構與失能的比率都較高（Patel 2001）。住院期間約 24% 有尿路感染（Langhorne 2000）。',
      en: 'Independently associated with age over 75, dysphagia, limb weakness and a visual field defect; less common after lacunar infarcts. Those incontinent early had higher death, institutionalisation and disability rates at 2 years (Patel 2001). About 24 % had a urinary tract infection during the hospital stay (Langhorne 2000).',
    },
    sources: [PATEL_2001, LANGHORNE_2000],
    typicalOnsetH: 0,
  },
  {
    // C10-F4: infections — in hospital, a multicentre cohort of 311 admitted strokes
    id: 'infections',
    system: 'general',
    name: { zh: '感染（尿路、肺部）', en: 'Infections (urinary tract, chest)' },
    desc: {
      zh: '中風後住院期間最常見的併發症之一：尿路感染與肺炎（常與吞嚥困難、吸入有關）。中風後發燒要先找感染。',
      en: 'Among the commonest complications during the hospital stay: urinary tract infection and pneumonia (often from dysphagia and aspiration). Fever after a stroke means looking for an infection first.',
    },
    prevalence: { value: 0.24 },
    // one multicentre cohort of 311 patients admitted to hospital (Langhorne 2000)
    population: { zh: '的住院病人（單一世代）', en: 'of patients in hospital (one cohort)' },
    window: {
      zh: '住院期間的尿路感染（肺部感染 22%；一個多中心世代，311 人）',
      en: 'urinary tract infection during the hospital stay (chest infection 22 %; one multicentre cohort of 311)',
    },
    factors: {
      zh: '住院期間 85% 至少有一種併發症；感染與跌倒在之後的追蹤中仍然常見，頻率與病人的依賴程度有關（Langhorne 2000）。吞嚥困難讓肺炎風險增加約 3 倍，確認有吸入時約 11 倍（Martino 2005）。',
      en: '85 % had at least one complication in hospital; infections and falls stayed common during follow-up, their frequency related to how dependent the patient was (Langhorne 2000). Dysphagia raises the risk of pneumonia about threefold, and confirmed aspiration about elevenfold (Martino 2005).',
    },
    sources: [LANGHORNE_2000, MARTINO_2005],
    typicalOnsetH: 24,
  },
  {
    // C10-F4: a recurrent stroke — pooled cumulative risk after a first stroke (13 studies, 9115
    // survivors) and, for comparison, after a TIA or minor stroke under rapid specialist care
    id: 'recurrence',
    system: 'general',
    name: { zh: '再次中風', en: 'Recurrent stroke' },
    desc: {
      zh: '中風後再發生一次中風。風險在最初幾週到幾個月最高，之後逐年累積；控制血壓、抗血栓藥物、治療頸動脈狹窄或心房顫動等次級預防可以降低。',
      en: 'Another stroke after the first. The risk is highest in the first weeks to months and keeps adding up over the years; secondary prevention (blood pressure, antithrombotic drugs, treating carotid stenosis or atrial fibrillation) lowers it.',
    },
    prevalence: { value: 0.111, low: 0.09, high: 0.133 },
    window: {
      zh: '首次中風後 1 年的累積風險（30 天 3.1%，5 年 26.4%，10 年 39.2%）；住院期間約 9%',
      en: 'cumulative risk 1 year after a first stroke (3.1 % at 30 days, 26.4 % at 5 years, 39.2 % at 10 years); about 9 % during the hospital stay',
    },
    factors: {
      zh: '各研究差異很大，較新的研究 5 年風險較低（32% 降到 16.2%），作者認為可能反映病人組成的差異與次級預防的改變（Mohan 2011）。在快速由中風專科評估的 TIA 或輕微中風病人，1 年中風風險是 5.1%；多發性梗塞、大動脈粥狀硬化與 ABCD² 分數 6–7 分各讓風險增加一倍以上（Amarenco 2016）。',
      en: 'Estimates vary widely between studies, and the 5-year risk fell from 32 % to 16.2 % across them, which the authors relate to case mix and changes in secondary prevention (Mohan 2011). After a TIA or minor stroke assessed rapidly by stroke specialists the 1-year stroke risk was 5.1 %; multiple infarcts, large-artery atherosclerosis and an ABCD² score of 6–7 each more than doubled it (Amarenco 2016).',
    },
    sources: [MOHAN_2011, AMARENCO_2016, LANGHORNE_2000],
    typicalOnsetH: 0,
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

# Engine medical values audit

Independently rechecked 2026-10-08 against commit `9fcab3287f9881f4f82309410631ce7feaef2a80`, its parent diff, and cited primary sources (web search, abstracts, and available full text). Scope: production `src/engine/*.ts`, including numerical statements in comments and both narrative languages. Tests are fixtures/assertions, not additional clinical evidence. Related constants in anatomy are traced where the engine imports them. Repeated values with the same meaning are grouped. Mathematical identities, loop indices, floating-point epsilons and sampling resolutions are excluded except where they could be mistaken for a clinical threshold.

**OK** means supported for the stated population and measurement, not that the simulator is clinically validated. **Questionable** means an unvalidated calibration, extrapolation, conflicting evidence, or an incompletely verified quotation. **Wrong** means a specific contradicted number, denominator, boundary or interpretation. An unsupported parameter is not made correct by attaching a citation to a different quantity.

Locations are approximate source anchors from the original audit; edits can move lines. The Corrections table preserves pre-commit values and records reviewed and follow-up corrections; the other tables describe the model and the independently rechecked verdicts. Rechecking a quoted result does not independently reproduce its underlying clinical data.

## Corrections

| Value | Location | Current | Literature | Verdict | Action |
|---|---|---|---|---|---|
| eTICI 1 reperfused fraction | `src/engine/treatment.ts:47`; `cascade.ts:727`; `src/i18n/uiTreatment.ts:121,213` | 0.05; “hardly any” distal flow | Thrombus reduction **without distal reperfusion**, [Liebeskind 2019][etici] | Wrong | Set 0; correct zh-TW/en descriptions and selector labels; cite definition; test zero tissue rescue and every grade range. |
| Large-core trial ceiling | `cascade.ts:1488,1596,1600` | Above 100 mL, “only LASTE set no upper limit” | SELECT2 also had no upper core-volume limit, [SELECT2][select2] | Wrong | Correct both languages and selection comment. Preserve 100 mL as a caution-display trigger, not an exclusion criterion. |
| Acute small subcortical infarct diameter | `cascade.ts:2012–2013` | Under about 1.5 cm | Recent small subcortical infarct usually ≤20 mm axially; STRIVE-2 also recognizes cavitated lacunes <3 mm, [STRIVE-2][strive] | Wrong convention | Say usually ≤2 cm axial diameter in both languages; add citation and regression. |
| Consciousness prognosis | `cascade.ts:3914–3916,3974–3975,3996–3997` | Recovery after 3 months exceedingly rare; lifespan 2–5 years; no recovery of awareness | Late recovery recognized; chronic rather than permanent VS/UWS, [AAN 2018][aan] | Wrong as categorical current prognosis | Remove fixed lifespan and certainty; acknowledge possible late recovery; retain explicitly illustrative model course. |
| Decompression age boundary | `cascade.ts:2467–2468,2658–2659` | English “under age 60” versus ≤60 elsewhere | Pooled trials ages 18–60, [Vahedi][surgery] | Wrong boundary/inconsistent wording | Say age 60 or younger; explicitly inclusive zh-TW. |
| Spinal imaging denominators | `cascade.ts:1302–1303` | Pencil-like 40% of all 133; arterial abnormality 20% without subset | Pencil50/126,owl82/126,initially normal30/126; arterial findings16/82, [Zalewski][cord2] | Wrong denominator | Preserve percentages; identify imaged subset and 16/82 examined. |
| MRI false-negative rate population | `cascade.ts:1254–1255` | 12% within 48 h, apparently general | 8/69 ischaemic strokes in a high-risk acute vestibular syndrome cohort; all false-negative scans8–48h, [Kattah][hints] | Wrong population and temporal denominator | Specify8/69 and time of false-negative scans in both languages; not12% of every scan obtained within48h. |
| Hearing recovery follow-up | `cascade.ts:1231–1232` | Profound loss improves in 40% “over months” | Long-term follow-up, at least 1 year, [Lee/Baloh][hearing] | Questionable time precision | Change to long-term follow-up in both languages; preserve 40%. |
| Early seizure/status denominator | `cascade.ts:3353–3354` | Roughly ¼ of cortical-infarct seizures present as status | 10/37 (27%) early-seizure cases across all stroke types, [Labovitz][seizure1] | Wrong denominator | State all stroke types including hemorrhages; make broad 4–6% summary 4–7% to encompass quoted 6.5%. |
| Dementia prevalence versus incidence | `cascade.ts:3654–3655` | ~7% develop after first stroke; >⅓ after recurrence | 7.4% community first-stroke cohorts excluding prior dementia; 41.3% hospital recurrent cohorts including prior dementia, [Pendlebury][dementia] | Wrong denominator/interpretation | Give both exact estimates and populations; avoid interchangeable incident-risk interpretation. |
| Depression temporal scope | `cascade.ts:3654–3655` | 31% “at any time” | Pooled prevalence; strata vary with follow-up, [Hackett][depression] | Questionable generalization | Label pooled estimate and time variation; preserve 31%. |
| AF monitoring yield | `cascade.ts:3285–3290` | About a quarter detected with longer monitoring | 23.7% estimated combined yield across admission ECG, inpatient and outpatient phases in stroke or TIA, [Sposato](https://pubmed.ncbi.nlm.nih.gov/25748102/) | Wrong if read as outpatient-only yield | Clarify pooled estimate, stroke-or-TIA population and sequential phases in both languages. |
| Deterioration denominator | `cascade.ts:2358–2359` | 36% by24h/68% by48h in53patients | Cohort selected for deterioration, [Qureshi](https://pubmed.ncbi.nlm.nih.gov/12545028/) | Questionable denominator | Explicitly identify selected deteriorating patients. |
| Fever boundary | `cascade.ts:3042–3043` | English above39°C, zh-TW39°C以上 | Inclusion≥39°C,[Sung](https://pubmed.ncbi.nlm.nih.gov/19521083/) | Wrong strict versus inclusive boundary | English now39°C or higher. |

## Perfusion, tissue fate and volumes

| Value | Location in `src/engine` unless stated | Current | Literature comparison | Verdict | Action |
|---|---|---|---|---|---|
| Operational core threshold | `tissueParams.ts:53,97`; `tissue.ts:5` | rCBF <0.30 | Campbell optimum <31%; SELECT2 uses <30%, [Campbell][cbf], [SELECT2 protocol][selectprotocol] | OK quotation for CTP imaging; questionable extension to all modeled tissue | Retain; tests pin literal0.30 and exercise final-infarct behavior just below/above it. Regional modeled flow is not a measured CTP voxel or proof of irreversible death. |
| Penumbra/oligemia thresholds | `tissueParams.ts:54–55,98–99`; `tissue.ts:10–19` | rCBF <.55 / <.85; absolute comparison 20/10 mL/100g/min, monkey paralysis ~23 | Modern perfusion mismatch uses Tmax >6 s, [DEFUSE-3][defuse]; absolute thresholds depend on tissue, time and method | Questionable | Retain explicit calibration. The simulator does not calculate Tmax; .55 cannot be validated as Tmax >6 s. |
| Fast core/perforator profile | `tissueParams.ts:46–61,125` | τ .09 h, span1, penumbra τ1.5 h×20, maximum survival .85, lag .1 h; >80% lost by15 min | Rat striatal infarction at30 min is not a validated human time-to-death curve; [Memezawa](https://pubmed.ncbi.nlm.nih.gov/1561688/) | Questionable | No defensible isolated replacement; retain caveat. |
| Default collateral-fed profile | `tissueParams.ts:97–105` | Core τ3→8 h; penumbra8→30 h; survival .85; lag⅓ h | Very heterogeneous measured growth, [Wheeler][growth1], [Ospel][growth2] | Questionable | Retain as model, not physiological constants. |
| Reported/derived growth quotations | `tissueParams.ts:76–84` | 3.1 [.7–10.7],4.74 [1.25–14.84]mL/h;fast≥10;extreme~74mL/h | [Wheeler][growth1] median3.1; [Ospel][growth2]4.74 derived from final24h infarct/onset-to-reperfusion time; ≥10 is a [SELECT study][fastgrowth] classification; extreme neuron conversion is an estimate,[Desai][neurons2] | OK attributed estimates; wrong if described as uniformly observed serial core growth | Retain values with method caveat; neither universal fast-growth cutoff nor direct cell-count measurement. |
| Derived scenario growth | `tissueParams.ts:85–90` | M1 poor~60mL at1h /35–55mL/h first6h; ICA~70mL at1h; moderate20–30/good10–20 | Comparator good2.93 [1.10–7.94], moderate8.65 [4.53–18.13], poor25.41 [12.83–45.07], [collateral study][growth3] | Questionable, biased toward fast progression | Leave unchanged; model outputs are not population-typical rates. |
| Deep white matter | `tissueParams.ts:139–161` | Lag2.5h, τ1.75h; 58/76/86% lost at4/5/6h | Cohort92,45(48.9%) capsular infarcts, aOR3.47/hour of LSA reperfusion delay in the LSA-occluded subgroup, [Kaesmacher][capsule] | OK cohort quote; questionable conversion | Probability across patients is not fraction of one capsule; no guaranteed2.5h safe interval. |
| Basilar profile | `tissueParams.ts:175–219` | Inherits fast core; penumbra τ3→60h; maximum survival.4 | Benefit within12h/6–24h does not identify tissue kinetic coefficients, [ATTENTION][attention]/[BAOCHE][baoche] | Questionable | Retain explicit regional-calibration caveat. |
| Retina | `tissueParams.ts:225–241`; `cascade.ts:1170` | Lag12min, τ5.4min; monkey97/240min, human review12–15min | [Hayreh experiment][retina] versus disputed extrapolation in [Tobalem](https://doi.org/10.1186/s12886-018-0768-4) | Questionable as human deterministic rule | Preserve conflicting evidence and uncertainty; do not replace12min by97min from monkeys. |
| Final infarct probability | `tissue.ts:61` | 1−survivalMax×x^1.3 | No measured universal exponent; [DEFUSE-3][defuse] establishes selection rather than this law | Questionable | Retain calibration. |
| Stable penumbra horizon | `tissue.ts:65,81` | lag+3τ capped48h | Hypoxic viable tissue observed within48h, [Markus](https://pubmed.ncbi.nlm.nih.gov/15130953/); not proof it ends then | Questionable | Keep as computational course limit. |
| Rescued-tissue recovery | `tissue.ts:225–238,270–276`; `cascade.ts:778–782` | .5h initial response; τ2.8×ischemic hours; fast fraction.75, slowτ×8; NIHSS<6 in~¼ within30min;54% of estimated treatment benefit mediated by24h NIHSS/75% bydischarge | Clinical response cohorts do not establish tissue-fraction kinetics; [Kniep](https://pubmed.ncbi.nlm.nih.gov/35549377/), [Desai](https://pmc.ncbi.nlm.nih.gov/articles/PMC12778787/) | OK cohort numbers; questionable conversion of mediation/NIHSS results into tissue kinetics | No kinetic change. |
| Neurons lost | `tissue.ts:325`; `simulate.ts:2811`; `cascade.ts:1550` | 22million/mL; average1.9million/min; range<35000–>27million/min | [Saver][neurons1] is forebrain/supratentorial; [Desai][neurons2] shows variability | OK rounded forebrain estimate; questionable posterior application | No density substitution. Cerebellum/brainstem need their own model; whole-brain total is not validated neuronal loss. |
| Anatomical volume normalization | `src/anatomy/index.ts:30,53,63,70`; `simulate.ts:2771–2811` |1250mL target; actual brain1250.8mL after fixed structures | [Liu atlas][atlas] supports territory topology; does not establish a universal1250mL brain | Questionable fixed adult geometry | Retain; see per-vessel table. |
| Baseline flow | `src/anatomy/index.ts:70`; engine imports | volume×regional CBF/100; aggregate557.0384mL/min | Plausible adult teaching baseline; no individual physiological bound inferred | Questionable as universal | Retain. |
| Lacune volume | `simulate.ts:201–202`; `src/anatomy/lacunes.ts:45` | .8mL, quote cohort median.73mL | [Barow2020][lacunevolume]:224lacunar WAKE-UP patients,median.73mL[IQR.37–1.15]; [STRIVE-2][strive] does not prescribe uniform volume | Questionable fixed volume | Retain as scenario. |
| “No infarct”/onset threshold | `simulate.ts:333,620,1296`; `cascade.ts:1969` | .05mL | Tissue-based TIA has no accepted minimum infarct volume; [Easton](https://doi.org/10.1161/STROKEAHA.108.192218) | Questionable if clinical | Numerical/reporting tolerance, not diagnostic minimum; unchanged. |
| Recovery/final display clocks | `simulate.ts:325,445,1445,2849` |90/180days, survivor penumbra smoothing12h, preview24h |90d common trial endpoint [DEFUSE-3][defuse]; others model horizons | OK endpoint; questionable biological interpretation | Preserve. |

Additional quoted perfusion comparisons in `tissueParams.ts:77–83`: [Seners](https://pmc.ncbi.nlm.nih.gov/articles/PMC10663035/) verifies ~77%fast progressors in the highest HIR quartile, with≥10mL/h defined as baseline infarct/onset-to-imaging time; this is not a model collateral-grade probability. [d'Esterre](https://pubmed.ncbi.nlm.nih.gov/26514186/) verifies<8.9/<7.4mL/100g/min thresholds for early reperfusion (<90minfromCTP,onset<180min); these are conditional ROC cutoffs, not a universal7–9viability boundary. [Boned](https://pubmed.ncbi.nlm.nih.gov/27566491/) establishes possible CTP core overestimation, not reversal of proven cell death. These quotations support caution, not the model kinetics.

## Hemodynamics, collaterals and emboli

The numerical network coefficients below are **questionable as medical constants**: the cited literature supports qualitative dependencies, not the exact coefficients. No numerical replacements are justified without recalibrating the network.

| Value | Location | Current | Literature / verdict | Action |
|---|---|---|---|---|
| Hydraulic conductance scale/branch multiplier | `hemodynamics.ts:98–119` |150 versus physical~900; branch×3; stenotic segment4mm | Lumped Poiseuille approximation, not patient measurement | Retain model coefficients. |
| Reference pressures/reserve | `hemodynamics.ts:101–112,780,798` |MAP93,outflow10,link drops12/30mmHg; autoregulation.6–1.8; exponent.7; relative-flow cap2 | Guidelines govern measured BP, not these reserve factors, [AHA/ASA][aha] | Retain representative baseline. |
| Collateral levels | `hemodynamics.ts:113–115` |good1.5/moderate.8/poor.15; scale1/36 | [Collateral/core growth][growth3] supports ordering; these are not ASITN/SIR grades | Retain; no clinical score equivalence. |
| Brainstem donor shares | `hemodynamics.ts:153–162` |.6/.4,.7/.3,.5/.5,.7/.3,.5/.5 | Anatomical mixing assumptions, not measured donor fractions | Retain. |
| Pial conductance | `hemodynamics.ts:169,191,208–225` |.02;poor.5,override.75;entry.015;pressure exponent1.4 | [ATTENTION][attention]/[BAOCHE][baoche] do not validate these numbers | Retain calibration. |
| Derived basilar residual flows | `hemodynamics.ts:165,174,196–204` |50/40/33%;old poor15%;override28→33%;multisegment6–23% | Network outputs; multisegment limitations already documented | Retain; not measured clinical ranges. |
| Extracranial collaterals | `hemodynamics.ts:244–267` |conductance1.8/1.2;arm gradient25mmHg;quoted76%antegrade BA;pressure20/40–50mmHg | [Harper](https://pubmed.ncbi.nlm.nih.gov/18692344/), [Labropoulos](https://pubmed.ncbi.nlm.nih.gov/20531004/); 76% antegrade flow and >40–50 mmHg association verified; conductances remain unvalidated | Retain verified observational quotes and unvalidated model coefficients. |
| Reversal/route detection | `hemodynamics.ts:814–815,852`; `simulate.ts:426` |max(.5mL/min,5%baseline);route rise5mL/min | Engineering classifier, not diagnostic criteria | Retain. |
| Embolus diameter presets | `embolus.ts:35–38` |4.2/2.9/1.6/.9mm | Illustrative sizes, not clinical categories | Retain. |
| Embolus routing/lodging | `embolus.ts:67–70,88–103,123` |ACA.3,communicator.5,perforator.02;diameter×1.05;mouth<.6×diameter→weight.05;flow>.2 | Rigid-sphere/flow heuristics, not validated embolization probabilities | Retain. |
| Schedule/algebra | `schedule.ts:158`; `solver.ts` |.9 ordering probe; algebra tolerances | Not a90%stenosis threshold; no medical constants in solver | No clinical correction. |

## Edema, mass effect, surgery and recovery

| Value | Location | Current | Literature | Verdict / action |
|---|---|---|---|---|
| ADC pseudonormalization | `edema.ts:11,101–102` |~1–2wk;midpoint240h,width30h | ADC lowweek1,pseudonormalweek2 in27patients,[Lansberg][adc] | OK qualitative time course; questionable midpoint/width. The citation does not establish a5–14d half-peak diffusion-restriction bound. Test explicitly labels its7–14d half-curve check as model regression, and distinguishes persistent DWI shine-through. |
| DWI appearance/deepening | `edema.ts:97–99,187` |τ.1h/12h;brightness.65+.35×rise | Serial ADC/DWI course,[Lansberg][adc];this study does not establish a6-minute onset threshold | Questionable exact curve and onset citation; retain as model. |
| DWI shine-through | `edema.ts:104–106` |.5 intensity,τ720h | DWI may persist after ADC normalization,[Lansberg][adc] | Questionable intensity/τ; retain. |
| Gliosis/FLAIR | `edema.ts:108–110` |.6,onset120h,full400h | No universal decomposition,[Lansberg][adc] | Questionable; retain. |
| Penumbra/rescued DWI | `edema.ts:112–114` |.3,decay3h | Variable diffusion reversibility | Questionable; retain. |
| CT water uptake | `edema.ts:23` |11.5% separates≤4.5h from later | [Minnerup](https://doi.org/10.1002/ana.24818) | OK study quote, not a volume expansion percentage. |
| Ionic edema | `edema.ts:117–121` |.04volume,τ4h;penumbra×.4,rescueτ12h | Density-derived water uptake is different,[Minnerup](https://doi.org/10.1002/ana.24818) | Questionable fitted coefficients; do not substitute.115. |
| Vasogenic edema | `edema.ts:124–132` |.26volume;mid36h,width10h;secondary×.15;resolution starts72h,τ260h | Broad peakdays2–5 plausible; exact constants unvalidated | Questionable; retain. |
| Reperfusion edema | `edema.ts:135–138,341,388` |+.05volume,+.5FLAIR;rise3h/decay72h;late smoothstep.5–6h;flow change>.05 | No universal measured effect of this magnitude | Questionable; retain. |
| Chronic atrophy | `edema.ts:34,141–143` |50%;starts300h,τ700h;half-volume by3–6mo | No universal50%shrinkage | Questionable; retain as scenario, not prognosis. |
| Shift-volume mapping | `edema.ts:146–148` |.15mm/mL,reserve5mL,cap20mm | [Ropper][shift] describes observed displacement, not this conversion | Questionable; retain. |
| Decompression effect | `edema.ts:150,157–158` |36h;shift×.3,ventricle compression×.4 | Surgery≤48h,[Vahedi][surgery] | Timing OK scenario; effect sizes questionable. Test timing only. |
| Ventricular response | `edema.ts:161–168,520,522` |compression.85/45mL;ex-vacuo1/120mL;hydro.8,ramp12h,residual.2,initial.25;bounds−.9/+1.5 | No cited physiological bounds for normalized geometry | Questionable; retain. |
| Overlapping lesions/size | `edema.ts:234,237` |312h;size factor.3+.7×smoothstep(.05,.5,share) | Assumed dose-response | Questionable; retain. |
| Phase labels | `edema.ts:479,481`; `edemaTypes.ts:14,16` |resolving<.95,ionic≥.3;BBB6–12h;resolution2–3wk | Approximate teaching labels, not biological transitions | Questionable; retain. |
| Model examples | `edema.ts:41–43` |R-M1~300mL→30%/90mL swelling→12–13mm day3;L-M1good~150mL | Scenario outputs, not fixed vessel-volume literature | Questionable as population claims; retain labeled calibration. |
| Consciousness shift bands | `cascade.ts:584–586`; `edema.ts:36` |4/6/8mm from3–4/6–8.5/8–13mm |24 mixed unilateral masses,[Ropper][shift] | OK quotation; questionable stroke-general thresholds. Added source comment; test chosen values inside observed bands only. |
| Mass effect/malignancy | `cascade.ts:619–622` |70mLfinal;145mLearly≤14h;250mLfinal | DWI **>145mL**,28patients imaged≤14h,100%sensitivity/94%specificity in this derivation cohort,[Oppenheim][malignant] | Corrected all three≥145 comparisons to strict>145. Predictor quotation OK; deterministic and bilateral extrapolation plus70/250 cutoffs remain questionable. |
| Herniation timing | `cascade.ts:594–609` |uncal≥72h;subfalcine−12h;pons+12h;end336h;lateral4mm | Death peakday3 is not earliest herniation,[Qureshi](https://experts.umn.edu/en/publications/timing-of-neurologic-deterioration-in-massive-middle-cerebral-art/) | Questionable hard timing; structural recalibration needed. |
| Edema event clock | `cascade.ts:609–610,2157–2160` |24–336h,peak2–5d | Deterioration can precede24h | Questionable fixed display window; retain. |
| Cerebellar occupancy/malignancy | `cascade.ts:640–646,2704–2716` |20mLwarning;38mLmalignant;35.5%overall;39.4%afterday3 |93space-occupying infarcts,33malignant;13/33(39.4%) occurred after3days;38mL associated with>50%risk,[Baki][cerebellum] |20 calibration;38 OK predictor but questionable deterministic trigger. Added citation. |
| Cerebellar consciousness | `cascade.ts:646,659–680` |48h;coma90%peak,stupor67.5%,drowsy45% | Posterior-fossa ratios borrowed from supratentorial shift, not validated | Questionable; retain. |
| Surgery outcomes | `cascade.ts:2467–2468,2658–2659` |≤48h,age≤60;1ysurvival78vs29%;mRS≤4 75vs24% | [Pooled DECIMAL/DESTINY/HAMLET][surgery] | OK selected population; cite and correct inclusive age. Not a universal volume-based indication. |
| Untreated malignant outcome | `cascade.ts:2658–2659` |43/55=78%death,days2–5;survivorBarthel60 | [Hacke](https://pubmed.ncbi.nlm.nih.gov/8929152/) | OK historical cohort quotation, not individual prognosis. |
| Perilesional dysfunction | `recovery.ts:97–103` |starts6h/full24h;rim.35,gain.7 | No validated universal relationship | Questionable; retain. |
| Diaschisis | `recovery.ts:105–108` |depth.2,rise12h,decay240h | Variable regional course | Questionable; retain. |
| Compensation kinetics | `recovery.ts:113–120` |start24h;τ720h,slow2880h/share.15,fast168h;~90%plateau90d | Early improvement concentrated6–10wk,[Kwakkel](https://pubmed.ncbi.nlm.nih.gov/16931787/) | Questionable coefficients;~88.5%is model arithmetic, not clinical estimate. |
| Functional thresholds | `recovery.ts:122,142,160–184,301–309` |dead25%,compact floor15%,noticeable.35;severity.35+.65×min(1,level/.8);CSTloss25–50%,severity1.5–2.5;summary5% | No universal tissue-fraction-to-deficit law | Questionable; retain. |
| Clinical grading | `clinical.ts:69,77,79,150,659,713,732,823,841` |display25%;coma relabel14d;extensive50%;borderzone⅔;macula<75%relative loss;severe paresis2.5 | Quantized phenotype model | Questionable; retain. |
| Bilateral injury | `clinical.ts:108–120`; `cascade.ts:618,3939–3975` |⅔hemisphere/MCA→DOC at2wk;ECD77%;49autopsies | LHI≥⅔MCA definition,[Huang](https://pubmed.ncbi.nlm.nih.gov/32705419/);77% is its background quotation, not its30-patient EEG cohort result;49autopsies are mixed traumatic/non-traumatic VS,[Adams](https://pubmed.ncbi.nlm.nih.gov/10869046/); prognosis[AAN][aan] | Definition quote OK;77% original denominator not independently established; autopsies cannot validate deterministic infarct-extent prognosis. Bilingual text now identifies the77% as background; model rule remains questionable. |
| Aphasia transition | `clinical.ts:159–160` |59%change type within1y,mostly2wk | [Source cited in code](https://pubmed.ncbi.nlm.nih.gov/3191724/) | OK study-specific quote; retain. |
| Medullary facial paresis | `recovery.ts:240–243` |8/33,mild,resolved bydischarge | [Kanbayashi/Sonoo](https://d-nb.info/1241917256/34) | OK primary full-text quote; retain. |
| NIHSS item bounds | `clinical.ts:1022–1158` |1a3,1b2,1c2,gaze2,vision3,face3,arms4each,legs4each,ataxia2,sensory2,language3,dysarthria2,neglect2;total42 | [Official NINDS NIHSS][nihss] | OK scale maxima; inferred scoring is approximate. |
| NIHSS categories/caveat | `clinical.ts:1162–1168` |0/1–4/5–15/16–20/>20;posterior flag≤6;quoted posterior≤5/anterior≤8 | [Sato](https://pubmed.ncbi.nlm.nih.gov/18434640/) | Quoted prognostic cutoffs OK; ≤6flag and category boundaries are display choices, not eligibility criteria. |

`edemaTypes.ts` and `recoveryTypes.ts` otherwise specify normalized 0–1 output ranges and examples; they introduce no additional measured physiological constants. Imported anatomy recovery profiles and symptom onset tables are external to this engine-only audit.

## Treatment windows and other numerical narratives

| Value | Location (`cascade.ts` unless stated) | Current / literature comparison | Verdict | Action |
|---|---|---|---|---|
| Standard IVT/selected EVT | 1541–1544,1584–1587,1659–1660 |4.5h;early6h;selected24h,[AHA/ASA2026][aha] | OK with selection caveats | Retain; new bilingual tests. |
| DEFUSE-3 benchmark, not implemented gate |`tissue.ts:10–19`;treatment narratives |6–16h,core<70mL,mismatch≥15mL,ratio≥1.8,Tmax>6s,[DEFUSE-3][defuse] | No equivalent engine gate | Do not claim rCBF.55 implements trial mismatch. |
| DAWN benchmark, not implemented gate |treatment narratives |6–24h;age≥80 NIHSS≥10 core<21mL;age<80 NIHSS≥10 core<31mL or NIHSS≥20 core31–<51mL,[DAWN][dawn] | No equivalent engine gate | Do not install historical eligibility as universal current exclusion. |
| Recent stroke IVT flag | 1564–1570 |24–2160h≈3mo;registry293,16.3vs4.8%within14d, verified [Shah](https://pubmed.ncbi.nlm.nih.gov/31903770/) | OK registry quote; questionable simplified clock | Retain individualized caveat; [AHA/ASA][aha]. |
| Large-core display | 1486,1590–1600 |label≥70mL;SELECT2≥50;ANGEL70–100in selected strata;ASPECTS3–5 | Questionable generic70mLdefinition; trial values specific,[SELECT2][select2] | Correct upper-limit claim;retain label heuristic. |
| Large-core hemorrhage | 1595–1599 |ANGEL6.1vs2.7%;LASTE9.6vs5.7% | [ANGEL](https://doi.org/10.1056/NEJMoa2213379), [LASTE](https://doi.org/10.1056/NEJMoa2314063) | Rates verified; wrong to imply established symptomatic-bleeding increase | Bilingual text now says numerically higher, neither difference statistically conclusive. Any-ICH increase is trial-dependent; procedural vascular complications are treatment-associated. |
| Basilar trials | 1608–1615,3122 |ATTENTION≤12h,BAOCHE6–24h;ATTENTION NIHSS≥10;BAOCHE initially≥10,expanded to≥6 after61patients;IVT34/21%;mortality37vs55/31vs42%;unrecanalizedgoodoutcome~2% | Windows and quoted trial rates verified,[ATTENTION][attention]/[BAOCHE][baoche];do not misread≥10 as the entire amended BAOCHE enrollment population | Retain; no tissue-τ inference. |
| Lacunar IVT | 1660 |WAKE-UPposthoc31/53(59%)vs24/52(46%),mRS0–1 at90d;aOR1.67[.77–3.64] | [Barow/WAKE-UP](https://doi.org/10.1001/jamaneurol.2019.0351) | Rates OK; “no disability” overstates mRS0–1 and absence of interaction does not prove equivalent efficacy | Both languages now say no significant disability (mRS0–1); retain exploratory subgroup uncertainty. |
| IVT inferred start | 758–770 |reopening1–3hafterdrug,assessment~2h | Assessment time does not identify biological reopening latency | Questionable | Retain model assumption; do not use as actual drug administration time. |
| Reperfusion categories/no-reflow |`treatment.ts:40–56,170–176` |2a.25∈1–49%;2b50.58∈50–66%;2b67.78∈67–89%;2c.95∈90–99%;3=1;noReflow0–.5 | Ranges [eTICI][etici] OK; representatives/no-reflow cap assumptions | Retain valid ranges; correctedgrade1; pin ranges in tests. |
| New-territory emboli |`treatment.ts:96–100`;1080 |ACA27.8%ofnew-territory infarcts;overall5–9% | [Singh](https://pubmed.ncbi.nlm.nih.gov/37082967/):103/1092INT,reported9.3%;most(91/103) not linked to angiographically visible occlusion | ACA quotation OK; generic5–9% approximate/definition-dependent | NeitherACA27.8%of all EVT patients nor a validated incidence for the modeled visible distal embolus. |
| Benefit labels | 807–832 |NIHSSdifference2,saved50mL,sliver.5mL/10%,LIS24h | No guideline equivalent | Questionable | Retain UI thresholds. |
| Spontaneous recanalization | 971–974 |24%,IVT46%,OR4.4,53studies | [Rha/Saver](https://pubmed.ncbi.nlm.nih.gov/17272772/) | OK rounded24.1/46.2%; outcome OR4.43 uses33studies/998patients, not all53 | Retain historical attribution. |
| Ear prodrome | 1218 |13/82within1mo;9/29delayedCNSsigns | [Lee2009](https://doi.org/10.1161/STROKEAHA.109.564682), [Lee/Baloh][hearing] | OK study-specific | Retain. |
| Ear combined deficit | 1232,1255 |60%of82;56/62caloricweakness | [Lee2009](https://doi.org/10.1161/STROKEAHA.109.564682), [Kim](https://pubmed.ncbi.nlm.nih.gov/24581671/) | OK | Retain; corrected hearing follow-up/MRI population above. |
| Spinal onset/recovery | 1289,1316 |115patients;86%catheter;68%nadirwithin1h;23%dead~3y;survivors42%wheelchair,54%catheter,29%pain;41%regainwalking | [Robertson][cord1] | OK cohort; walking denominator74wheelchair users atdischarge,not atnadir; follow-up mean3years | Retain cohort framing. |
| Spinal diagnostics | 1289,1303 |133;77%nadirwithin12h;40%pencil,65%owl-eye;19/29DWI;24%initialMRI normal;20%vascularfinding | [Zalewski][cord2] | Numbers OK; denominators corrected above | Retain percentages. |
| Neural failure/growth narrative | 1424,1999 |10sfunctional failure;striatum30min;capsule2–3h;cortex15–30minmonkeys;penumbrahours–day;median3–5mL/h,poor>10 | Species/flow-dependent; [growth studies][growth1] | Questionable deterministic timing | Retain existing caveats. |
| CT/DWI event clock | 2009,2019,3615–3631 |DWI.1h–336h;CT~6h;fogging2–3wk;ADCweek1low/week2pseudo;cavity1mo | [Lansberg][adc] supports ADC;other timing variable | Questionable hard boundaries | No universal6h CT threshold inferred. |
| Deterioration | 2359 |53patients;36%by24h,68%by48h,deathpeakday3 | [Qureshi](https://experts.umn.edu/en/publications/timing-of-neurologic-deterioration-in-massive-middle-cerebral-art/) | OK numbers; selected deteriorating cohort, now clarified in both languages | Retain, note contradicts any universal earliestday3 deterioration. |
| Hemorrhage risk tiers | 2888–2889,2919–2925 |30/70/100mL;late6h;IVTsICH2–7%,24–36h/up to7d | Definitions vary,[AHA/ASA][aha] | Questionable deterministic tiering | Retain educational warnings only. |
| Locked-in prognosis | 2979–2980 |mortality60%of139;rehab14patients42%swallow/28%speech | Small historical, selected cohorts; [Patterson/Grabois](https://pubmed.ncbi.nlm.nih.gov/3738962/), [Casanova](https://pubmed.ncbi.nlm.nih.gov/12808539/) | OK historical selected cohorts | Retain attribution; not universal survival prediction. |
| Central fever | 3042–3043 |39°C;74patients4%cortex/3%BAO;4/9brainstemcoma;70%1momortality | [Sung](https://pubmed.ncbi.nlm.nih.gov/19521083/), [Parvizi](https://pubmed.ncbi.nlm.nih.gov/12805123/) | OK study quotes | Clarify English39°C boundary as inclusive. |
| Medullary respiratory failure | 3095 |2–6%;8/102within10d;5/43acute | [Pavsic](https://pubmed.ncbi.nlm.nih.gov/32064553) quotes2–6%in itsbackground,not its28-patient sleep study result; [Saito](https://pubmed.ncbi.nlm.nih.gov/35091384/):8/102fatal respiratory failure; [Norrving](https://doi.org/10.1212/WNL.41.2_Part_1.244):5/43respiratory or cardiac deaths | OK attributed rates with these distinctions;2–6%not independently pooled here | Preserve current narrative’s older-series attribution; original underlying2–6%series not all independently retrieved. |
| Dysphagia warning | 3161,3191–3211 |supratentorial>60mL;prevalence37–78% | Prevalence37–45%screening,51–55%clinical,64–78%instrumental,[Martino][dysphagia];screening applies broadly,[AHA/ASA][aha] | Questionable warning-selection cutoff | Not a clinical screening exemption below60mL. |
| Cardiac risk | 3217–3290;`simulate.ts:1473,1695` |insula30%,NIHSS≥16;846patients19%,4.1%,days2–3/week2;AF23.7% | [Prosser](https://pubmed.ncbi.nlm.nih.gov/17569877/), [Sposato](https://pubmed.ncbi.nlm.nih.gov/25748102/) | OK study rates; questionable30%/NIHSS16trigger. AF23.7%is pooled estimated combined detection in stroke-or-TIA populations across sequential hospital/follow-up phases | Retain warning heuristics; clarify AF monitoring denominator in both languages. |
| DVT | 3301–3318;`simulate.ts:1482–1485` |days2–30;IPC12.1→8.5%proximalDVT30d | [CLOTS3](https://doi.org/10.1016/S0140-6736(13)61050-8) | OK rates in immobile stroke patients(1438perarm);questionable fixed window | Retain. |
| Early seizures | 3324–3354 |7dboundary;lobar5.9/deep.6%;cortical6.5%;HT12.5%=4/32 | [Labovitz][seizure1], [Kilpatrick](https://pubmed.ncbi.nlm.nih.gov/2302087/), [Beghi](https://pubmed.ncbi.nlm.nih.gov/21975208/) | OK study rates | Correct status denominator above. |
| Late seizures | 3355–3371 |>7d;4%1y/8%5y;SeLECT.7–63%1y | [Galovic](https://pubmed.ncbi.nlm.nih.gov/29413315/) | OK prediction-model range; not all patients | Retain. |
| CCD | 1674–1676,3457–3493 |cortex30mL,onset6h;PET58%;thalamic9/39 | [Pantano](https://pubmed.ncbi.nlm.nih.gov/3488093/)58%ofscans; [thalamic MRI](https://pmc.ncbi.nlm.nih.gov/articles/PMC3914872/)9/39 | Quotes OK;30mL/6h trigger questionable | Retain calibration. |
| Wallerian/HOD clocks | 3513–3580,688 |DTI1–2wk,T2dark4wk/bright10–14wk;MCP1mo;HODT2~1mo,enlargement6mo;38–67%of15;palatal3mo | [Kuhn](https://pubmed.ncbi.nlm.nih.gov/2740501/) verifies conventional CST MRI timing,not DTI or MCP intervals; [Goyal](https://pubmed.ncbi.nlm.nih.gov/10871017/) verifies HODT2~1mo persisting≥3–4y and **hypertrophy** resolving3–4y; [Steidl](https://doi.org/10.3389/fneur.2022.950191) verifies sequence/rater-dependent38–67% | Partially verified; original blanketOK overclaimed | Retain qualified narrative; DTI1–2wk,MCP1mo and exact palatal3mo clocks are not established by these citations. T2signal does not necessarily resolve with enlargement. |
| Depression/cognition | 3649–3655 |31%;39–52%5y;2950patients12cohorts | [Hackett][depression], [Ayerbe](https://doi.org/10.1192/bjp.bp.111.107664), [Weaver](https://pubmed.ncbi.nlm.nih.gov/33901427/) | Depression estimates OK; Weaver “about half in1y” is background, whereas measured1286/2950=43.6%,assessed up to15mo | Bilingual text now quotes the measured43.6%and15mo population. Dementia populations remain distinct. |
| BP | 575,3683–3684 |MAP120≈170/95;IVTpre185/110,post180/10524h;IST17398,nadir150,+4.2%/10;pressortrial153;postEVTavoidSBP<120 | [AHA/ASA][aha]; [IST](https://pubmed.ncbi.nlm.nih.gov/11988609/); [pressor trial](https://pubmed.ncbi.nlm.nih.gov/31645472/); [ENCHANTED2/MT](https://pubmed.ncbi.nlm.nih.gov/36341753/);MAP=(170+2×95)/3=120 | OK arithmetic and quoted study associations;2026 guideline uses<185/110beforeIVT,<180/105for≥24hafterIVT and≤180/105during/24hafterEVT;also warns against intensiveSBPtarget<140for72hafter successful anteriorEVT | ENCHANTED2/MT<120result is correct but does not exhaust current guidance. Pressortrial also includedprogressivestrokes;model monotonic benefit from highMAP remains questionable. |
| Spasticity | 3706;`clinical.ts:205–208` |19%3mo;42.6%6mo,15.6%severe;24.5%within2wk | [Sommerfeld](https://pubmed.ncbi.nlm.nih.gov/14684785/), [Urban](https://pubmed.ncbi.nlm.nih.gov/20705930/), [Wissel](https://pubmed.ncbi.nlm.nih.gov/20140444/) | OK population-specific:Urban6mo211reassessed patients initially withcentralparesis,not allstroke | Retain rounded43/16%and¼. |
| Central pain | 3720–3729 |8%1y;thalamic1/7,geniculo1/4,⅓firstweek;lateralmedulla¼within6mo | [Andersen](https://doi.org/10.1016/0304-3959(94)00144-4):16/207survivors≥6mo ableto communicate reliably; [Nasreddine](https://pubmed.ncbi.nlm.nih.gov/9153442/):36%week1among publishedpaincases; [MacGowan](https://pubmed.ncbi.nlm.nih.gov/9222179/):16/63LMI | Numbers OK; “8%ofallstrokes” was wrong denominator | Corrected bothlanguages to16/207selectedsurvivors; preserve case-series/reporting caveats. |
| REM behavior | 3748–3769 |6/27at3mo,5ventralpons1medulla;noRBDin15PSGpatients | [Tang](https://doi.org/10.1186/1471-2377-14-88), [Tellenbach](https://doi.org/10.1111/jsr.13640) | OK with questionnaire/PSG distinction | Retain; absence ofRBD≠absence ofREM-without-atonia. |
| Steal symptoms | 3790 |armpressuregap40–50mmHg | [Labropoulos](https://pubmed.ncbi.nlm.nih.gov/20531004/) | OK probabilistic association, not a hard diagnostic boundary | Retain probabilistic wording. |
| Regional fractions and display rules | 1847,2973,3231,3356–3358,3512,3533,3553,3759;`simulate.ts:1264,2241,2699,2710,2745–2752` |.25/.3/.4/.5regionaldamage;20%dominance;50%lacune-core;bilateralshift>.05mm | Internal phenotype/display rules, not clinical diagnostic thresholds | Questionable as medical constants | No isolated replacements; exclude floating-point epsilons from medical meaning. |


## Derived anatomical volumes per vessel

These are **supply-weighted brain territory volumes**, not infarct core predictions. Infarct volume at any time is `sum(bed.volume × infarct fraction)` (`simulate.ts:2771–2811`), depending on occlusion duration, flow, collaterals, tissue type and reperfusion. No single “core mL per vessel” is defensible.

Method: traverse authored parent edges, continuity and midpoint origins; exclude visual-only, variant-only and collateral routes; do not cross communicating routes, but retain their directly supplied perforators. Sum `bed.volume × normalized supply share`. Parent/child territories overlap; vertebral arteries share the basilar tree. Rows must not be summed. Values rounded to0.001mL for reproducibility, not clinical precision. Anatomy sources: `anatomy/index.ts:53,63,70`, `anatomy/expand.ts:45`, `anatomy/territories.ts:4`; vessel definitions ACA`vessels.ts:478`,MCA`:668`,basilar`:1274`,PCA`:1592`.

[CT vascular territory mapping][territory] reports pooled per-side territory medians in the **19 patients without vessel occlusion** (not all167 enrolled): ACA154[IQR125–193],MCA350[322–396],PCA180[151–214]mL. Model ACA≈139–144,MCA≈297–308,PCA≈90–93mL. **Questionable**, especially PCA: different atlas, brain normalization and assignment methods preclude treating cohort IQRs as mandatory limits. [Liu atlas][atlas] provides topology, not validation of these normalized per-vessel volumes. All branch rows share this verdict; **unchanged** pending anatomically coherent recalibration.

| Vessel base | Right mL | Left mL | Midline/other mL |
|---|---:|---:|---|
| brachiocephalic | | |756.730|
| subclavian_prox_r / subclavian_prox_l |305.819|306.784| |
| subclavian_dist |0|0| |
| cca_r / cca_l |450.911|457.034| |
| ica_cervical |450.911|457.034| |
| eca,eca_facial,eca_sta,eca_maxillary,eca_occipital |0|0|Extracranial tissue excluded|
| va_extracranial |305.819|306.784| |
| ica_petrous_cavernous |450.911|457.034| |
| ophthalmic |0|0|Retina excluded from brain|
| ica_ophthalmic_seg |450.911|457.034| |
| ica_terminal |449.595|455.873| |
| acha |9.016|8.621| |
| aca_a1 |143.853|138.960| |
| acomm | | |0; communicating route excluded|
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
| pcomm,tuberothalamic |1.316|1.161|Direct supply only|
| trigeminal_persistent |—|—|Variant-only, no default volume|
| va_v4_prox |305.819|306.784| |
| va_v4_dist |271.397|271.572| |
| lat_medullary_perf |.761|.937| |
| asa_root |.755|.754| |
| asa | | |0brain;spinal tissue excluded|
| pica |34.422|35.212| |
| pica_medial |4.511|4.577| |
| pica_lateral |29.615|30.271| |
| basilar_lower | | |269.748|
| basilar_mid | | |245.312|
| basilar_upper | | |241.410|
| basilar_tip | | |185.352|
| aica |11.404|11.478| |
| labyrinthine |0|0|Ear excluded|
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

Collateral routes have no independent fixed tissue volume: bilateral `lepto_aca_mca_{precentral,central,parietal,frontal,orbital}`, `lepto_pca_mca_{parietal,superior_parietal,occipital,temporal}`, `lepto_aca_pca_callosal`, `lepto_pica_aica`, `lepto_aica_sca`, `lepto_pica_sca_{lateral,vermian}`, `coll_acha_pchor`, `coll_ec_ic_{orbital,meningeal}`, `coll_occipital_va`, plus midline `lepto_pica_crossed` and `lepto_sca_crossed`.

## Verification and limits

Independent coverage: every table row was revisited. Measured quotations were checked against the cited primary-source abstract/full text or indexed primary-source text; exact unvalidated coefficients retain Questionable verdicts. The139 numerical anatomical entries were independently recomputed from imported anatomy and authored graph edges:139/139 match within0.00051mL rounding. Brain volume1250.8mL and aggregateflow557.0384059826916mL/min also reproduce. This establishes model arithmetic, not anatomical validity.

Test review: eTICI bounds are literal published percentages; zero-rescue compares treated and untreated simulations. A new grade1 narrative assertion failed on HEAD (1failed/19passed) before the fix. The30%cutoff now checks behavior just below/above it. Shift-band literals genuinely come from Ropper, but neither that check nor default surgery≤48h establishes clinical validity. The ADC half-curve test was incorrectly presented as a published bound; it is now explicitly an illustrative model regression with a separate DWI shine-through check. String assertions guard bilingual wording, not trial effectiveness.

The commit’s original verification history is not independent evidence:9fcab32 itself changed codexReview1.test.ts, contrary to the original final sentence. This recheck leaves that file untouched and makes no commit. Independent final verification on the corrected code: `npx tsc --noEmit` exited0; `npx vitest run` exited0 with90/90files and10,019/10,019tests passing (507.97s), including20medical-value tests and5unchanged codexReview1 tests. Its working-file and HEAD blob hashes both equal `b8b7762457460d77d240fd9cf1c6becb2aace3cb`. jsdom canvas and React act warnings are non-failing.

This is a numerical source audit, not clinical validation. Unvalidated calibrations remain questionable even when the motivating cohort numbers are verified. Supporting a qualitative mechanism does not validate the exact coefficient used here. Major outstanding work is regional kinetics, atlas/volume calibration, probabilistic swelling/herniation and regional neuron density. Those changes require a separately approved phase under the five-file limit.

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

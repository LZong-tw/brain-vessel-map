/**
 * UI strings for the swelling / oedema display (3D deformation, "oedema / imaging" colouring).
 * Traditional Chinese first, English second.
 */

import type { Lang } from '../anatomy/types';

export interface EdemaStrings {
  /** colour-mode button */
  colorMode: string;
  scaleTitle: string;
  scaleOption: (k: number) => string;
  scaleHint: string;
  /** shown whenever the deformation is exaggerated */
  exaggerated: (k: number) => string;
  legend: {
    normal: string;
    cytotoxic: string;
    both: string;
    vasogenic: string;
    chronic: string;
  };
  legendNote: string;
}

const zh: EdemaStrings = {
  colorMode: '水腫／影像',
  scaleTitle: '水腫顯示倍率',
  scaleOption: (k) => (k === 1 ? '1×（真實）' : `${k}×`),
  scaleHint:
    '3D 模型會依水腫膨出、萎縮內縮，並顯示中線偏移與腦室受壓或擴大。1× 為真實比例：腫脹通常只讓表面移動幾毫米；3×、5× 是為了教學而放大的形變，不代表真實大小。',
  exaggerated: (k) => `形變已誇大 ${k} 倍，並非真實比例`,
  legend: {
    normal: '正常組織',
    cytotoxic: '只有 DWI 亮（細胞毒性水腫，最初數小時）',
    both: 'DWI 與 T2／FLAIR 都亮（血管性水腫加入）',
    vasogenic: '只有 T2／FLAIR 亮（血管性水腫；之後是一直亮著的膠質疤痕）',
    chronic: '萎縮、軟化（慢性）：空腔在 FLAIR 上像腦脊髓液一樣暗（T2 上是亮的），疤痕邊緣仍亮',
  },
  legendNote: '依此時間點 MRI 會看到的表現著色',
};

const en: EdemaStrings = {
  colorMode: 'Oedema (imaging)',
  scaleTitle: 'Oedema display scale',
  scaleOption: (k) => (k === 1 ? '1× (true)' : `${k}×`),
  scaleHint:
    'The 3D model bulges where tissue swells and sinks where it shrinks, and shows midline shift and compressed or enlarged ventricles. 1× is true scale: swelling usually moves the surface by only a few millimetres; 3× and 5× exaggerate the deformation for teaching and do not show real sizes.',
  exaggerated: (k) => `Deformation exaggerated ${k}× — not true scale`,
  legend: {
    normal: 'Normal tissue',
    cytotoxic: 'DWI-bright only (cytotoxic oedema, first hours)',
    both: 'DWI and T2/FLAIR bright (vasogenic oedema joins)',
    vasogenic: 'T2/FLAIR-bright only (vasogenic oedema; later the gliotic scar, which stays bright)',
    chronic: 'Shrunken / softened (chronic): the cavity is dark like CSF on FLAIR (bright on T2), with a bright scar rim',
  },
  legendNote: 'Coloured by what MRI would show at this time',
};

const cn: EdemaStrings = {
  colorMode: '脑水肿／影像', scaleTitle: '脑水肿显示倍率', scaleOption: (k) => k === 1 ? '1×（真实）' : `${k}×`,
  scaleHint: '3D 模型随脑水肿向外膨出、随萎缩向内收缩，并显示中线移位及脑室受压或扩大。1× 为真实比例：肿胀通常仅使表面移动数毫米；3×、5× 为教学而放大的形变，并非真实大小。',
  exaggerated: (k) => `形变已放大 ${k} 倍，并非真实比例`,
  legend: {
    normal: '正常组织', cytotoxic: '仅 DWI 高信号（细胞毒性脑水肿，最初数小时）',
    both: 'DWI 和 T2／FLAIR 均为高信号（出现血管源性脑水肿）',
    vasogenic: '仅 T2／FLAIR 高信号（血管源性脑水肿；随后为持续高信号的胶质瘢痕）',
    chronic: '萎缩、软化（慢性）：空腔在 FLAIR 上呈脑脊液样低信号（T2 上为高信号），瘢痕边缘仍为高信号',
  }, legendNote: '按该时间点的 MRI 表现着色',
};
const de: EdemaStrings = {
  colorMode: 'Hirnödem / Bildgebung', scaleTitle: 'Darstellungsmaßstab des Hirnödems',
  scaleOption: (k) => k === 1 ? '1× (maßstabsgetreu)' : `${k}×`,
  scaleHint: 'Das 3D-Modell wölbt sich bei Schwellung nach außen und zieht sich bei Atrophie nach innen zurück. Es zeigt Mittellinienverlagerung sowie komprimierte oder erweiterte Ventrikel. 1× entspricht dem tatsächlichen Maßstab: Schwellungen verschieben die Oberfläche meist nur um wenige Millimeter. 3× und 5× vergrößern die Verformung zu Lehrzwecken und zeigen keine tatsächlichen Größen.',
  exaggerated: (k) => `Verformung ${k}-fach vergrößert — nicht maßstabsgetreu`,
  legend: {
    normal: 'Normales Gewebe', cytotoxic: 'Nur DWI-hyperintens (zytotoxisches Hirnödem, erste Stunden)',
    both: 'DWI und T2/FLAIR hyperintens (zusätzlich vasogenes Hirnödem)',
    vasogenic: 'Nur T2/FLAIR hyperintens (vasogenes Hirnödem; später anhaltend hyperintense Glianarbe)',
    chronic: 'Atrophie / Erweichung (chronisch): die Höhle ist in FLAIR liquorähnlich hypointens (in T2 hyperintens), mit hyperintensem Narbensaum',
  }, legendNote: 'Färbung nach dem erwarteten MRT-Befund zu diesem Zeitpunkt',
};
const ja: EdemaStrings = {
  colorMode: '脳浮腫／画像', scaleTitle: '脳浮腫の表示倍率', scaleOption: (k) => k === 1 ? '1×（実際の縮尺）' : `${k}×`,
  scaleHint: '3D モデルは浮腫で外側へ膨隆し、萎縮で内側へ縮小します。正中偏位と脳室の圧迫・拡大も表示します。1× は実際の縮尺で、腫脹による表面の移動は通常数 mm です。3×、5× は教育目的で変形を拡大したもので、実際の大きさではありません。',
  exaggerated: (k) => `変形を ${k} 倍に拡大 — 実際の縮尺ではありません`,
  legend: {
    normal: '正常組織', cytotoxic: 'DWI のみ高信号（細胞傷害性浮腫、最初の数時間）',
    both: 'DWI と T2／FLAIR が高信号（血管原性浮腫が加わる）',
    vasogenic: 'T2／FLAIR のみ高信号（血管原性浮腫；その後は高信号が持続するグリオーシス）',
    chronic: '萎縮・軟化（慢性）：空洞は FLAIR で髄液様の低信号（T2 で高信号）となり、瘢痕の辺縁は高信号が残る',
  }, legendNote: 'この時点で予想される MRI 所見に基づく配色',
};
export const EDEMA_UI: Record<Lang, EdemaStrings> = { 'zh-TW': zh, en, 'zh-CN': cn, de, ja };

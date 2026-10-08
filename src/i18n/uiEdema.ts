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

export const EDEMA_UI: Record<Lang, EdemaStrings> = { 'zh-TW': zh, en };

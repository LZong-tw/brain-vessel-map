import type { Lang } from '../anatomy/types';

const en = {
  title: '2D slices', axial: 'Axial', coronal: 'Coronal', sagittal: 'Sagittal', plane: 'Slice plane', position: 'Slice position',
  loading: 'Loading T1 slices…', error: 'Slice data could not be loaded.', unsupported: 'This browser cannot decompress the slice data. Use a browser with gzip DecompressionStream support.', retry: 'Retry',
  image: 'T1 reference slice. Use arrow keys to change the slice.', outlines: 'Liu reference territory outlines', heatmap: 'Model infarct fraction heatmap',
  legend: 'Model infarct fraction: 0–100% of each perfusion bed. Colour intensity is continuous.',
  limitation: 'Reference anatomy, not a patient scan. Liu territory alignment uses the existing approximate atlas transform. The heatmap repeats each model bed’s infarct fraction over its assigned voxels; the exact location of dead tissue within that bed is unknown. Outlines are reference territories, not lesion boundaries.',
  fallback: 'Spatial fallback: bed-level fractions are shown uniformly; exact lesion locations within each bed are unresolved.',
  missing: 'Unassigned voxels have no model overlay.', source: 'Sources', visible: 'Model beds in this slice', bed: 'Perfusion bed', fraction: 'Infarct fraction', none: 'No assigned model beds in this slice.',
  right: 'Right', left: 'Left', anterior: 'Anterior', posterior: 'Posterior', superior: 'Superior', inferior: 'Inferior',
};
export type SliceStrings = typeof en;
export const SLICES: Record<Lang, SliceStrings> = {
  en,
  'zh-TW': {
    title: '2D 切片', axial: '軸位', coronal: '冠狀位', sagittal: '矢狀位', plane: '切片方向', position: '切片位置',
    loading: '正在載入 T1 切片…', error: '無法載入切片資料。', unsupported: '此瀏覽器無法解壓縮切片資料，請使用支援 gzip DecompressionStream 的瀏覽器。', retry: '重試', image: 'T1 參考切片。使用方向鍵切換切片。', outlines: 'Liu 參考供血區輪廓', heatmap: '模型梗塞比例熱圖',
    legend: '模型梗塞比例：各灌流單元的 0–100%。顏色強度連續變化。',
    limitation: '這是參考解剖，不是病人的影像。Liu 供血區對齊採用既有的近似圖譜轉換。熱圖將每個模型灌流單元的梗塞比例重複顯示在分配給它的體素上；無法確定該單元內壞死組織的實際位置。輪廓表示參考供血區，不是病灶邊界。',
    fallback: '空間近似：均勻顯示灌流單元的比例，無法確定每個單元內的確切病灶位置。', missing: '未分配的體素沒有模型疊圖。', source: '資料來源', visible: '本切片的模型灌流單元', bed: '灌流單元', fraction: '梗塞比例', none: '本切片沒有分配的模型灌流單元。',
    right: '右', left: '左', anterior: '前', posterior: '後', superior: '上', inferior: '下',
  },
  'zh-CN': {
    title: '2D 切片', axial: '轴位', coronal: '冠状位', sagittal: '矢状位', plane: '切片方向', position: '切片位置',
    loading: '正在加载 T1 切片…', error: '无法加载切片数据。', unsupported: '此浏览器无法解压缩切片数据，请使用支持 gzip DecompressionStream 的浏览器。', retry: '重试', image: 'T1 参考切片。使用方向键切换切片。', outlines: 'Liu 参考供血区轮廓', heatmap: '模型梗死比例热图',
    legend: '模型梗死比例：各灌注单元的 0–100%。颜色强度连续变化。',
    limitation: '这是参考解剖，不是患者的影像。Liu 供血区对齐采用现有的近似图谱变换。热图将每个模型灌注单元的梗死比例重复显示在分配给它的体素上；无法确定该单元内坏死组织的实际位置。轮廓表示参考供血区，不是病灶边界。',
    fallback: '空间近似：均匀显示灌注单元的比例，无法确定每个单元内的确切病灶位置。', missing: '未分配的体素没有模型叠图。', source: '数据来源', visible: '本切片的模型灌注单元', bed: '灌注单元', fraction: '梗死比例', none: '本切片没有分配的模型灌注单元。',
    right: '右', left: '左', anterior: '前', posterior: '后', superior: '上', inferior: '下',
  },
  de: {
    title: '2D-Schnitte', axial: 'Axial', coronal: 'Koronal', sagittal: 'Sagittal', plane: 'Schnittebene', position: 'Schnittposition',
    loading: 'T1-Schnitte werden geladen…', error: 'Die Schnittdaten konnten nicht geladen werden.', unsupported: 'Dieser Browser kann die Schnittdaten nicht dekomprimieren. Verwenden Sie einen Browser mit gzip-DecompressionStream-Unterstützung.', retry: 'Erneut versuchen', image: 'T1-Referenzschnitt. Mit den Pfeiltasten den Schnitt wechseln.', outlines: 'Referenzkonturen der Versorgungsgebiete nach Liu', heatmap: 'Modellkarte des Infarktanteils',
    legend: 'Infarktanteil im Modell: 0–100% jeder Perfusionseinheit. Die Farbintensität ändert sich kontinuierlich.',
    limitation: 'Referenzanatomie, keine Patientenaufnahme. Die Versorgungsgebiete nach Liu werden mit der bestehenden näherungsweisen Atlastransformation ausgerichtet. Die Karte zeigt den Infarktanteil jeder Perfusionseinheit auf allen ihr zugeordneten Voxeln; die genaue Lage abgestorbenen Gewebes innerhalb der Einheit ist unbekannt. Die Konturen kennzeichnen Referenzversorgungsgebiete, keine Läsionsgrenzen.',
    fallback: 'Räumliche Näherung: Der Anteil jeder Perfusionseinheit wird gleichmäßig dargestellt; die genaue Läsionsposition innerhalb der Einheit bleibt unbekannt.', missing: 'Nicht zugeordnete Voxel erhalten keine Modellüberlagerung.', source: 'Quellen', visible: 'Perfusionseinheiten in diesem Schnitt', bed: 'Perfusionseinheit', fraction: 'Infarktanteil', none: 'In diesem Schnitt sind keine Perfusionseinheiten zugeordnet.',
    right: 'Rechts', left: 'Links', anterior: 'Anterior', posterior: 'Posterior', superior: 'Superior', inferior: 'Inferior',
  },
  ja: {
    title: '2D 断面', axial: '横断面', coronal: '冠状断面', sagittal: '矢状断面', plane: '断面方向', position: '断面位置',
    loading: 'T1 断面を読み込み中…', error: '断面データを読み込めませんでした。', unsupported: 'このブラウザーは断面データを解凍できません。gzip DecompressionStream に対応したブラウザーを使用してください。', retry: '再試行', image: 'T1 参照断面。矢印キーで断面を変更できます。', outlines: 'Liu の参照血管支配領域の輪郭', heatmap: 'モデルの梗塞割合ヒートマップ',
    legend: 'モデルの梗塞割合：各灌流単位の 0–100%。色の強度は連続的に変化します。',
    limitation: '参照解剖であり、患者の画像ではありません。Liu の支配領域は既存の近似的なアトラス変換で位置合わせされています。各モデル灌流単位の梗塞割合を、その単位に割り当てられた全ボクセルに表示します。単位内の壊死組織の正確な位置は不明です。輪郭は参照支配領域を示し、病変の境界ではありません。',
    fallback: '空間的近似：灌流単位の割合を均一に表示します。各単位内の正確な病変位置は不明です。', missing: '未割り当てのボクセルにはモデルを重ねません。', source: '出典', visible: 'この断面のモデル灌流単位', bed: '灌流単位', fraction: '梗塞割合', none: 'この断面に割り当てられた灌流単位はありません。',
    right: '右', left: '左', anterior: '前', posterior: '後', superior: '上', inferior: '下',
  },
};

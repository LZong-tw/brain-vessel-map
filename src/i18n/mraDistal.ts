import type { Lang } from '../anatomy/types';

interface Strings {
  mode: string; notice: string; badge: string; loading: string; error: string; retry: string;
  source: string; families: string; clear: string; camera: string; cameraHelp: string;
  central: string; leftACA: string; rightACA: string; leftMCA: string; rightMCA: string; leftPCA: string; rightPCA: string;
}
export const MRA_DISTAL: Record<Lang, Strings> = {
  en: {
    badge: 'Individual MRA reference · placement unvalidated · no simulated vessel flow or named-branch mapping',
    mode: 'Show individual distal MRA anatomy',
    notice: 'BG0001 reference vessels replace the authored vessel display. Placement on this brain is unvalidated. Family labels only; no named-branch mapping, simulated vessel-flow colors or source lesion predictions. Brain colors still show the current arterial case. Source gaps are retained. Lines use neighboring source voxels; their connectivity is a rendering assumption, not verified vessel topology.',
    loading: 'Loading source anatomy; the simulation vessels remain shown.', error: 'Source anatomy could not be loaded; the simulation vessels remain shown.', retry: 'Retry source anatomy',
    source: 'Bravissima / BraVa source and attribution', families: 'Source arterial families', clear: 'Clear source selection', camera: 'Reference camera', cameraHelp: 'Camera: arrows rotate, +/− zoom. Families: Tab/arrows focus, Enter selects, Esc clears.',
    central: 'Pre-Willis / circle of Willis', leftACA: 'Left ACA', rightACA: 'Right ACA', leftMCA: 'Left MCA', rightMCA: 'Right MCA', leftPCA: 'Left PCA', rightPCA: 'Right PCA',
  },
  'zh-TW': {
    badge: '個別 MRA 參考 · 位置尚未驗證 · 無模擬血流或具名分支對應',
    mode: '顯示個別遠端 MRA 血管解剖', notice: 'BG0001 參考血管取代人工繪製的血管顯示。在此腦模型上的位置尚未驗證。僅有動脈系標籤，沒有具名分支對應、模擬血管血流顏色或來源病灶預測。腦部顏色仍顯示目前的動脈病例。保留來源中的缺口。線段連接相鄰來源體素；連通性是繪圖假設，並非已驗證的血管拓樸。',
    loading: '正在載入來源解剖；仍顯示模擬血管。', error: '無法載入來源解剖；仍顯示模擬血管。', retry: '重新載入來源解剖', source: 'Bravissima／BraVa 來源與署名', families: '來源動脈系', clear: '清除來源選取', camera: '參考相機', cameraHelp: '相機：方向鍵旋轉，+/− 縮放。動脈系：Tab／方向鍵移動焦點，Enter 選取，Esc 清除。', central: 'Willis 環之前／Willis 動脈環', leftACA: '左側 ACA', rightACA: '右側 ACA', leftMCA: '左側 MCA', rightMCA: '右側 MCA', leftPCA: '左側 PCA', rightPCA: '右側 PCA',
  },
  'zh-CN': {
    badge: '个体 MRA 参考 · 位置尚未验证 · 无模拟血流或具名分支对应',
    mode: '显示个体远端 MRA 血管解剖', notice: 'BG0001 参考血管取代人工绘制的血管显示。在此脑模型上的位置尚未验证。仅有动脉系标签，没有具名分支对应、模拟血管血流颜色或来源病灶预测。脑部颜色仍显示当前的动脉病例。保留来源中的缺口。线段连接相邻来源体素；连通性是绘图假设，并非已验证的血管拓扑。',
    loading: '正在加载来源解剖；仍显示模拟血管。', error: '无法加载来源解剖；仍显示模拟血管。', retry: '重新加载来源解剖', source: 'Bravissima／BraVa 来源与署名', families: '来源动脉系', clear: '清除来源选择', camera: '参考相机', cameraHelp: '相机：方向键旋转，+/− 缩放。动脉系：Tab／方向键移动焦点，Enter 选择，Esc 清除。', central: 'Willis 环之前／大脑动脉环', leftACA: '左侧 ACA', rightACA: '右侧 ACA', leftMCA: '左侧 MCA', rightMCA: '右侧 MCA', leftPCA: '左侧 PCA', rightPCA: '右侧 PCA',
  },
  de: {
    badge: 'Individuelle MRA-Referenz · Platzierung unvalidiert · kein simulierter Gefäßfluss oder Zuordnung benannter Äste',
    mode: 'Individuelle distale MRA-Anatomie anzeigen', notice: 'BG0001-Referenzgefäße ersetzen die manuell erstellte Gefäßdarstellung. Die Platzierung auf diesem Gehirn ist nicht validiert. Nur Arteriengruppen; keine Zuordnung benannter Äste, simulierten Gefäßflussfarben oder Läsionsvorhersagen für die Quelle. Gehirnfarben zeigen weiterhin den aktuellen arteriellen Fall. Lücken der Quelle bleiben erhalten. Linien verbinden benachbarte Quellvoxel; die Konnektivität ist eine Darstellungsannahme, keine validierte Gefäßtopologie.',
    loading: 'Quellanatomie wird geladen; Simulationsgefäße bleiben sichtbar.', error: 'Quellanatomie konnte nicht geladen werden; Simulationsgefäße bleiben sichtbar.', retry: 'Quellanatomie erneut laden', source: 'Bravissima / BraVa: Quelle und Attribution', families: 'Arteriengruppen der Quelle', clear: 'Quellauswahl aufheben', camera: 'Referenzkamera', cameraHelp: 'Kamera: Pfeile drehen, +/− zoomen. Gruppen: Tab/Pfeile fokussieren, Enter wählt, Esc hebt die Auswahl auf.', central: 'Vor dem Circulus arteriosus / Circulus arteriosus cerebri', leftACA: 'Linke ACA', rightACA: 'Rechte ACA', leftMCA: 'Linke MCA', rightMCA: 'Rechte MCA', leftPCA: 'Linke PCA', rightPCA: 'Rechte PCA',
  },
  ja: {
    badge: '個体 MRA 参考 · 配置は未検証 · 模擬血流や名称付き分枝との対応なし',
    mode: '個体の遠位 MRA 血管解剖を表示', notice: 'BG0001 の参考血管で手作業の血管表示を置き換えます。この脳への配置は未検証です。動脈系のラベルのみで、名称付き分枝との対応、模擬血管血流の色、元の症例の病変予測はありません。脳の色は現在の動脈症例を示します。元データの欠損を保持します。線分は隣接する元データのボクセルを結びます。連結性は描画上の仮定であり、検証済みの血管トポロジーではありません。',
    loading: '元の解剖データを読込中。模擬血管は引き続き表示されます。', error: '元の解剖データを読み込めません。模擬血管は引き続き表示されます。', retry: '元の解剖データを再読込', source: 'Bravissima／BraVa の出典と帰属', families: '元データの動脈系', clear: '元データの選択を解除', camera: '参考カメラ', cameraHelp: 'カメラ：矢印で回転、+/− で拡大・縮小。動脈系：Tab／矢印でフォーカス、Enter で選択、Esc で解除。', central: 'Willis 動脈輪より近位／大脳動脈輪', leftACA: '左 ACA', rightACA: '右 ACA', leftMCA: '左 MCA', rightMCA: '右 MCA', leftPCA: '左 PCA', rightPCA: '右 PCA',
  },
};

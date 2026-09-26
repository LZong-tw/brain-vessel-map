/**
 * 簡單的字典式 i18n 系統
 * Simple dictionary-based i18n system
 */

export type Language = 'zh-TW' | 'en';

export interface Translations {
  title: string;
  subtitle: string;
  disclaimer: string;
  emergency: string;
  controls: {
    title: string;
    reset: string;
    layers: string;
    showCerebrum: string;
    showCerebellum: string;
    showBrainstem: string;
    showVessels: string;
  };
  info: {
    title: string;
    clickVessel: string;
    blockedVessels: string;
    affectedRegionsFull: string;
    affectedRegionsPartial: string;
    consequences: string;
    syndrome: string;
  };
}

export const translations: Record<Language, Translations> = {
  'zh-TW': {
    title: '腦血管互動地圖',
    subtitle: '教育用途的 3D 腦血管系統視覺化',
    disclaimer:
      '⚠️ 這是教育工具，不是醫療診斷。如有中風症狀，請立即撥打 119！',
    emergency: '中風徵兆：臉歪、手垂、說話不清楚，立刻撥打 119',
    controls: {
      title: '控制項',
      reset: '重置',
      layers: '圖層',
      showCerebrum: '顯示大腦',
      showCerebellum: '顯示小腦',
      showBrainstem: '顯示腦幹',
      showVessels: '顯示血管',
    },
    info: {
      title: '資訊',
      clickVessel: '點選血管以模擬阻塞',
      blockedVessels: '被阻塞的血管',
      affectedRegionsFull: '嚴重受影響的區域',
      affectedRegionsPartial: '部分受影響的區域',
      consequences: '後果',
      syndrome: '症候群',
    },
  },
  en: {
    title: 'Brain Vessel Interactive Map',
    subtitle: 'Educational 3D Cerebrovascular System Visualization',
    disclaimer:
      '⚠️ This is an educational tool, not for medical diagnosis. Call 119 immediately for stroke symptoms!',
    emergency: 'Stroke signs: Face drooping, arm weakness, speech difficulty - call 119',
    controls: {
      title: 'Controls',
      reset: 'Reset',
      layers: 'Layers',
      showCerebrum: 'Show Cerebrum',
      showCerebellum: 'Show Cerebellum',
      showBrainstem: 'Show Brainstem',
      showVessels: 'Show Vessels',
    },
    info: {
      title: 'Information',
      clickVessel: 'Click vessels to simulate occlusion',
      blockedVessels: 'Blocked Vessels',
      affectedRegionsFull: 'Severely Affected Regions',
      affectedRegionsPartial: 'Partially Affected Regions',
      consequences: 'Consequences',
      syndrome: 'Syndrome',
    },
  },
};

export const defaultLanguage: Language = 'zh-TW';

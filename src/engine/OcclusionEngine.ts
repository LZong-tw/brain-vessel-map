/**
 * 阻塞引擎介面
 * Occlusion Engine Interface
 * 
 * 設計為可替換的介面，讓未來更精確的模型可以輕鬆替換
 */

import type { Vessel, OcclusionResult } from '../types/vessel';

export interface IOcclusionEngine {
  /**
   * 計算血管阻塞的影響
   * @param blockedVesselIds 被阻塞的血管 ID 列表
   * @param vessels 完整的血管圖譜
   * @returns 受影響的腦區和臨床後果
   */
  calculateOcclusion(
    blockedVesselIds: string[],
    vessels: Record<string, Vessel>
  ): OcclusionResult;
}

/**
 * 基於規則的阻塞引擎
 * Rule-based Occlusion Engine
 * 
 * TODO(medical-review): This is a simplified educational model.
 * Real collateral flow depends on individual anatomy, blood pressure,
 * and many other factors. This model uses simplified rules.
 */
export class RuleBasedOcclusionEngine implements IOcclusionEngine {
  calculateOcclusion(
    blockedVesselIds: string[],
    vessels: Record<string, Vessel>
  ): OcclusionResult {
    const blockedSet = new Set(blockedVesselIds);
    const affectedFull = new Set<string>();
    const affectedPartial = new Set<string>();

    // 步驟 1：向下游追蹤所有受影響的血管
    const downstreamVessels = this.findDownstreamVessels(
      blockedVesselIds,
      vessels
    );

    // 步驟 2：評估側枝循環救援
    const rescuedVessels = this.evaluateCollateralRescue(
      downstreamVessels,
      blockedSet
    );

    // 步驟 3：將血管映射到受影響的腦區
    for (const vesselId of downstreamVessels) {
      const vessel = vessels[vesselId];
      if (!vessel) continue;

      const isRescued = rescuedVessels.has(vesselId);
      
      for (const regionId of vessel.suppliesRegions) {
        if (isRescued) {
          affectedPartial.add(regionId);
        } else {
          affectedFull.add(regionId);
        }
      }
    }

    // 步驟 4：生成臨床後果和症候群
    const syndrome = this.identifySyndrome(blockedVesselIds);
    const consequences = this.generateConsequences(
      Array.from(affectedFull),
      Array.from(affectedPartial),
      syndrome
    );

    return {
      affectedRegionsFull: Array.from(affectedFull),
      affectedRegionsPartial: Array.from(affectedPartial),
      consequencesZh: consequences,
      syndrome,
    };
  }

  /**
   * 找到所有下游血管（沒有其他血流來源的）
   */
  private findDownstreamVessels(
    blockedVesselIds: string[],
    vessels: Record<string, Vessel>
  ): Set<string> {
    const downstream = new Set<string>();
    const queue = [...blockedVesselIds];
    const visited = new Set<string>();

    while (queue.length > 0) {
      const vesselId = queue.shift()!;
      if (visited.has(vesselId)) continue;
      visited.add(vesselId);

      downstream.add(vesselId);

      const vessel = vessels[vesselId];
      if (!vessel) continue;

      // 追蹤子血管
      for (const childId of vessel.childIds) {
        if (!visited.has(childId)) {
          queue.push(childId);
        }
      }
    }

    return downstream;
  }

  /**
   * 評估側枝循環救援
   * 
   * Willis 環的簡化規則：
   * - AComm 可以在一側 ICA/ACA 阻塞時從另一側供血
   * - PComm 可以在 ICA 或 PCA 阻塞時提供部分救援
   */
  private evaluateCollateralRescue(
    downstreamVessels: Set<string>,
    blockedSet: Set<string>
  ): Set<string> {
    const rescued = new Set<string>();

    // AComm 救援：如果一側 ACA A1 阻塞，但另一側和 AComm 暢通
    if (
      (blockedSet.has('ica_r') || blockedSet.has('aca_a1_r')) &&
      !blockedSet.has('ica_l') &&
      !blockedSet.has('aca_a1_l') &&
      !blockedSet.has('acomm')
    ) {
      if (downstreamVessels.has('aca_a2_r')) {
        rescued.add('aca_a2_r');
        rescued.add('frontal_lobe_medial_r');
        rescued.add('motor_cortex_leg_r');
      }
    }

    if (
      (blockedSet.has('ica_l') || blockedSet.has('aca_a1_l')) &&
      !blockedSet.has('ica_r') &&
      !blockedSet.has('aca_a1_r') &&
      !blockedSet.has('acomm')
    ) {
      if (downstreamVessels.has('aca_a2_l')) {
        rescued.add('aca_a2_l');
        rescued.add('frontal_lobe_medial_l');
        rescued.add('motor_cortex_leg_l');
      }
    }

    // PComm 救援：如果 ICA 阻塞但 PComm 和 basilar 暢通
    if (
      blockedSet.has('ica_r') &&
      !blockedSet.has('pcomm_r') &&
      !blockedSet.has('basilar')
    ) {
      // PComm 可以提供部分血流到遠端 ICA 分支
      if (downstreamVessels.has('mca_m1_r')) {
        rescued.add('mca_m1_r');
      }
    }

    if (
      blockedSet.has('ica_l') &&
      !blockedSet.has('pcomm_l') &&
      !blockedSet.has('basilar')
    ) {
      if (downstreamVessels.has('mca_m1_l')) {
        rescued.add('mca_m1_l');
      }
    }

    return rescued;
  }

  /**
   * 識別具名症候群
   */
  private identifySyndrome(
    blockedVesselIds: string[]
  ): OcclusionResult['syndrome'] | undefined {
    // 華倫堡氏症候群（PICA 或椎動脈）
    if (
      blockedVesselIds.some((id) =>
        ['pica_r', 'pica_l', 'vertebral_r', 'vertebral_l'].includes(id)
      )
    ) {
      return {
        nameZh: '華倫堡氏症候群（外側延髓症候群）',
        nameEn: 'Wallenberg Syndrome (Lateral Medullary Syndrome)',
        descriptionZh:
          '可能出現眩暈、難以吞嚥、聲音沙啞、臉部或身體一側感覺異常。這是延髓外側受損的典型表現。',
      };
    }

    // 中大腦動脈症候群
    if (blockedVesselIds.some((id) => ['mca_m1_r', 'mca_m1_l'].includes(id))) {
      return {
        nameZh: '中大腦動脈症候群',
        nameEn: 'MCA Syndrome',
        descriptionZh:
          '可能出現對側（身體另一側）臉部和手臂無力、感覺喪失、視野缺損。若左側受影響，可能無法說話或理解語言。',
      };
    }

    // 基底動脈阻塞
    if (blockedVesselIds.includes('basilar')) {
      return {
        nameZh: '基底動脈阻塞',
        nameEn: 'Basilar Artery Occlusion',
        descriptionZh:
          '極為嚴重，可能導致雙側無力、意識改變、眼球運動障礙，甚至危及生命。需要立即急救。',
      };
    }

    return undefined;
  }

  /**
   * 生成一般人能理解的後果說明
   */
  private generateConsequences(
    affectedFull: string[],
    affectedPartial: string[],
    syndrome?: OcclusionResult['syndrome']
  ): string {
    if (affectedFull.length === 0 && affectedPartial.length === 0) {
      return '由於側枝循環良好，可能沒有明顯症狀，或只有輕微短暫的症狀。';
    }

    let result = '';

    if (syndrome) {
      result += `**${syndrome.nameZh}**\n\n${syndrome.descriptionZh}\n\n`;
    }

    if (affectedFull.length > 0) {
      result += `**嚴重受影響的區域**：這些區域的功能可能會明顯受損。\n`;
    }

    if (affectedPartial.length > 0) {
      result += `\n**部分受影響的區域**：這些區域有側枝循環救援，症狀可能較輕微。\n`;
    }

    result += `\n⚠️ **這是教育示範，不是醫療診斷。任何中風症狀都需要立即撥打 119 求救！**`;

    return result;
  }
}

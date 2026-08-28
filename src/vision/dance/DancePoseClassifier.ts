import { DANCE_POSES } from '../../data/poses/dancePoses';
import { DancePoseDefinition, PoseCandidate, PoseFeatures } from '../../types/pose';
import { RecognitionResult } from '../../types/pipeline';

interface PoseHistoryItem {
  candidate: PoseCandidate | null;
  timestamp: number;
}

export class DancePoseClassifier {
  private poses: DancePoseDefinition[] = DANCE_POSES;
  private poseHistory: PoseHistoryItem[] = [];
  private windowSize: number = 8;
  private minStabilityCount: number = 4;
  private currentConfirmedPose: RecognitionResult | null = null;

  classify(features: PoseFeatures, timestamp: number = performance.now()): {
    candidates: PoseCandidate[];
    confirmedPose: RecognitionResult | null;
  } {
    const rawCandidates: PoseCandidate[] = [];

    for (const pose of this.poses) {
      const confidence = this.evaluatePoseMatch(features, pose);
      if (confidence > 0.45) {
        rawCandidates.push({
          poseId: pose.id,
          name: pose.name,
          confidence,
          danceFormIds: pose.danceFormIds,
        });
      }
    }

    rawCandidates.sort((a, b) => b.confidence - a.confidence);
    const topCandidate = rawCandidates.length > 0 && rawCandidates[0].confidence >= 0.5 ? rawCandidates[0] : null;

    // Add to temporal history
    this.poseHistory.push({
      candidate: topCandidate,
      timestamp,
    });

    if (this.poseHistory.length > this.windowSize) {
      this.poseHistory.shift();
    }

    // Tally frequency
    const counts: Record<string, { count: number; candidate: PoseCandidate; confSum: number }> = {};
    for (const item of this.poseHistory) {
      if (item.candidate) {
        const id = item.candidate.poseId;
        if (!counts[id]) {
          counts[id] = { count: 0, candidate: item.candidate, confSum: 0 };
        }
        counts[id].count += 1;
        counts[id].confSum += item.candidate.confidence;
      }
    }

    let dominantId = '';
    let maxCount = 0;
    for (const id in counts) {
      if (counts[id].count > maxCount) {
        maxCount = counts[id].count;
        dominantId = id;
      }
    }

    let confirmedPose: RecognitionResult | null = null;

    if (dominantId && maxCount >= this.minStabilityCount) {
      const dominant = counts[dominantId];
      const avgConfidence = dominant.confSum / dominant.count;
      const poseDef = this.poses.find((p) => p.id === dominantId);

      confirmedPose = {
        label: dominant.candidate.name,
        confidence: Math.round(avgConfidence * 100) / 100,
        sanskritName: poseDef?.sanskritName,
        status: 'CONFIRMED',
        stabilityFrames: maxCount,
        evidence: [`Held stable for ${maxCount} frames`, `Joint angles aligned with ${dominant.candidate.name}`],
      };
      this.currentConfirmedPose = confirmedPose;
    } else if (topCandidate) {
      const poseDef = this.poses.find((p) => p.id === topCandidate.poseId);
      confirmedPose = {
        label: topCandidate.name,
        confidence: Math.round(topCandidate.confidence * 0.75 * 100) / 100,
        sanskritName: poseDef?.sanskritName,
        status: 'ANALYZING',
        stabilityFrames: maxCount,
        evidence: [`Stabilizing stance (${maxCount}/${this.minStabilityCount} frames)`],
      };
    } else {
      confirmedPose = {
        label: 'Neutral Stance',
        confidence: 0.5,
        status: 'UNCERTAIN',
      };
    }

    return {
      candidates: rawCandidates,
      confirmedPose,
    };
  }

  private evaluatePoseMatch(f: PoseFeatures, pose: DancePoseDefinition): number {
    switch (pose.id) {
      case 'aramandi': {
        if (f.isAramandiStance) {
          const kneeCloseness = 1 - Math.abs((f.leftKneeAngle + f.rightKneeAngle) / 2 - 120) / 60;
          const torsoUpright = 1 - f.torsoInclination / 30;
          return Math.max(0, Math.min(0.96, kneeCloseness * 0.7 + torsoUpright * 0.3));
        }
        return 0.2;
      }

      case 'samapada': {
        if (f.isSamapada) {
          const straightScore = ((f.leftKneeAngle > 160 ? 1 : 0.5) + (f.rightKneeAngle > 160 ? 1 : 0.5)) / 2;
          const stanceNarrow = Math.max(0, 1 - f.legSeparation / 0.8);
          return Math.max(0, Math.min(0.95, straightScore * 0.6 + stanceNarrow * 0.4));
        }
        return 0.25;
      }

      case 'tribhanga': {
        if (f.isTribhanga) {
          const curveScore = Math.min(1, Math.abs(f.headOrientation) / 20);
          return Math.max(0, Math.min(0.94, 0.75 + curveScore * 0.2));
        }
        return 0.3;
      }

      case 'chowka': {
        const kneesSquat = f.leftKneeAngle < 135 && f.rightKneeAngle < 135;
        const elbowsOut = f.leftElbowAngle > 70 && f.leftElbowAngle < 120 && f.rightElbowAngle > 70 && f.rightElbowAngle < 120;
        const wideStance = f.legSeparation > 0.9;
        if (kneesSquat && elbowsOut && wideStance) {
          return 0.93;
        }
        return 0.35;
      }

      case 'natarajasana': {
        const legDiff = Math.abs(f.leftKneeAngle - f.rightKneeAngle);
        const oneLegLifted = legDiff > 45 && (f.leftKneeAngle < 95 || f.rightKneeAngle < 95);
        const armCrossing = f.armSeparation < 1.2 && (f.wristHeightLeft > 0.3 || f.wristHeightRight > 0.3);
        if (oneLegLifted) {
          return armCrossing ? 0.95 : 0.82;
        }
        return 0.2;
      }

      case 'alidha': {
        const kneeDiff = Math.abs(f.leftKneeAngle - f.rightKneeAngle);
        const wideLegs = f.legSeparation > 1.2;
        if (kneeDiff > 40 && wideLegs) {
          return 0.91;
        }
        return 0.25;
      }

      case 'kathak_thaat': {
        const upright = f.leftKneeAngle > 165 && f.rightKneeAngle > 165;
        const oneArmHigh = (f.wristHeightLeft > 0.8 && f.wristHeightRight < 0.4) || (f.wristHeightRight > 0.8 && f.wristHeightLeft < 0.4);
        if (upright && oneArmHigh) {
          return 0.93;
        }
        return 0.3;
      }

      case 'bhangra_high_leap': {
        const oneKneeRaisedHigh = f.leftKneeAngle < 85 || f.rightKneeAngle < 85;
        const armsRaisedV = f.wristHeightLeft > 0.7 && f.wristHeightRight > 0.7;
        if (oneKneeRaisedHigh && armsRaisedV) {
          return 0.94;
        }
        return 0.3;
      }

      default:
        return 0.35;
    }
  }

  reset(): void {
    this.poseHistory = [];
    this.currentConfirmedPose = null;
  }
}

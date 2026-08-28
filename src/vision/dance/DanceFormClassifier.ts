import { DANCE_FORMS } from '../../data/dances/danceForms';
import { DanceCategory, DanceFormRecord } from '../../types/dance';
import { MovementObservation } from '../../types/movement';
import { MudraObservation } from '../../types/mudra';
import { PoseCandidate } from '../../types/pose';
import { DanceFormPrediction } from '../../types/pipeline';

interface HistoryWindowItem {
  scores: Record<string, number>;
  evidence: Record<string, string[]>;
  timestamp: number;
}

export class DanceFormClassifier {
  private danceForms: DanceFormRecord[] = DANCE_FORMS;
  private historyWindow: HistoryWindowItem[] = [];
  private windowSize: number = 8;
  private confirmationThreshold: number = 0.82;
  private minConsistentFrames: number = 4;

  classify(
    poseCandidates: PoseCandidate[],
    mudraObservations: MudraObservation[],
    movementObservation: MovementObservation | null,
    timestamp: number = performance.now()
  ): DanceFormPrediction[] {
    const currentScores: Record<string, number> = {};
    const currentEvidence: Record<string, string[]> = {};

    for (const df of this.danceForms) {
      currentScores[df.id] = 0;
      currentEvidence[df.id] = [];
    }

    // 1. Posture contribution (Structural posture geometry)
    for (const pose of poseCandidates) {
      for (const formId of pose.danceFormIds) {
        if (currentScores[formId] !== undefined) {
          const weight = pose.confidence * 0.4;
          currentScores[formId] += weight;
          currentEvidence[formId].push(`Characteristic posture: ${pose.name} (${Math.round(pose.confidence * 100)}%)`);
        }
      }
    }

    // 2. Mudra contribution (Hand gesture vocabulary)
    for (const mudra of mudraObservations) {
      if (!mudra.isStable) continue;
      for (const df of this.danceForms) {
        const match = df.signatureMudras.some(
          (sm) => sm.toLowerCase().includes(mudra.name.toLowerCase()) || mudra.name.toLowerCase().includes(sm.toLowerCase())
        );
        if (match) {
          const weight = mudra.confidence * 0.35;
          currentScores[df.id] += weight;
          currentEvidence[df.id].push(`Signature mudra: ${mudra.name} (${mudra.sanskritName || ''})`);
        }
      }
    }

    // 3. Movement contribution (Temporal rhythmic patterns & footwork)
    if (movementObservation && movementObservation.confidence > 0.5) {
      for (const formId of movementObservation.danceFormIds) {
        if (currentScores[formId] !== undefined) {
          const weight = movementObservation.confidence * 0.35;
          currentScores[formId] += weight;
          currentEvidence[formId].push(`Rhythmic movement pattern: ${movementObservation.name}`);
        }
      }
    }

    // Add to rolling history window
    this.historyWindow.push({
      scores: currentScores,
      evidence: currentEvidence,
      timestamp,
    });

    if (this.historyWindow.length > this.windowSize) {
      this.historyWindow.shift();
    }

    // Rolling temporal confirmation: compute exponentially weighted average score
    const aggregatedScores: Record<string, { totalScore: number; count: number; evidenceSet: Set<string> }> = {};

    for (let i = 0; i < this.historyWindow.length; i++) {
      const windowItem = this.historyWindow[i];
      const weight = 0.5 + 0.5 * ((i + 1) / this.historyWindow.length); // recent frames have higher weight

      for (const df of this.danceForms) {
        if (!aggregatedScores[df.id]) {
          aggregatedScores[df.id] = { totalScore: 0, count: 0, evidenceSet: new Set() };
        }
        const frameScore = windowItem.scores[df.id] || 0;
        if (frameScore > 0.15) {
          aggregatedScores[df.id].totalScore += frameScore * weight;
          aggregatedScores[df.id].count += 1;
          windowItem.evidence[df.id]?.forEach((e) => aggregatedScores[df.id].evidenceSet.add(e));
        }
      }
    }

    const predictions: DanceFormPrediction[] = [];

    for (const df of this.danceForms) {
      const agg = aggregatedScores[df.id];
      if (agg && agg.count > 0) {
        const rawConfidence = Math.min(0.96, agg.totalScore / (this.historyWindow.length * 0.9));
        const stabilityScore = agg.count / this.historyWindow.length;
        const isConfirmed = rawConfidence >= this.confirmationThreshold && agg.count >= this.minConsistentFrames;

        if (rawConfidence > 0.25) {
          predictions.push({
            danceFormId: df.id,
            name: df.name,
            category: df.category,
            state: df.state,
            confidence: Math.round(rawConfidence * 100) / 100,
            evidence: Array.from(agg.evidenceSet).slice(0, 4),
            isConfirmed,
            temporalStabilityScore: Math.round(stabilityScore * 100) / 100,
          });
        }
      }
    }

    predictions.sort((a, b) => b.confidence - a.confidence);
    return predictions;
  }

  reset(): void {
    this.historyWindow = [];
  }
}

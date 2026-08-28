import { MudraCandidate, MudraObservation } from '../../types/mudra';
import { RecognitionResult } from '../../types/pipeline';

interface HandHistoryItem {
  candidate: MudraCandidate | null;
  timestamp: number;
}

export class MudraTemporalFilter {
  private windowSize: number = 8;
  private minStabilityCount: number = 4;

  private leftHistory: HandHistoryItem[] = [];
  private rightHistory: HandHistoryItem[] = [];

  private currentDisplayedLeft: MudraObservation | null = null;
  private currentDisplayedRight: MudraObservation | null = null;

  private leftMissingFrames: number = 0;
  private rightMissingFrames: number = 0;

  // Max missing frames before occlusion timeout
  private maxOcclusionTolerance: number = 6;

  constructor(windowSize: number = 8, minStabilityCount: number = 4) {
    this.windowSize = windowSize;
    this.minStabilityCount = minStabilityCount;
  }

  addObservation(
    leftCandidates: MudraCandidate[],
    rightCandidates: MudraCandidate[],
    timestamp: number,
    leftHandPresent: boolean = true,
    rightHandPresent: boolean = true,
    leftVisibility: number = 1.0,
    rightVisibility: number = 1.0
  ): {
    stableLeft: MudraObservation | null;
    stableRight: MudraObservation | null;
    leftResult: RecognitionResult;
    rightResult: RecognitionResult;
    samyutaResult: RecognitionResult | null;
    isDetecting: boolean;
  } {
    const stableLeft = this.processHand(
      'Left',
      leftCandidates,
      leftHandPresent,
      leftVisibility,
      timestamp,
      this.leftHistory,
      this.currentDisplayedLeft,
      (newMudra) => {
        this.currentDisplayedLeft = newMudra;
      },
      () => this.leftMissingFrames,
      (val) => {
        this.leftMissingFrames = val;
      }
    );

    const stableRight = this.processHand(
      'Right',
      rightCandidates,
      rightHandPresent,
      rightVisibility,
      timestamp,
      this.rightHistory,
      this.currentDisplayedRight,
      (newMudra) => {
        this.currentDisplayedRight = newMudra;
      },
      () => this.rightMissingFrames,
      (val) => {
        this.rightMissingFrames = val;
      }
    );

    const leftResult = this.toRecognitionResult(stableLeft, leftHandPresent, leftVisibility, 'Left');
    const rightResult = this.toRecognitionResult(stableRight, rightHandPresent, rightVisibility, 'Right');

    // Check for combined Samyuta Mudra when both hands are stable
    let samyutaResult: RecognitionResult | null = null;
    if (stableLeft?.isStable && stableRight?.isStable) {
      if (stableLeft.mudraId === 'pataka' && stableRight.mudraId === 'pataka') {
        samyutaResult = {
          label: 'Anjali Mudra (Samyuta)',
          confidence: Math.round(((stableLeft.confidence + stableRight.confidence) / 2) * 100) / 100,
          sanskritName: 'अञ्जलि हस्त',
          category: 'SAMYUTA',
          status: 'CONFIRMED',
          evidence: ['Both hands in Pataka gesture aligned in salutation'],
        };
      } else if (
        (stableLeft.mudraId === 'pataka' && stableRight.mudraId === 'shikhara') ||
        (stableRight.mudraId === 'pataka' && stableLeft.mudraId === 'shikhara')
      ) {
        samyutaResult = {
          label: 'Shivalinga Mudra (Samyuta)',
          confidence: 0.92,
          sanskritName: 'शिवलिङ्ग हस्त',
          category: 'SAMYUTA',
          status: 'CONFIRMED',
          evidence: ['Shikhara upright upon base Pataka palm'],
        };
      }
    }

    const isDetecting =
      (stableLeft !== null && stableLeft.status === 'DETECTING') ||
      (stableRight !== null && stableRight.status === 'DETECTING');

    return {
      stableLeft,
      stableRight,
      leftResult,
      rightResult,
      samyutaResult,
      isDetecting,
    };
  }

  private processHand(
    handedness: 'Left' | 'Right',
    candidates: MudraCandidate[],
    handPresent: boolean,
    handVisibility: number,
    timestamp: number,
    history: HandHistoryItem[],
    currentDisplayed: MudraObservation | null,
    setDisplayed: (mudra: MudraObservation | null) => void,
    getMissingFrames: () => number,
    setMissingFrames: (val: number) => void
  ): MudraObservation | null {
    // 1. Occlusion Handling
    if (!handPresent || handVisibility < 0.35) {
      const missing = getMissingFrames() + 1;
      setMissingFrames(missing);

      // Short temporal timeout before clearing state (prevents 1-frame flickering)
      if (missing > this.maxOcclusionTolerance) {
        history.length = 0;
        setDisplayed(null);
        return null;
      }

      // If temporarily missing, maintain previous confirmed prediction with decaying confidence
      if (currentDisplayed && currentDisplayed.isStable) {
        return {
          ...currentDisplayed,
          confidence: Math.max(0.4, currentDisplayed.confidence * 0.9),
          status: 'DETECTING',
        };
      }

      return currentDisplayed;
    }

    setMissingFrames(0);

    const topCandidate = candidates.length > 0 && candidates[0].confidence >= 0.4 ? candidates[0] : null;

    // Add to rolling history
    history.push({
      candidate: topCandidate,
      timestamp,
    });

    if (history.length > this.windowSize) {
      history.shift();
    }

    // Count frequency of candidate mudras across the rolling history
    const counts: Record<string, { count: number; candidate: MudraCandidate; confSum: number }> = {};
    for (const item of history) {
      if (item.candidate) {
        const id = item.candidate.mudraId;
        if (!counts[id]) {
          counts[id] = { count: 0, candidate: item.candidate, confSum: 0 };
        }
        counts[id].count += 1;
        counts[id].confSum += item.candidate.confidence;
      }
    }

    // Find highest frequency candidate
    let dominantId = '';
    let maxCount = 0;

    for (const id in counts) {
      if (counts[id].count > maxCount) {
        maxCount = counts[id].count;
        dominantId = id;
      }
    }

    const progress = Math.min(1, maxCount / this.minStabilityCount);

    // If consistently detected over several frames (reaches stability threshold)
    if (dominantId && maxCount >= this.minStabilityCount) {
      const dominant = counts[dominantId];
      const avgConfidence = dominant.confSum / dominant.count;

      const stableMudra: MudraObservation = {
        mudraId: dominant.candidate.mudraId,
        name: dominant.candidate.name,
        sanskritName: dominant.candidate.sanskritName,
        confidence: Math.round(avgConfidence * 100) / 100,
        timestamp,
        handedness,
        isStable: true,
        status: 'STABLE',
        stabilityProgress: 1.0,
      };

      setDisplayed(stableMudra);
      return stableMudra;
    }

    // Otherwise, the mudra result is unstable / detecting
    const provisionalCandidate = dominantId ? counts[dominantId].candidate : topCandidate;

    const detectingObservation: MudraObservation = {
      mudraId: provisionalCandidate?.mudraId || 'detecting',
      name: 'Analyzing...',
      sanskritName: provisionalCandidate ? `Tentative: ${provisionalCandidate.sanskritName}` : 'Stabilizing hand shape...',
      confidence: provisionalCandidate ? Math.round(provisionalCandidate.confidence * 0.7 * 100) / 100 : 0.45,
      timestamp,
      handedness,
      isStable: false,
      status: 'DETECTING',
      stabilityProgress: progress,
      provisionalName: provisionalCandidate?.name,
    };

    return detectingObservation;
  }

  private toRecognitionResult(
    observation: MudraObservation | null,
    handPresent: boolean,
    visibility: number,
    handedness: 'Left' | 'Right'
  ): RecognitionResult {
    if (!handPresent) {
      return {
        label: `${handedness} Hand Occluded / Off-camera`,
        confidence: 0,
        status: 'OCCLUDED',
      };
    }

    if (visibility < 0.55) {
      return {
        label: `Hand visibility low`,
        confidence: Math.round(visibility * 100) / 100,
        status: 'LOW_VISIBILITY',
        evidence: [`Landmarks visible: ${Math.round(visibility * 21)}/21`],
      };
    }

    if (!observation) {
      return {
        label: 'Analyzing hand shape...',
        confidence: 0.5,
        status: 'ANALYZING',
      };
    }

    if (observation.isStable && observation.status === 'STABLE') {
      return {
        label: observation.name,
        confidence: observation.confidence,
        sanskritName: observation.sanskritName,
        status: 'CONFIRMED',
        evidence: [`Held stable for temporal confirmation window`],
      };
    }

    return {
      label: observation.provisionalName ? `Analyzing (${observation.provisionalName})` : 'Analyzing hand shape...',
      confidence: observation.confidence,
      sanskritName: observation.sanskritName,
      status: 'ANALYZING',
    };
  }

  reset(): void {
    this.leftHistory = [];
    this.rightHistory = [];
    this.currentDisplayedLeft = null;
    this.currentDisplayedRight = null;
    this.leftMissingFrames = 0;
    this.rightMissingFrames = 0;
  }
}

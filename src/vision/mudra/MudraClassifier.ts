import { ASAMYUTA_MUDRAS } from '../../data/mudras/asamyuta';
import { SAMYUTA_MUDRAS } from '../../data/mudras/samyuta';
import { TRADITION_SPECIFIC_MUDRAS } from '../../data/mudras/traditions';
import { HandFeatures, MudraCandidate, MudraDefinition } from '../../types/mudra';

export class MudraClassifier {
  private allMudras: MudraDefinition[] = [
    ...ASAMYUTA_MUDRAS,
    ...SAMYUTA_MUDRAS,
    ...TRADITION_SPECIFIC_MUDRAS,
  ];

  classify(
    handFeatures: HandFeatures,
    otherHandFeatures?: HandFeatures
  ): MudraCandidate[] {
    const candidates: MudraCandidate[] = [];

    // Evaluate single-hand gestures
    for (const mudra of this.allMudras) {
      if (mudra.handCount === 1) {
        const confidence = this.computeSingleHandMatch(handFeatures, mudra);
        if (confidence > 0.4) {
          candidates.push({
            mudraId: mudra.id,
            name: mudra.name,
            sanskritName: mudra.sanskritName,
            confidence,
            handedness: handFeatures.handedness,
            category: mudra.category,
            danceForms: mudra.danceForms,
          });
        }
      } else if (mudra.handCount === 2 && otherHandFeatures) {
        const confidence = this.computeTwoHandMatch(handFeatures, otherHandFeatures, mudra);
        if (confidence > 0.45) {
          candidates.push({
            mudraId: mudra.id,
            name: mudra.name,
            sanskritName: mudra.sanskritName,
            confidence,
            handedness: 'Both',
            category: mudra.category,
            danceForms: mudra.danceForms,
          });
        }
      }
    }

    // Sort descending by confidence
    candidates.sort((a, b) => b.confidence - a.confidence);

    return candidates;
  }

  private computeSingleHandMatch(
    hf: HandFeatures,
    mudra: MudraDefinition
  ): number {
    const f = hf.fingers;
    const g = mudra.geometricFeatures;

    let score = 0;
    let weightSum = 0;

    // 1. Specific Signature Checks for key distinct Mudras
    switch (mudra.id) {
      case 'pataka': {
        // All 4 straight, thumb bent/tucked
        const fourStraight = (f.index.extensionRatio + f.middle.extensionRatio + f.ring.extensionRatio + f.little.extensionRatio) / 4;
        const thumbTucked = f.thumb.extensionRatio < 0.65 ? 1 : 0.4;
        return Math.max(0, Math.min(0.98, fourStraight * 0.8 + thumbTucked * 0.2));
      }

      case 'tripataka': {
        // Index, middle, pinky straight; ring bent
        const straight3 = (f.index.extensionRatio + f.middle.extensionRatio + f.little.extensionRatio) / 3;
        const ringBent = f.ring.curl === 'CURLED' || f.ring.extensionRatio < 0.45 ? 1 : 0.1;
        return Math.max(0, Math.min(0.97, straight3 * 0.65 + ringBent * 0.35));
      }

      case 'ardhapataka': {
        // Index, middle straight; ring, pinky bent
        const straight2 = (f.index.extensionRatio + f.middle.extensionRatio) / 2;
        const bent2 = ((f.ring.extensionRatio < 0.45 ? 1 : 0) + (f.little.extensionRatio < 0.45 ? 1 : 0)) / 2;
        return Math.max(0, Math.min(0.96, straight2 * 0.6 + bent2 * 0.4));
      }

      case 'kartarimukha': {
        // Index and middle straight & spread apart, ring and pinky curled
        const straight2 = (f.index.extensionRatio + f.middle.extensionRatio) / 2;
        const bent2 = ((f.ring.extensionRatio < 0.45 ? 1 : 0) + (f.little.extensionRatio < 0.45 ? 1 : 0)) / 2;
        const spread = hf.indexMiddleDistance > 0.45 ? 1 : 0.3;
        return Math.max(0, Math.min(0.97, straight2 * 0.45 + bent2 * 0.35 + spread * 0.2));
      }

      case 'mayura': {
        // Thumb and ring finger tips touching; index, middle, pinky extended
        const ringTouch = hf.thumbRingDistance < 0.35 ? 1 : Math.max(0, 1 - hf.thumbRingDistance);
        const othersStraight = (f.index.extensionRatio + f.middle.extensionRatio + f.little.extensionRatio) / 3;
        return Math.max(0, Math.min(0.98, ringTouch * 0.6 + othersStraight * 0.4));
      }

      case 'ardhachandra': {
        // Thumb flared wide away from straight fingers
        const fourStraight = (f.index.extensionRatio + f.middle.extensionRatio + f.ring.extensionRatio + f.little.extensionRatio) / 4;
        const thumbSpread = f.thumb.extensionRatio > 0.75 && hf.thumbIndexDistance > 0.7 ? 1 : 0.3;
        return Math.max(0, Math.min(0.96, fourStraight * 0.6 + thumbSpread * 0.4));
      }

      case 'mushti': {
        // All 5 fingers curled tight
        const allCurled = (
          (1 - f.thumb.extensionRatio) +
          (1 - f.index.extensionRatio) +
          (1 - f.middle.extensionRatio) +
          (1 - f.ring.extensionRatio) +
          (1 - f.little.extensionRatio)
        ) / 5;
        return Math.max(0, Math.min(0.98, allCurled));
      }

      case 'shikhara': {
        // Thumb extended vertical; other 4 fingers curled
        const thumbUp = f.thumb.extensionRatio > 0.75 ? 1 : 0.2;
        const fourCurled = (
          (1 - f.index.extensionRatio) +
          (1 - f.middle.extensionRatio) +
          (1 - f.ring.extensionRatio) +
          (1 - f.little.extensionRatio)
        ) / 4;
        return Math.max(0, Math.min(0.98, thumbUp * 0.55 + fourCurled * 0.45));
      }

      case 'suchi': {
        // Index straight; other 4 curled
        const indexPoint = f.index.extensionRatio > 0.8 ? 1 : 0.1;
        const othersCurled = (
          (1 - f.thumb.extensionRatio) +
          (1 - f.middle.extensionRatio) +
          (1 - f.ring.extensionRatio) +
          (1 - f.little.extensionRatio)
        ) / 4;
        return Math.max(0, Math.min(0.98, indexPoint * 0.6 + othersCurled * 0.4));
      }

      case 'chandrakala': {
        // Thumb and index form L-shape; other 3 curled
        const thumbAndIndex = (f.thumb.extensionRatio + f.index.extensionRatio) / 2;
        const threeCurled = (
          (1 - f.middle.extensionRatio) +
          (1 - f.ring.extensionRatio) +
          (1 - f.little.extensionRatio)
        ) / 3;
        const lAngle = hf.thumbIndexDistance > 0.65 ? 1 : 0.4;
        return Math.max(0, Math.min(0.97, thumbAndIndex * 0.45 + threeCurled * 0.35 + lAngle * 0.2));
      }

      case 'hamsasya': {
        // Thumb and index tip touching (Chin mudra / beak); middle, ring, pinky straight
        const pinch = hf.thumbIndexDistance < 0.28 ? 1 : Math.max(0, 1 - hf.thumbIndexDistance);
        const threeStraight = (f.middle.extensionRatio + f.ring.extensionRatio + f.little.extensionRatio) / 3;
        return Math.max(0, Math.min(0.98, pinch * 0.6 + threeStraight * 0.4));
      }

      case 'bhramara': {
        // Thumb and middle tip touching; index curled; ring & pinky straight
        const middleTouch = hf.thumbMiddleDistance < 0.32 ? 1 : Math.max(0, 1 - hf.thumbMiddleDistance);
        const indexCurled = f.index.curl === 'CURLED' || f.index.extensionRatio < 0.4 ? 1 : 0.1;
        const twoStraight = (f.ring.extensionRatio + f.little.extensionRatio) / 2;
        return Math.max(0, Math.min(0.96, middleTouch * 0.45 + indexCurled * 0.35 + twoStraight * 0.2));
      }

      case 'mukula': {
        // All 5 finger tips meeting together in conical bud
        const allClose = (
          (hf.thumbIndexDistance < 0.3 ? 1 : 0) +
          (hf.thumbMiddleDistance < 0.3 ? 1 : 0) +
          (hf.thumbRingDistance < 0.35 ? 1 : 0) +
          (hf.thumbLittleDistance < 0.4 ? 1 : 0)
        ) / 4;
        const halfCurledRatio = (
          (f.index.curl === 'HALF_CURLED' || f.index.curl === 'CURLED' ? 1 : 0.5) +
          (f.middle.curl === 'HALF_CURLED' || f.middle.curl === 'CURLED' ? 1 : 0.5)
        ) / 2;
        return Math.max(0, Math.min(0.97, allClose * 0.7 + halfCurledRatio * 0.3));
      }

      case 'alapadma': {
        // Fingers flared outward in spiral cascade
        const allExtended = (f.thumb.extensionRatio + f.index.extensionRatio + f.middle.extensionRatio + f.ring.extensionRatio) / 4;
        const spreadScore = (hf.fingerSpreads[0] > 18 ? 1 : 0.5) + (hf.fingerSpreads[1] > 18 ? 1 : 0.5);
        return Math.max(0, Math.min(0.95, allExtended * 0.6 + (spreadScore / 2) * 0.4));
      }

      case 'trishula': {
        // Index, middle, ring straight; thumb holds little finger
        const threeStraight = (f.index.extensionRatio + f.middle.extensionRatio + f.ring.extensionRatio) / 3;
        const pinkyHeld = (f.little.extensionRatio < 0.4 && hf.thumbLittleDistance < 0.35) ? 1 : 0.2;
        return Math.max(0, Math.min(0.97, threeStraight * 0.6 + pinkyHeld * 0.4));
      }

      case 'mrigashirsha': {
        // Thumb touching middle and ring tips; index and pinky raised
        const middleRingTouch = (
          (hf.thumbMiddleDistance < 0.35 ? 1 : 0) +
          (hf.thumbRingDistance < 0.35 ? 1 : 0)
        ) / 2;
        const indexPinkyUp = (f.index.extensionRatio + f.little.extensionRatio) / 2;
        return Math.max(0, Math.min(0.97, middleRingTouch * 0.55 + indexPinkyUp * 0.45));
      }

      case 'simhamukha': {
        // Middle and ring touching thumb; index and pinky flared out wide
        const touch = (hf.thumbMiddleDistance < 0.4 ? 1 : 0) + (hf.thumbRingDistance < 0.4 ? 1 : 0);
        const flared = (f.index.extensionRatio > 0.8 ? 1 : 0.3) + (f.little.extensionRatio > 0.8 ? 1 : 0.3);
        return Math.max(0, Math.min(0.96, (touch / 2) * 0.5 + (flared / 2) * 0.5));
      }

      case 'katakamukha': {
        // Thumb, index, and middle tips joined in ring; ring and pinky flared straight
        const threePinch = (
          (hf.thumbIndexDistance < 0.32 ? 1 : 0) +
          (hf.thumbMiddleDistance < 0.32 ? 1 : 0) +
          (hf.indexMiddleDistance < 0.3 ? 1 : 0)
        ) / 3;
        const twoUp = (f.ring.extensionRatio + f.little.extensionRatio) / 2;
        return Math.max(0, Math.min(0.97, threePinch * 0.6 + twoUp * 0.4));
      }

      case 'padmakosha': {
        // Cupped bowl with all fingers bent gently inward
        const allCupped = [f.index, f.middle, f.ring, f.little].every(
          (finger) => finger.curl === 'HALF_CURLED' || (finger.extensionRatio > 0.45 && finger.extensionRatio < 0.8)
        );
        return allCupped ? 0.88 : 0.3;
      }

      case 'sarpashirsha': {
        // Fingers together and curved gently forward
        const allGentleCurve = [f.index, f.middle, f.ring, f.little].every(
          (finger) => finger.extensionRatio > 0.65 && finger.pipAngle > 130
        );
        return allGentleCurve ? 0.86 : 0.3;
      }

      default:
        break;
    }

    // Generic feature distance comparison
    const fingerExtensions = [
      { actual: f.thumb.extensionRatio, target: g.thumbExtension ?? 0.5, weight: 1.2 },
      { actual: f.index.extensionRatio, target: g.indexExtension ?? 0.5, weight: 1.0 },
      { actual: f.middle.extensionRatio, target: g.middleExtension ?? 0.5, weight: 1.0 },
      { actual: f.ring.extensionRatio, target: g.ringExtension ?? 0.5, weight: 1.0 },
      { actual: f.little.extensionRatio, target: g.littleExtension ?? 0.5, weight: 1.0 },
    ];

    for (const item of fingerExtensions) {
      const diff = Math.abs(item.actual - item.target);
      const itemScore = Math.max(0, 1 - diff * 1.5);
      score += itemScore * item.weight;
      weightSum += item.weight;
    }

    return weightSum > 0 ? Math.max(0, Math.min(0.95, score / weightSum)) : 0;
  }

  private computeTwoHandMatch(
    h1: HandFeatures,
    h2: HandFeatures,
    mudra: MudraDefinition
  ): number {
    // Both hands must be present for Samyuta Hastas
    switch (mudra.id) {
      case 'anjali': {
        // Both hands Pataka with palms facing each other
        const isH1Pataka = (h1.fingers.index.extensionRatio + h1.fingers.middle.extensionRatio + h1.fingers.ring.extensionRatio + h1.fingers.little.extensionRatio) / 4;
        const isH2Pataka = (h2.fingers.index.extensionRatio + h2.fingers.middle.extensionRatio + h2.fingers.ring.extensionRatio + h2.fingers.little.extensionRatio) / 4;
        return Math.max(0, Math.min(0.98, (isH1Pataka + isH2Pataka) / 2));
      }

      case 'shivalinga': {
        // Right hand Shikhara (thumb vertical) resting on left Ardhachandra/Pataka
        const isRightShikhara = h1.fingers.thumb.extensionRatio > 0.75 && h1.fingers.index.extensionRatio < 0.4;
        const isLeftFlat = h2.fingers.index.extensionRatio > 0.7 && h2.fingers.middle.extensionRatio > 0.7;
        if (isRightShikhara && isLeftFlat) return 0.92;
        return 0.35;
      }

      case 'garuda': {
        // Thumbs crossed/interlocked, fingers spread fluttering
        const spread1 = (h1.fingers.index.extensionRatio + h1.fingers.middle.extensionRatio + h1.fingers.ring.extensionRatio + h1.fingers.little.extensionRatio) / 4;
        const spread2 = (h2.fingers.index.extensionRatio + h2.fingers.middle.extensionRatio + h2.fingers.ring.extensionRatio + h2.fingers.little.extensionRatio) / 4;
        return Math.max(0, Math.min(0.95, (spread1 + spread2) / 2));
      }

      case 'dola': {
        // Both hands Pataka relaxed downwards
        const isH1Pataka = h1.fingers.index.extensionRatio > 0.8;
        const isH2Pataka = h2.fingers.index.extensionRatio > 0.8;
        return isH1Pataka && isH2Pataka ? 0.89 : 0.3;
      }

      case 'pushpaputa': {
        // Both hands joined in cupped bowl
        const isH1Cupped = h1.fingers.index.extensionRatio > 0.5;
        const isH2Cupped = h2.fingers.index.extensionRatio > 0.5;
        return isH1Cupped && isH2Cupped ? 0.87 : 0.3;
      }

      default:
        return 0.5;
    }
  }
}

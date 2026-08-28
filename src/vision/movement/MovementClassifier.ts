import { DANCE_MOVEMENTS } from '../../data/movements/danceMovements';
import { MovementDefinition, MovementFeatures, MovementObservation, PoseFrame } from '../../types/movement';
import { computeMovementFeatures } from './MovementFeatures';

export class MovementTracker {
  private bufferSize: number;
  private frames: PoseFrame[] = [];

  constructor(bufferSize: number = 30) {
    this.bufferSize = bufferSize;
  }

  addFrame(frame: PoseFrame): void {
    this.frames.push(frame);
    if (this.frames.length > this.bufferSize) {
      this.frames.shift();
    }
  }

  getFeatures(): MovementFeatures {
    return computeMovementFeatures(this.frames);
  }

  clear(): void {
    this.frames = [];
  }
}

export class MovementClassifier {
  private movements: MovementDefinition[] = DANCE_MOVEMENTS;

  classify(features: MovementFeatures, timestamp: number): MovementObservation | null {
    let bestMatch: MovementDefinition | null = null;
    let maxConfidence = 0;

    for (const mov of this.movements) {
      const confidence = this.evaluateMovementMatch(features, mov);
      if (confidence > 0.55 && confidence > maxConfidence) {
        maxConfidence = confidence;
        bestMatch = mov;
      }
    }

    if (!bestMatch) return null;

    return {
      movementId: bestMatch.id,
      name: bestMatch.name,
      sanskritName: bestMatch.sanskritName,
      confidence: maxConfidence,
      timestamp,
      danceFormIds: bestMatch.danceFormIds,
      features,
    };
  }

  private evaluateMovementMatch(f: MovementFeatures, mov: MovementDefinition): number {
    switch (mov.id) {
      case 'kathak_tatkar': {
        // High foot strike cadence with moderate vertical bounce
        if (f.footStrikeCadence >= 2.0 && f.velocity > 0.15) {
          return Math.min(0.96, 0.65 + Math.min(0.3, f.footStrikeCadence * 0.1));
        }
        return 0.2;
      }

      case 'kathak_chakkar': {
        // High rotational velocity
        if (f.bodyRotationVelocity > 90 || f.velocity > 0.45) {
          return 0.94;
        }
        return 0.2;
      }

      case 'bhangra_dhamaal_bounce': {
        // High vertical oscillation bounce
        if (f.verticalOscillation > 0.45 && f.velocity > 0.35) {
          return Math.min(0.97, 0.7 + f.verticalOscillation * 0.3);
        }
        return 0.25;
      }

      case 'adavu_kudittu_mettu': {
        // Rhythmic jump and stamp in Aramandi
        if (f.verticalOscillation > 0.25 && f.footStrikeCadence > 1.2) {
          return 0.92;
        }
        return 0.3;
      }

      case 'garba_heench_swirl': {
        // Syncopated swirl and clap
        if (f.verticalOscillation > 0.2 && f.velocity > 0.2) {
          return 0.89;
        }
        return 0.3;
      }

      case 'bihu_komor_sway': {
        // Soft continuous velocity
        if (f.velocity > 0.2 && f.footStrikeCadence > 1.4) {
          return 0.88;
        }
        return 0.3;
      }

      default:
        return 0.4;
    }
  }
}

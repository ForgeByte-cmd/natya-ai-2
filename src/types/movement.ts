import { BodyLandmark } from './pose';

export interface PoseFrame {
  timestamp: number;
  landmarks: BodyLandmark[];
}

export interface MovementFeatures {
  displacement: number;
  velocity: number;
  acceleration: number;
  verticalOscillation: number; // rhythmic vertical bounce (Bhangra / Garba)
  footStrikeCadence: number; // steps per second (Kathak Tatkar / Bharatanatyam Thattu)
  bodyRotationVelocity: number; // deg/sec for Chakkars / spins
  armTrajectoryCurvature: number;
  legTrajectoryArc: number;
  headMovementRate: number; // Attami / Sundari Greeva head gestures
  symmetryIndex: number;
}

export interface MovementDefinition {
  id: string;
  name: string;
  sanskritName?: string;
  danceFormIds: string[];
  characteristicDurationMs: number;
  description: string;
  featureSignature: {
    minVelocity?: number;
    minVerticalOscillation?: number;
    minRotationRate?: number;
    minFootCadence?: number;
    prominentJoints: string[];
  };
}

export interface MovementObservation {
  movementId: string;
  name: string;
  sanskritName?: string;
  confidence: number;
  timestamp?: number;
  startTime?: number;
  endTime?: number;
  involvedJoints?: string[];
  features?: MovementFeatures | Record<string, number>;
  danceFormIds: string[];
}

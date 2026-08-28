import { CulturalSource } from './pose';

export interface FingerLandmark {
  x: number;
  y: number;
  z: number;
  visibility?: number;
}

export type FingerCurl = 'EXTENDED' | 'HALF_CURLED' | 'CURLED';

export interface FingerState {
  curl: FingerCurl;
  extensionRatio: number; // 0 to 1
  mcpAngle: number; // degrees
  pipAngle: number;
  dipAngle: number;
}

export interface HandFeatures {
  handedness: 'Left' | 'Right';
  confidence: number;
  fingers: {
    thumb: FingerState;
    index: FingerState;
    middle: FingerState;
    ring: FingerState;
    little: FingerState;
  };
  palmOrientation: number[]; // normal vector [x, y, z]
  wristAngle: number; // flexion/extension
  thumbIndexDistance: number; // normalized tip distance
  thumbMiddleDistance: number;
  thumbRingDistance: number;
  thumbLittleDistance: number;
  indexMiddleDistance: number;
  fingerSpreads: number[]; // angles between adjacent extended fingers
}

export type MudraCategory =
  | 'ASAMYUTA'
  | 'SAMYUTA'
  | 'TRADITION_SPECIFIC';

export interface MudraMeaning {
  sanskritViniyoga?: string;
  englishMeaning: string;
  context: string;
  rasa?: string; // Navarasa association
  danceForms?: string[];
}

export interface MudraDefinition {
  id: string;
  name: string;
  sanskritName: string;
  alternateNames: string[];
  category: MudraCategory;
  handCount: 1 | 2;
  sourceTraditions: string[];
  danceForms: string[];
  fingerConfiguration: {
    thumb: string;
    index: string;
    middle: string;
    ring: string;
    little: string;
  };
  geometricFeatures: Record<string, number>;
  tolerance: Record<string, number>;
  meanings: MudraMeaning[];
  sources: CulturalSource[];
  iconDescription?: string;
  shloka?: string;
  description?: string;
  culturalSignificance?: string;
  viniyoga?: string[];
}

export interface MudraCandidate {
  mudraId: string;
  name: string;
  sanskritName: string;
  confidence: number;
  handedness?: 'Left' | 'Right' | 'Both';
  category: MudraCategory;
  danceForms: string[];
}

export type MudraDetectionStatus = 'STABLE' | 'DETECTING' | 'NO_HAND';

export interface MudraObservation {
  mudraId: string;
  name: string;
  sanskritName: string;
  confidence: number;
  timestamp: number;
  handedness: 'Left' | 'Right' | 'Both';
  isStable: boolean;
  status?: MudraDetectionStatus;
  stabilityProgress?: number; // 0 to 1
  provisionalName?: string;
}

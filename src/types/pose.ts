export interface BodyLandmark {
  x: number;
  y: number;
  z: number;
  visibility: number;
}

export type BodyTrackingState =
  | 'NO_PERSON'
  | 'PARTIAL_BODY'
  | 'FULL_BODY'
  | 'TRACKING';

export interface PoseFeatures {
  shoulderAngle: number; // degrees
  hipAngle: number;
  leftElbowAngle: number;
  rightElbowAngle: number;
  leftKneeAngle: number;
  rightKneeAngle: number;
  torsoInclination: number; // vertical deviation in deg
  headOrientation: number; // yaw/tilt
  legSeparation: number; // normalized by shoulder width
  armSeparation: number; // normalized
  wristHeightLeft: number; // relative to shoulder
  wristHeightRight: number;
  isAramandiStance: boolean; // half-squat classic stance
  isTribhanga: boolean; // three-bend curve
  isSamapada: boolean; // feet together upright
  symmetryScore: number;
}

export interface CulturalSource {
  title: string;
  organization?: string;
  url?: string;
  sourceType:
    | 'GOVERNMENT'
    | 'ACADEMIC'
    | 'TRADITIONAL_TEXT'
    | 'EXPERT'
    | 'ARCHIVE';
  verified: boolean;
}

export interface DancePoseDefinition {
  id: string;
  name: string;
  sanskritName?: string;
  danceFormIds: string[];
  jointAngles: Record<string, number>;
  bodyRelations: Record<string, number>;
  stanceFeatures: Record<string, number>;
  tolerance: Record<string, number>;
  description: string;
  significance?: string;
  sources: CulturalSource[];
}

export interface PoseCandidate {
  poseId: string;
  name: string;
  confidence: number;
  danceFormIds: string[];
}

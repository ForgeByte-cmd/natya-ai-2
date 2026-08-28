import { BodyLandmark, PoseCandidate, PoseFeatures } from './pose';
import { FingerLandmark, MudraObservation } from './mudra';
import { MovementObservation } from './movement';
import { DanceCategory } from './dance';

export interface MotionFrame {
  timestamp: number;
  poseLandmarks: BodyLandmark[];
  leftHandLandmarks?: FingerLandmark[];
  rightHandLandmarks?: FingerLandmark[];
}

export type LandmarkFrame = MotionFrame;

export interface SynchronizedPerformanceFrame {
  timestamp: number;
  pose?: {
    landmarks: BodyLandmark[];
    features: PoseFeatures | null;
    candidate: PoseCandidate | null;
  };
  leftHand?: {
    landmarks: FingerLandmark[];
    mudra: MudraObservation | null;
  };
  rightHand?: {
    landmarks: FingerLandmark[];
    mudra: MudraObservation | null;
  };
}

export type MotionSpeed = 'STATIC' | 'SLOW' | 'NORMAL' | 'FAST' | 'VERY_FAST';
export type MotionMode = 'NORMAL' | 'FAST' | 'VERY_FAST';

export interface KinematicFeatures {
  position: { x: number; y: number; z?: number };
  velocity: number;
  acceleration: number;
  direction: number; // in radians
  timestamp: number;
}

export interface TrajectoryPoint {
  x: number;
  y: number;
  timestamp: number;
}

export interface JointTrajectory {
  jointName: string;
  points: TrajectoryPoint[];
  totalDistance: number;
  normalizedRate: number;
  directionChangeCount: number;
}

export interface MotionScore {
  velocityScore: number;
  accelerationScore: number;
  trajectoryScore: number;
  directionChangeScore: number;
  overallScore: number;
}

export interface FramePerformance {
  expectedFrames: number;
  processedFrames: number;
  droppedFrames: number;
  actualFPS: number;
  quality: 'Excellent' | 'Good' | 'Reduced';
  message: string;
}

export interface DeviceMotionCalibration {
  actualFPS: number;
  frameIntervalMs: number;
  landmarkStability: number;
  cameraResolution: string;
  bodyScale: number;
  calibratedAt: number;
  isCalibrated: boolean;
}

export interface HighSpeedMovementEvent {
  timestamp: number;
  affectedJoints: string[];
  speed: number;
  acceleration: number;
  direction: number; // in radians (-PI to PI)
  motionLevel: 'FAST' | 'VERY_FAST';
  trackingConfidence: number;
  trajectory: TrajectoryPoint[];
}

export interface MotionFeatures {
  velocity: number;
  acceleration: number;
  direction: number;
  wristVelocity: number;
  leftWristVelocity?: number;
  rightWristVelocity?: number;
  handVelocity?: number;
  elbowVelocity: number;
  leftElbowVelocity?: number;
  rightElbowVelocity?: number;
  shoulderVelocity: number;
  leftShoulderVelocity?: number;
  rightShoulderVelocity?: number;
  hipVelocity: number;
  kneeVelocity: number;
  leftKneeVelocity?: number;
  rightKneeVelocity?: number;
  ankleVelocity: number;
  leftAnkleVelocity?: number;
  rightAnkleVelocity?: number;
  footVelocity?: number;
  bodyCenterVelocity?: number;
  bodyRotation: number;
  speedCategory: MotionSpeed;
  motionMode: MotionMode;
  motionScore: MotionScore;
  bodyScale: number; // normalized shoulder/hip/torso geometry
  isMotionBlurred?: boolean;
  blurStatus?: 'OPTIMAL' | 'RAPID_MOTION_LOW_CONFIDENCE' | 'RAPID_MOTION_RESTORED';
  blurMessage?: string;
  kinematics?: Record<string, KinematicFeatures>;
  highSpeedEvent?: HighSpeedMovementEvent | null;
  activeJointPriorities?: string[];
  effectiveAlpha?: number;
}

export interface MudraFeaturesVector {
  fingerStates: number[]; // 5 finger extension ratios [thumb, index, middle, ring, pinky]
  jointAngles: number[]; // PIP and DIP angles for all fingers
  fingertipDistances: number[]; // normalized distances: thumb-index, thumb-middle, thumb-ring, thumb-pinky
  palmOrientation: number[]; // [x, y, z] normal vector
  handShape: number[]; // finger spreads + wrist angle
  handVisibility: number; // visible / expected landmarks ratio (0 to 1)
}

export interface RecognitionResult {
  label: string;
  confidence: number;
  sanskritName?: string;
  category?: string;
  status: 'CONFIRMED' | 'ANALYZING' | 'UNCERTAIN' | 'LOW_VISIBILITY' | 'OCCLUDED';
  stabilityFrames?: number;
  evidence?: string[];
}

export interface DanceFormPrediction {
  danceFormId: string;
  name: string;
  category: DanceCategory;
  state: string;
  confidence: number;
  evidence: string[];
  isConfirmed: boolean;
  temporalStabilityScore: number;
}

export type DanceEventType =
  | 'MUDRA_CONFIRMED'
  | 'POSE_CONFIRMED'
  | 'MOVEMENT_CONFIRMED'
  | 'DANCE_FORM_CONFIRMED'
  | 'HIGH_SPEED_MOVEMENT'
  | 'MOTION_BLUR_ALERT'
  | 'SCENE_CHANGE'
  | 'FRAMING_CHANGE';

export interface DanceEvent {
  timestamp: number;
  type: DanceEventType;
  confidence: number;
  data: any;
  summary: string;
}

export interface FramingStatus {
  headVisible: boolean;
  shouldersVisible: boolean;
  hipsVisible: boolean;
  kneesVisible: boolean;
  feetVisible: boolean;
  overallVisibilityScore: number;
  distanceStatus: 'OPTIMAL' | 'TOO_CLOSE' | 'TOO_FAR' | 'FEET_CUT_OFF' | 'NO_PERSON';
  guidanceMessage: string;
}

export interface DancePerformanceState {
  danceForm?: DanceFormPrediction;
  currentPose?: RecognitionResult;
  leftMudra?: RecognitionResult;
  rightMudra?: RecognitionResult;
  samyutaMudra?: RecognitionResult;
  currentMovement?: RecognitionResult;
  motionSpeed: number | MotionSpeed;
  motionFeatures?: MotionFeatures;
  framePerformance?: FramePerformance;
  highSpeedMovement?: HighSpeedMovementEvent | null;
  framingStatus?: FramingStatus;
  synchronizedFrame?: SynchronizedPerformanceFrame;
  storyState: {
    currentScene: string;
    narrativeState: string;
    recentEvents: string[];
  };
  lastEvents: DanceEvent[];
  fps?: number;
  latencyMs?: number;
}

export interface PipelineEvaluationMetrics {
  poseAccuracy: number;
  mudraAccuracy: number;
  movementAccuracy: number;
  danceFormAccuracy: number;
  precision: number;
  recall: number;
  f1Score: number;
  eventDetectionLatencyMs: number;
  falseEventRate: number;
  missedEventRate: number;
  testedFramesCount: number;
}

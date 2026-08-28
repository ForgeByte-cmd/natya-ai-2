import { CulturalSource } from './pose';
import { DanceCategory, DanceFormCandidate } from './dance';
import { MudraCandidate, MudraObservation } from './mudra';
import { MovementObservation } from './movement';
import { BodyLandmark, PoseCandidate } from './pose';

export type DatasetMediaType =
  | 'PERFORMANCE_VIDEO'
  | 'PERFORMANCE_PHOTO'
  | 'MUDRA_PHOTO'
  | 'POSE_PHOTO'
  | 'MOVEMENT_VIDEO'
  | 'TRAINING_SEQUENCE';

export type DatasetStatus =
  | 'UPLOADED'
  | 'PROCESSING'
  | 'UNVERIFIED'
  | 'REVIEWED'
  | 'APPROVED'
  | 'REJECTED';

export interface PerformanceMetadata {
  danceFormId: string;
  category: DanceCategory;
  state?: string;
  region?: string;
  performanceType: 'SOLO' | 'DUET' | 'GROUP';
  occasion?: string;
  language?: string;
  description?: string;
  performerConsent: boolean;
  uploaderAuthorization: boolean;
  license?: string;
  attribution?: string;
  source: CulturalSource;
  mudraId?: string;
  mudraHandedness?: 'Left' | 'Right' | 'Both';
  poseId?: string;
  movementId?: string;
  bodyOrientation?: 'FRONTAL' | 'PROFILE_LEFT' | 'PROFILE_RIGHT' | 'THREE_QUARTER';
  segmentStartTime?: number;
  segmentEndTime?: number;
}

export interface DatasetUploadItem {
  id: string;
  file: File;
  previewUrl?: string;
  mediaType: DatasetMediaType;
  metadata: PerformanceMetadata;
  status: 'QUEUED' | 'UPLOADING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
  progress: number;
  stageMessage?: string;
  error?: string;
  sampleId?: string;
}

export interface MovementSegment {
  videoId: string;
  startTime: number;
  endTime: number;
  movementId: string;
  description?: string;
}

export interface HandLandmark {
  x: number;
  y: number;
  z: number;
}

export interface DatasetFrame {
  frameIndex: number;
  timestamp: number;
  poseLandmarks?: BodyLandmark[];
  leftHandLandmarks?: HandLandmark[];
  rightHandLandmarks?: HandLandmark[];
  imageUrl?: string;
  detectedMudraLeft?: string;
  detectedMudraRight?: string;
  detectedPose?: string;
}

export interface TrainingFrame {
  sampleId: string;
  timestamp: number;
  pose: BodyLandmark[];
  hands: {
    handedness: 'Left' | 'Right';
    landmarks: HandLandmark[];
  }[];
  labels: {
    danceFormId?: string;
    poseId?: string;
    mudraId?: string;
    movementId?: string;
  };
}

export interface TrainingSequence {
  id: string;
  danceFormId: string;
  poseIds: string[];
  mudraIds: string[];
  movementId?: string;
  frames: TrainingFrame[];
  duration: number;
  sourceSampleId: string;
  verified: boolean;
  split?: 'TRAINING' | 'VALIDATION' | 'TESTING';
  performerId?: string;
}

export interface DatasetSample {
  id: string;
  title: string;
  mediaType: DatasetMediaType;
  mediaUrl: string;
  thumbnailUrl?: string;
  danceFormId: string;
  danceFormName: string;
  mudraId?: string;
  mudraName?: string;
  poseId?: string;
  poseName?: string;
  movementId?: string;
  movementName?: string;
  metadata: PerformanceMetadata;
  status: DatasetStatus;
  uploadedBy: string;
  createdAt: string;
  reviewedBy?: string;
  reviewedAt?: string;
  reviewNotes?: string;
  qualityMetrics?: {
    bodyVisibilityScore: number;
    handVisibilityScore: number;
    frameIntegrityScore: number;
    lightingScore: number;
  };
  duration?: number;
  frameCount?: number;
  extractedFrames?: DatasetFrame[];
  trainingSequence?: TrainingSequence;
  analysisReportId?: string;
}

export interface ModelMetrics {
  accuracy?: number;
  precision?: number;
  recall?: number;
  f1?: number;
  sampleCount?: number;
  danceFormAccuracy?: Record<string, number>;
  mudraAccuracy?: Record<string, number>;
}

export interface ModelVersion {
  id: string;
  version: string;
  trainedAt: string;
  datasetVersion: string;
  supportedDanceForms: string[];
  supportedMudras: string[];
  metrics: ModelMetrics;
  status: 'TRAINING' | 'VALIDATING' | 'APPROVED' | 'PRODUCTION' | 'ARCHIVED';
  trainingSamplesCount: number;
  validationSamplesCount: number;
  testSamplesCount: number;
  description?: string;
}

export interface PerformanceAnalysisJob {
  id: string;
  mediaId: string;
  status: 'QUEUED' | 'PROCESSING' | 'ANALYZING' | 'COMPLETED' | 'FAILED';
  progress: number;
  stageMessage?: string;
  startedAt?: string;
  completedAt?: string;
  error?: string;
}

export interface PerformanceSegment {
  startTime: number;
  endTime: number;
  timestampFormatted: string;
  eventType: 'MUDRA_CHANGE' | 'POSE_CHANGE' | 'MOVEMENT' | 'SCENE_CHANGE' | 'SECTION';
  danceForm?: DanceFormCandidate[];
  pose?: PoseCandidate[];
  movements: MovementObservation[];
  leftMudra?: MudraCandidate[];
  rightMudra?: MudraCandidate[];
  shastricDescription?: string;
  thumbnailUrl?: string;
}

export interface MudraMeaningItem {
  meaning: string;
  source: CulturalSource;
  rasa?: string;
  context?: string;
}

export interface MudraInterpretation {
  mudraId: string;
  mudraName: string;
  sanskritName: string;
  handedness?: 'Left' | 'Right' | 'Both';
  detectedConfidence: number;
  possibleMeanings: MudraMeaningItem[];
  contextualMeaning?: string;
  contextEvidence: string[];
  isAiInterpretation: boolean;
}

export interface PerformanceInterpretation {
  danceForm: {
    name: string;
    confidence: number;
    explanation: string;
  };
  detectedElements: {
    type: 'MUDRA' | 'POSE' | 'MOVEMENT' | 'EXPRESSION';
    name: string;
    confidence: number;
  }[];
  meanings: {
    element: string;
    possibleMeanings: string[];
    contextualMeaning?: string;
    confidence: number;
    explanation: string;
  }[];
  scene: {
    title: string;
    explanation: string;
  };
  story: {
    summary: string;
    currentEvent: string;
    nextPossibleEvent?: string;
  };
  liveCaption: string;
  culturalContext: string;
  uncertainty: string[];
}

export interface StoryState {
  performanceId: string;
  currentScene?: string;
  previousScenes: string[];
  detectedCharacters: string[];
  narrativeEvents: string[];
  currentNarrativeState: string;
}

export interface PerformanceEvent {
  timestamp: number;
  eventType: 'MUDRA_CHANGE' | 'POSE_CHANGE' | 'MOVEMENT' | 'EXPRESSION' | 'SCENE_CHANGE';
  observations: unknown[];
}

export interface PerformanceAnalysisReport {
  performanceId: string;
  title: string;
  mediaType: DatasetMediaType;
  mediaUrl: string;
  thumbnailUrl?: string;
  detectedDanceForms: DanceFormCandidate[];
  timeline: PerformanceSegment[];
  mudraAnalysis: MudraInterpretation[];
  movementAnalysis: MovementObservation[];
  poseAnalysis: PoseCandidate[];
  movementAnalysisAvailable: boolean;
  story: StoryState;
  interpretations: PerformanceInterpretation[];
  culturalSources: CulturalSource[];
  modelVersion: string;
  analyzedAt: string;
  shastricSummary: {
    rasaBhava: string;
    nrittaVsNrityaRatio: string;
    primaryViniyoga: string;
    angaShuddhiScore: number;
    scripturalRef: string;
  };
}

export interface DatasetStats {
  totalPerformances: number;
  totalPhotos: number;
  totalVideos: number;
  totalApprovedSamples: number;
  totalPendingSamples: number;
  totalRejectedSamples: number;
  totalTrainingSequences: number;
  danceFormsDistribution: {
    danceFormId: string;
    name: string;
    sampleCount: number;
    coverageStatus: 'FULL_COVERAGE' | 'TRAINING_IN_PROGRESS' | 'INSUFFICIENT_DATA';
    accuracy?: number;
  }[];
  mudrasDistribution: {
    mudraId: string;
    name: string;
    sampleCount: number;
  }[];
  datasetSplits: {
    trainingCount: number;
    validationCount: number;
    testingCount: number;
  };
}

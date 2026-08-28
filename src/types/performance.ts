import { DanceFormCandidate } from './dance';
import { MovementObservation } from './movement';
import { MudraCandidate, MudraObservation } from './mudra';
import { PoseCandidate } from './pose';
import { StoryInterpretationResult } from './story';

export interface CaptionEvent {
  id: string;
  timestamp: number;
  timeFormatted: string;
  text: string;
  danceForm?: string;
  pose?: string;
  movement?: string;
  mudra?: string;
  confidence: number;
  rasa?: string;
  isAiGenerated?: boolean;
}

export interface PerformanceSession {
  id: string;
  startedAt: string;
  endedAt?: string;
  durationSeconds: number;
  language: string;
  danceForms: DanceFormCandidate[];
  movements: MovementObservation[];
  mudras: MudraObservation[];
  poses: PoseCandidate[];
  captions: CaptionEvent[];
  storyEvents: StoryInterpretationResult[];
  notes?: string;
}

export interface ExpertCorrection {
  id: string;
  sessionId?: string;
  timestamp: number;
  targetType: 'MUDRA' | 'POSE' | 'MOVEMENT' | 'DANCE_FORM';
  detectedValue: string;
  correctedValue: string;
  expertName?: string;
  expertCredentials?: string;
  notes?: string;
  handFeaturesSnapshot?: Record<string, unknown>;
  poseFeaturesSnapshot?: Record<string, unknown>;
}

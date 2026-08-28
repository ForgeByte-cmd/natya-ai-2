import { CulturalSource } from './pose';

export type DanceCategory =
  | 'CLASSICAL'
  | 'FOLK'
  | 'TRIBAL'
  | 'RITUAL'
  | 'THEATRE'
  | 'TRADITIONAL'
  | 'CONTEMPORARY_FOLK';

export type DanceFormCategory = DanceCategory;

export interface DanceFormRecord {
  id: string;
  name: string;
  nativeName: string;
  category: DanceCategory;
  state: string;
  region: string;
  communityOrTradition: string;
  occasion: string;
  movementCharacteristics: string;
  musicCharacteristics: string;
  gestureUsage: string;
  keyStances: string[];
  signatureMudras: string[];
  description: string;
  sources: CulturalSource[];
  colorTheme?: string;
}

export interface DanceFormCandidate {
  danceFormId: string;
  name: string;
  category: DanceCategory;
  state: string;
  confidence: number; // 0 to 1
  reasons?: string[];
  reasoning?: string[];
}

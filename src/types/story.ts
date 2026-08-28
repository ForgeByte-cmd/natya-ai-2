import { CulturalSource } from './pose';

export interface StoryScene {
  id: string;
  sceneName: string;
  narrativeDescription: string;
  characters: string[];
  keyMudras: string[];
  keyPoses: string[];
  keyMovements: string[];
  rasa: string;
  culturalSignificance: string;
}

export interface StoryDefinition {
  id: string;
  title: string;
  traditionalOrigin: string;
  sourceTexts: string[];
  associatedDanceForms: string[];
  characters: string[];
  scenes: StoryScene[];
  sources: CulturalSource[];
}

export interface StoryInterpretationResult {
  storyTitle: string;
  sceneName: string;
  narrativeText: string;
  characters: string[];
  rasa: string;
  confidence: number;
  culturalInsight: string;
}

export interface SceneMatch {
  storyId: string;
  storyTitle: string;
  sceneId: string;
  sceneName: string;
  confidence: number;
  rasa: string;
  narrativeDescription: string;
  culturalSignificance: string;
  characters: string[];
}

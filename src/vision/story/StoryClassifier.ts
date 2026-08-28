import { MYTHOLOGY_STORIES } from '../../data/stories/mythologyStories';
import { MovementObservation } from '../../types/movement';
import { MudraObservation } from '../../types/mudra';
import { PoseCandidate } from '../../types/pose';
import { SceneMatch } from '../../types/story';

export class StoryClassifier {
  classify(
    poses: PoseCandidate[],
    mudras: MudraObservation[],
    movement: MovementObservation | null
  ): SceneMatch[] {
    const matches: SceneMatch[] = [];

    for (const story of MYTHOLOGY_STORIES) {
      for (const scene of story.scenes) {
        let matchScore = 0;
        let factorCount = 0;

        // Check Mudra overlap
        for (const m of mudras) {
          const matched = scene.keyMudras.some((km) =>
            km.toLowerCase().includes(m.name.toLowerCase()) || m.name.toLowerCase().includes(km.toLowerCase())
          );
          if (matched) {
            matchScore += m.confidence * 1.2;
            factorCount += 1;
          }
        }

        // Check Pose overlap
        for (const p of poses) {
          const matched = scene.keyPoses.some((kp) =>
            kp.toLowerCase().includes(p.name.toLowerCase()) || p.name.toLowerCase().includes(kp.toLowerCase())
          );
          if (matched) {
            matchScore += p.confidence * 1.0;
            factorCount += 1;
          }
        }

        if (factorCount > 0 && matchScore > 0.4) {
          const confidence = Math.min(0.98, matchScore / Math.max(1.5, factorCount));
          matches.push({
            storyId: story.id,
            storyTitle: story.title,
            sceneId: scene.id,
            sceneName: scene.sceneName,
            confidence,
            rasa: scene.rasa,
            narrativeDescription: scene.narrativeDescription,
            culturalSignificance: scene.culturalSignificance,
            characters: scene.characters,
          });
        }
      }
    }

    matches.sort((a, b) => b.confidence - a.confidence);
    return matches;
  }
}

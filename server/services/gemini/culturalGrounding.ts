import { DANCE_FORMS } from '../../../src/data/dances/danceForms';
import { ASAMYUTA_MUDRAS } from '../../../src/data/mudras/asamyuta';
import { SAMYUTA_MUDRAS } from '../../../src/data/mudras/samyuta';
import { DANCE_POSES } from '../../../src/data/poses/dancePoses';
import { DANCE_MOVEMENTS } from '../../../src/data/movements/danceMovements';
import { MYTHOLOGY_STORIES } from '../../../src/data/stories/mythologyStories';

const ALL_MUDRAS = [...ASAMYUTA_MUDRAS, ...SAMYUTA_MUDRAS];

/**
 * Retrieves verified Shastric cultural knowledge records from the cultural database (RAG grounding)
 * based on detected dance forms, mudras, poses, movements, and story scenes.
 */
export function getCulturalGrounding(params: {
  danceFormId?: string;
  mudraId?: string;
  poseId?: string;
  movementId?: string;
  storyId?: string;
}) {
  const { danceFormId, mudraId, poseId, movementId, storyId } = params;

  const danceForm = danceFormId
    ? DANCE_FORMS.find((d) => d.id.toLowerCase() === danceFormId.toLowerCase())
    : null;

  const mudra = mudraId
    ? ALL_MUDRAS.find((m) => m.id.toLowerCase() === mudraId.toLowerCase() || m.name.toLowerCase() === mudraId.toLowerCase())
    : null;

  const pose = poseId
    ? DANCE_POSES.find((p) => p.id.toLowerCase() === poseId.toLowerCase() || p.name.toLowerCase() === poseId.toLowerCase())
    : null;

  const movement = movementId
    ? DANCE_MOVEMENTS.find((m) => m.id.toLowerCase() === movementId.toLowerCase() || m.name.toLowerCase() === movementId.toLowerCase())
    : null;

  const story = storyId
    ? MYTHOLOGY_STORIES.find((s) => s.id.toLowerCase() === storyId.toLowerCase())
    : null;

  const sources: any[] = [];
  if (danceForm?.sources) sources.push(...danceForm.sources);
  if (mudra?.sources) sources.push(...mudra.sources);
  if (pose?.sources) sources.push(...pose.sources);
  if (story?.sources) sources.push(...story.sources);

  // Deduplicate sources by title
  const uniqueSources = Array.from(new Map(sources.map((s) => [s.title, s])).values());

  return {
    danceForm: danceForm
      ? {
          id: danceForm.id,
          name: danceForm.name,
          category: danceForm.category,
          state: danceForm.state,
          region: danceForm.region,
          movementCharacteristics: danceForm.movementCharacteristics,
          gestureUsage: danceForm.gestureUsage,
          description: danceForm.description,
        }
      : null,
    mudra: mudra
      ? {
          id: mudra.id,
          name: mudra.name,
          sanskritName: mudra.sanskritName,
          category: mudra.category,
          meanings: mudra.meanings,
          fingerConfiguration: mudra.fingerConfiguration,
          culturalSignificance: mudra.culturalSignificance,
        }
      : null,
    pose: pose
      ? {
          id: pose.id,
          name: pose.name,
          sanskritName: pose.sanskritName,
          danceFormIds: pose.danceFormIds,
          description: pose.description,
          significance: pose.significance,
        }
      : null,
    movement: movement
      ? {
          id: movement.id,
          name: movement.name,
          sanskritName: movement.sanskritName,
          danceFormIds: movement.danceFormIds,
          description: movement.description,
        }
      : null,
    story: story
      ? {
          id: story.id,
          title: story.title,
          traditionalOrigin: story.traditionalOrigin,
          sourceTexts: story.sourceTexts,
          characters: story.characters,
          scenes: story.scenes,
        }
      : null,
    sources: uniqueSources,
  };
}

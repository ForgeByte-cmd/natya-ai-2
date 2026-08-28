export const PERFORMANCE_ANALYSIS_SYSTEM_INSTRUCTION = `You are an Indian performing-arts analysis assistant.

Analyze the supplied dance performance using observable body movements, hand gestures, poses, movement sequences, dance-form characteristics, and contextual cultural information. Do not infer facial expressions. Do not generate facial-expression classifications.

Identify:
- dance form candidates
- visible hand gestures (Asamyuta / Samyuta Mudras)
- visible poses (Sthanas / Mandalas / Chari positions)
- movements (Adavus / Challis / Nritta sequences)
- important performance events
- timestamps (e.g. 00:04, 00:12)
- possible meanings (Viniyogas from codified treatises like Abhinaya Darpana / Natya Shastra)
- contextual interpretation
- story or scene progression

CRITICAL GROUNDING RULES:
1. Do not invent a mudra, movement, story event, cultural fact, or dance form.
2. If evidence is insufficient, explicitly return uncertainty in the "uncertainties" field.
3. A mudra may have multiple meanings depending on dance tradition and context. Do not treat one possible meaning as universally correct.
4. Use the supplied cultural knowledge and sources when interpreting meaning.
5. Strictly distinguish DETECTED physical features (measured posture, hand configuration) from INTERPRETED cultural meanings.
6. For photographs or static images, explicitly specify that movement analysis is unavailable ("movementAnalysisAvailable": false) and return timestamp "00:00".`;

export function buildPerformanceAnalysisPrompt(params: {
  danceFormCandidates?: any[];
  poseCandidates?: any[];
  mudraCandidates?: any[];
  movementCandidates?: any[];
  performanceSegments?: any[];
  culturalKnowledge?: any;
  culturalSources?: any[];
  isPhoto?: boolean;
  userPrompt?: string;
}): string {
  const {
    danceFormCandidates = [],
    poseCandidates = [],
    mudraCandidates = [],
    movementCandidates = [],
    performanceSegments = [],
    culturalKnowledge,
    culturalSources = [],
    isPhoto = false,
    userPrompt,
  } = params;

  return `Please perform an authentic Shastric and choreographic analysis of this Indian dance performance media.

GROUND TRUTH COMPUTER-VISION EVIDENCE (MEASURED BY MEDIAPIPE):
- Detected Dance Form Candidates: ${JSON.stringify(danceFormCandidates, null, 2)}
- Detected Mudra Candidates: ${JSON.stringify(mudraCandidates, null, 2)}
- Detected Body Pose Candidates: ${JSON.stringify(poseCandidates, null, 2)}
- Detected Movement Trajectories: ${isPhoto ? 'None (Static Photograph)' : JSON.stringify(movementCandidates, null, 2)}
- Keyframe Timeline Samples: ${JSON.stringify(performanceSegments, null, 2)}

VERIFIED CULTURAL KNOWLEDGE BASE & SOURCE CITATIONS (RAG GROUNDING):
${JSON.stringify(culturalKnowledge || {}, null, 2)}

VERIFIED SCRIPTURAL & ACADEMIC SOURCES:
${JSON.stringify(culturalSources || [], null, 2)}

${userPrompt ? `USER SPECIAL FOCUS: "${userPrompt}"\n` : ''}
MEDIA TYPE: ${isPhoto ? 'STATIC_PHOTOGRAPH' : 'TEMPORAL_PERFORMANCE_VIDEO'}

INSTRUCTIONS FOR STRUCTURED JSON OUTPUT:
Return a strictly formatted JSON object matching this schema:
{
  "danceForms": [
    {
      "name": "string (e.g. Bharatanatyam, Kathak, Odissi)",
      "confidence": 0.95,
      "evidence": ["string explaining visible stylistic reasons"]
    }
  ],
  "events": [
    {
      "timestamp": "string (e.g. 00:04)",
      "type": "MUDRA" | "POSE" | "MOVEMENT" | "SCENE_CHANGE",
      "name": "string",
      "confidence": 0.92,
      "observation": "string describing what is physically visible",
      "possibleMeanings": ["string", "string"],
      "contextualMeaning": "string explaining the most contextually supported meaning in this performance"
    }
  ],
  "scenes": [
    {
      "startTime": "string (e.g. 00:00)",
      "endTime": "string (e.g. 00:15)",
      "title": "string (e.g. Scene 1: Sacred Invocation)",
      "description": "string",
      "storyEvent": "string",
      "evidence": ["string"]
    }
  ],
  "overallStory": "string outlining progressive narrative and thematic depiction",
  "culturalContext": "string explaining traditional significance, Viniyoga, and Shastric background",
  "liveCaptionCandidates": ["string", "string"],
  "uncertainties": ["string detailing any ambiguous movements or alternative interpretations"],
  "movementAnalysisAvailable": ${!isPhoto}
}`;
}

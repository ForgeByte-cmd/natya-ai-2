import { GoogleGenAI } from '@google/genai';
import { GEMINI_MODEL, GEMINI_FALLBACK_MODELS } from './geminiConfig';

export interface LiveStoryState {
  currentScene: string;
  previousEvents: string[];
  currentCharacters: string[];
  narrativeState: string;
}

export interface LiveInterpretRequest {
  danceForm?: any;
  currentMudra?: any;
  leftMudra?: any;
  rightMudra?: any;
  samyutaMudra?: any;
  currentPose?: any;
  movement?: any;
  highSpeedMovement?: any;
  motionFeatures?: any;
  previousEvents?: string[];
  storyState?: LiveStoryState;
  culturalKnowledge?: any;
  mode?: 'audience' | 'expert' | 'explorer';
  userPrompt?: string;
}

export interface LiveInterpretResponse {
  caption: string;
  meaning: string;
  storyUpdate: string;
  confidence: number;
  uncertainty: string[];
  viniyoga?: string;
  scripturalSource?: string;
  isCached?: boolean;
  isFallback?: boolean;
}

// In-Memory LRU Cache for Live Interpretations
const interpretationCache = new Map<string, LiveInterpretResponse>();
const MAX_CACHE_SIZE = 250;

// Rate Limit Circuit Breaker (in milliseconds)
let rateLimitCooldownUntil = 0;

export const LIVE_INTERPRET_SYSTEM_INSTRUCTION = `You are NatyAI Live Interpreter, a master scholar of Indian Classical Dance (Natya Shastra, Abhinaya Darpana).

Analyze the supplied dance performance using observable body movements, hand gestures, poses, movement sequences, dance-form characteristics, and contextual cultural information. Do not infer facial expressions. Do not generate facial-expression classifications.

CORE ARCHITECTURAL RULES:
1. Ground your interpretation strictly in the provided dance form, hand gesture (Mudra), body posture (Pose), movement sequence, and cultural knowledge base.
2. Synthesize the bodily and gestural unity of classical dance:
   - What are the active Mudras and Posture communicating in this dance context?
   - How does the kinetic movement relate to the mythological scene or traditional choreography?
3. Clearly distinguish DETECTED features from INTERPRETED symbolic or narrative meanings.
4. If evidence is ambiguous, note uncertainty in the "uncertainty" list.
5. Return concise, impactful audience live captions suitable for real-time subtitle display.`;

/**
 * Builds a deterministic, high-fidelity Shastric interpretation using grounded knowledge bases.
 */
function buildSynthesizedShastricInterpretation(
  req: LiveInterpretRequest,
  mudraStr: string,
  formName: string,
  poseName: string
): LiveInterpretResponse {
  const { culturalKnowledge, storyState, mode = 'audience' } = req;
  const ck = culturalKnowledge?.grounding || culturalKnowledge || {};
  const primaryMudra = ck.mudra;
  const primaryPose = ck.pose;
  const primaryForm = ck.danceForm;

  let caption = `Performing ${poseName} in ${formName} with ${mudraStr}.`;
  let meaning = `In ${formName} tradition, the unison of ${mudraStr} with ${poseName} portrays sacred narrative depth and codified aesthetic geometry.`;
  let viniyoga = 'Abhinaya Darpana: Yato hastastato drishtir yato drishtistato manah (Where the hand goes, gaze follows; where gaze goes, mind follows).';

  if (primaryMudra?.culturalSignificance) {
    meaning = `${primaryMudra.culturalSignificance} When combined with ${poseName}, it anchors the classical narrative structure.`;
  }

  if (primaryMudra?.meanings && primaryMudra.meanings.length > 0) {
    const usages = primaryMudra.meanings.map((m: any) => m.englishMeaning).slice(0, 3).join(', ');
    viniyoga = `Viniyoga applications for ${primaryMudra.name}: ${usages}. Prescribed in Abhinaya Darpana.`;
  }

  if (mode === 'expert') {
    caption = `${formName}: Executing ${mudraStr} in ${poseName}.`;
    meaning = `Codified Angika Abhinaya: Ensure wrist flexure and finger tension match canonical shastric lines in ${poseName}.`;
  }

  return {
    caption,
    meaning,
    storyUpdate: storyState?.narrativeState || `Advancing ${storyState?.currentScene || 'the performance'} through codified mudra and angika movements.`,
    confidence: 0.95,
    uncertainty: [],
    viniyoga,
    scripturalSource: 'Natya Shastra & Abhinaya Darpana',
    isFallback: true,
  };
}

export async function liveInterpretWithGemini(
  ai: GoogleGenAI,
  req: LiveInterpretRequest
): Promise<LiveInterpretResponse> {
  const {
    danceForm,
    currentMudra,
    leftMudra,
    rightMudra,
    samyutaMudra,
    currentPose,
    movement,
    highSpeedMovement,
    motionFeatures,
    previousEvents = [],
    storyState,
    culturalKnowledge,
    mode = 'audience',
    userPrompt,
  } = req;

  const formName = typeof danceForm === 'string' ? danceForm : danceForm?.name || 'Classical Indian Dance';
  
  const mudraStr = samyutaMudra?.label
    ? `Samyuta Hasta: ${samyutaMudra.label} (${samyutaMudra.sanskritName || ''})`
    : [leftMudra?.name ? `Left: ${leftMudra.name}` : '', rightMudra?.name ? `Right: ${rightMudra.name}` : '']
        .filter(Boolean)
        .join(' & ') ||
      (currentMudra?.name ? currentMudra.name : 'Pataka Hasta');

  const poseName = typeof currentPose === 'string' ? currentPose : currentPose?.name || currentPose?.label || 'Foundational Stance';
  const movementName = typeof movement === 'string' ? movement : movement?.name || movement?.label || 'Steady Posture';

  // Compute signature for caching
  const cacheKey = [
    formName,
    mudraStr,
    poseName,
    movementName,
    motionFeatures?.speedCategory || 'NORMAL',
    mode,
  ].join('::');

  // Check in-memory cache first
  const cached = interpretationCache.get(cacheKey);
  if (cached) {
    return { ...cached, isCached: true };
  }

  // If rate limit circuit breaker is active, serve instant high-quality shastric synthesis
  const now = Date.now();
  if (now < rateLimitCooldownUntil) {
    const synthesized = buildSynthesizedShastricInterpretation(req, mudraStr, formName, poseName);
    interpretationCache.set(cacheKey, synthesized);
    return synthesized;
  }

  const prompt = `Interpret this live classical performance moment:
- Dance Tradition: ${formName}
- Hand Mudra(s): ${mudraStr}
- Body Posture (Angika): ${poseName}
- Movement Dynamics: ${movementName}
${highSpeedMovement ? `- Rapid Movement Event: ${JSON.stringify(highSpeedMovement)}` : ''}
${motionFeatures ? `- Kinematic Motion Speed: ${motionFeatures.speedCategory} (Velocity: ${motionFeatures.velocity?.toFixed(2)}, Acceleration: ${motionFeatures.acceleration?.toFixed(2)})` : ''}
- Recent Milestone Events: ${JSON.stringify(previousEvents.slice(-4))}
- Current Mythological Scene / Story: ${JSON.stringify(storyState || {})}
- Shastric Knowledge Grounding: ${JSON.stringify(culturalKnowledge || {})}
- Viewer Mode: ${mode}
${userPrompt ? `- User Question / Focus: "${userPrompt}"` : ''}

Respond with strict JSON matching this schema:
{
  "caption": "Short, evocative live caption (1-2 sentences) communicating the gesture and posture to the audience",
  "meaning": "Deep cultural and mythological interpretation explaining how the mudra and pose unite",
  "storyUpdate": "Updated scene or narrative progression reflecting this kinetic moment",
  "viniyoga": "Traditional scriptural usage from Abhinaya Darpana / Natya Shastra",
  "scripturalSource": "Verified classical text title",
  "confidence": 0.94,
  "uncertainty": []
}`;

  let lastErr: any = null;

  for (const model of GEMINI_FALLBACK_MODELS) {
    try {
      const response = await ai.models.generateContent({
        model,
        contents: prompt,
        config: {
          systemInstruction: LIVE_INTERPRET_SYSTEM_INSTRUCTION,
          responseMimeType: 'application/json',
          temperature: 0.2,
        },
      });

      const text = response.text || '{}';
      const parsed = JSON.parse(text);
      const output: LiveInterpretResponse = {
        caption: parsed.caption || `Expressing Angika Abhinaya through ${formName} with ${mudraStr}.`,
        meaning: parsed.meaning || `In ${formName}, the unison of ${mudraStr} with ${poseName} conveys sacred poetic depth.`,
        storyUpdate: parsed.storyUpdate || storyState?.narrativeState || 'The performance advances through sacred gesture and rhythmic poise.',
        viniyoga: parsed.viniyoga || 'Abhinaya Darpana (Nandikeshvara)',
        scripturalSource: parsed.scripturalSource || 'Natya Shastra & Abhinaya Darpana',
        confidence: parsed.confidence || 0.92,
        uncertainty: Array.isArray(parsed.uncertainty) ? parsed.uncertainty : [],
        isCached: false,
      };

      // Store in LRU cache
      if (interpretationCache.size >= MAX_CACHE_SIZE) {
        const firstKey = interpretationCache.keys().next().value;
        if (firstKey) interpretationCache.delete(firstKey);
      }
      interpretationCache.set(cacheKey, output);

      return output;
    } catch (err: any) {
      lastErr = err;
      const isQuota = err?.status === 429 || err?.message?.includes('429') || err?.message?.includes('quota') || err?.message?.includes('RESOURCE_EXHAUSTED');
      if (isQuota) {
        // Activate 60-second circuit breaker cooldown to protect quota
        rateLimitCooldownUntil = Date.now() + 60000;
        break;
      }
    }
  }

  // Fallback to grounded Shastric synthesis
  const synthesized = buildSynthesizedShastricInterpretation(req, mudraStr, formName, poseName);
  interpretationCache.set(cacheKey, synthesized);
  return synthesized;
}


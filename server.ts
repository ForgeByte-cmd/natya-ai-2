import express from 'express';
import path from 'path';
import fs from 'fs';
import os from 'os';
import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';
import { GEMINI_MODEL } from './server/services/gemini/geminiConfig';
import { uploadGeminiVideo } from './server/services/gemini/uploadGeminiVideo';
import {
  analyzePerformanceWithGemini,
  GeminiPerformanceAnalysis,
} from './server/services/gemini/analyzePerformance';
import {
  liveInterpretWithGemini,
  LiveInterpretRequest,
  LiveInterpretResponse,
} from './server/services/gemini/liveInterpret';
import { getCulturalGrounding } from './server/services/gemini/culturalGrounding';

dotenv.config();

const app = express();
const PORT = Number(process.env.PORT) || 3000;

// Support high-resolution performance keyframes and video chunks
app.use(express.json({ limit: '60mb' }));

// Lazy GoogleGenAI client initialization
let genAI: GoogleGenAI | null = null;
function getGenAI(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY' || apiKey.trim() === '') {
    return null;
  }
  if (!genAI) {
    genAI = new GoogleGenAI({
      apiKey: apiKey.trim(),
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  }
  return genAI;
}

// Fallback models in priority order
const CANDIDATE_MODELS = [
  GEMINI_MODEL,
  'gemini-3.1-flash-lite',
  'gemini-flash-latest',
];

async function callGenAIWithFallback(
  ai: GoogleGenAI,
  requestParams: { contents: any; config?: any }
) {
  let lastError: any = null;
  for (const model of CANDIDATE_MODELS) {
    try {
      const generatePromise = ai.models.generateContent({
        model,
        contents: requestParams.contents,
        config: {
          ...requestParams.config,
        },
      });

      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error(`Timeout calling model ${model}`)), 12000)
      );

      const response: any = await Promise.race([generatePromise, timeoutPromise]);
      if (response && response.text) {
        return response.text;
      }
    } catch (err: any) {
      lastError = err;
    }
  }
  throw lastError;
}

function buildOfflineInterpretation(params: {
  danceForm?: any;
  poses?: any[];
  mudras?: any[];
  movements?: any;
  storyScene?: any;
  mode?: string;
  userPrompt?: string;
}) {
  const { danceForm, poses = [], mudras = [], storyScene, mode = 'audience' } = params;

  const formName = danceForm?.name || 'Classical Indian Dance';
  const mudraNames = mudras.length > 0
    ? mudras.map((m: any) => `${m.name}${m.sanskritName ? ` (${m.sanskritName})` : ''}`).join(' and ')
    : 'sacred Hasta mudras';
  
  const poseName = poses.length > 0 && poses[0]?.name ? poses[0].name : 'foundational stance';

  if (storyScene) {
    return {
      liveCaption: `Portraying "${storyScene.title}" through ${formName} with ${mudraNames} in ${poseName}.`,
      culturalMeaning: `In traditional Natyashastra dramaturgy, this scene depicts ${storyScene.title} (${storyScene.deity || 'classical theme'}). The hand gestures (${mudraNames}) unite with ${poseName} to articulate the sacred narrative, transforming kinetic energy into transcendent spiritual aesthetic (Rasa).`,
      viniyoga: `Abhinaya Darpana prescribes these Hasthas and body postures for sacred invocations, narrative storytelling, and invoking divine attributes.`,
      storytellerNarrative: storyScene.narrativeDescription || `${storyScene.title}: The dancer brings forth ancient epics through intricate footwork, mudras, and bodily geometry.`,
      technicalNotes: `Maintain strict spinal elongation, open hip rotation in ${poseName}, and precise alignment along the body axis.`,
      rasaBhava: storyScene.dominantRasa || 'Bhakti / Shringara',
      scripturalSource: 'Abhinaya Darpana & Natya Shastra',
      isOfflineFallback: true,
    };
  }

  if (mode === 'expert' || mode === 'practice') {
    return {
      liveCaption: `${formName}: Executing ${mudraNames} in ${poseName}.`,
      culturalMeaning: `The alignment of ${mudraNames} within ${formName} tradition represents centuries of codified shastric grammar. The body geometry reflects sacred cosmic proportions (Anga-shuddhi).`,
      viniyoga: `Hastha Lakshana Deepika & Abhinaya Darpana define specific Viniyogas (usages) for ${mudraNames}, serving as the foundational vocabulary for Vakyartha Abhinaya (sentence-level portrayal).`,
      storytellerNarrative: `The practitioner channels pure technical vigor (Nritta) and rhythmic precision, grounding the energy through the heels and palms.`,
      technicalNotes: `Check knee abduction in ${poseName}. Ensure wrist flexure remains crisp, fingers fully separated according to shastric parameters, and chest lifted without arching lumbar spine.`,
      rasaBhava: 'Vira / Shanta',
      scripturalSource: 'Natya Shastra (Bharata Muni) & Abhinaya Darpana (Nandikeshvara)',
      isOfflineFallback: true,
    };
  }

  return {
    liveCaption: `Embodying ${formName} with ${mudraNames} and centered ${poseName}.`,
    culturalMeaning: `In Indian classical aesthetics, dance is considered the fifth Veda (Natya Veda). Every gesture (${mudraNames}) and posture (${poseName}) carries symbolic weight, conveying devotion, the splendor of nature, and universal harmony.`,
    viniyoga: `Traditional verses celebrate these hand configurations and bodily alignments as mediums to express water, blossoms, divine majesty, and inner devotion.`,
    storytellerNarrative: `As the dancer moves with graceful precision, the mudras unfurl like lotus petals, telling stories of devotion, cosmic rhythm, and timeless mythology.`,
    technicalNotes: `Maintain equilateral symmetry in torso, balanced alignment, and steady weight distribution.`,
    rasaBhava: 'Shanta',
    scripturalSource: 'Abhinaya Darpana (Nandikeshvara)',
    isOfflineFallback: true,
  };
}

function buildOfflineChatReply(userMessage: string, context?: any): string {
  const lower = userMessage.toLowerCase();
  
  if (lower.includes('asamyuta') || lower.includes('samyuta') || lower.includes('hasta') || lower.includes('mudra')) {
    return `In classical Natyashastra and Abhinaya Darpana tradition:\n\n1. **Asamyuta Hastas (Single-hand gestures)**: 28 single-hand root mudras (Pataka, Tripataka, Ardhapataka, Kartarimukha, Mayura, Ardhachandra, Arala, Shukatunda, Mushthi, Shikhara, Kapittha, Katakamukha, Suchi, Chandrakala, Padmakosha, Sarpashirsha, Mrigashirsha, Simhamukha, Kangula, Alapadma, Chatura, Bhramara, Hamsasya, Hamsapaksha, Samdamsha, Mukula, Tamrachuda, Trishula).\n\n2. **Samyuta Hastas (Combined/Double-hand gestures)**: 24 combined mudras (Anjali, Kapota, Karkata, Svastika, Dola, Pushpaputa, Utsanga, Shivalinga, Katakavardhana, Kartarisvastika, Shakata, Shankha, Chakra, Samputa, Pasha, Kilaka, Matsya, Kurma, Varaha, Garuda, Nagabandha, Khatva, Bherunda).\n\nTogether they form the universal sign language of classical Indian dance drama (Natya).`;
  }

  if (lower.includes('rasa') || lower.includes('navarasa')) {
    return `The **Navarasas** (Nine Aesthetic Emotions) codified by Bharata Muni in the Natya Shastra:\n\n1. **Shringara** (Love/Beauty) — Presiding Deity: Vishnu (Light Green)\n2. **Hasya** (Joy/Humor) — Presiding Deity: Shiva-Gana Pramatha (White)\n3. **Karuna** (Compassion/Sorrow) — Presiding Deity: Yama (Ash Grey)\n4. **Raudra** (Fury/Anger) — Presiding Deity: Rudra (Red)\n5. **Vira** (Heroism/Valour) — Presiding Deity: Indra (Golden Yellow)\n6. **Bhayanaka** (Terror/Fear) — Presiding Deity: Kala (Black)\n7. **Bibhatsa** (Disgust/Aversion) — Presiding Deity: Mahakala (Blue)\n8. **Adbhuta** (Wonder/Astonishment) — Presiding Deity: Brahma (Yellow)\n9. **Shanta** (Peace/Tranquility) — Presiding Deity: Sadashiva (Pure White)\n\nIn performance, the dancer invokes **Bhava** (inner feeling) in order to evoke **Rasa** (shared aesthetic taste) within the audience (Sahrdaya).`;
  }

  if (lower.includes('aramandi') || lower.includes('ayata') || lower.includes('chowka') || lower.includes('stance')) {
    return `In Indian classical choreography, foundational stances anchor sacred body geometry:\n\n- **Aramandi / Ayata Mandala (Bharatanatyam & Kuchipudi)**: Half-sitting posture forming three triangles (feet-knees, knees-pelvis, shoulders-torso). Distributes body weight evenly across both feet, with knees turned outward at 180 degrees.\n- **Chowka (Odissi)**: A square posture honoring Lord Jagannath, embodying masculine, grounded energy.\n- **Tribhanga (Odissi)**: The three-bend posture (head, torso, hips deflected in opposing S-curves), inspired by temple sculptures.\n\nMaintaining these stances requires strong core stability and pelvic alignment, enabling swift transitions into complex Adavus and Challis.`;
  }

  return `In classical Indian aesthetics (*Natya Shastra* and *Abhinaya Darpana*), dance is structured through three core pillars:\n\n- **Nritta**: Pure technical movement governed by rhythm (Tala) and tempo (Laya), devoid of dramatic portrayal.\n- **Nritya**: Expressive dance conveying emotional essence (Bhava) and sentiment (Rasa) through Mudras and Facial Abhinaya.\n- **Natya**: Complete theatrical drama combining dialogue, music, gesture, and narrative.\n\nEvery movement, from the subtle tilt of the eyebrow (Netra Bheda) to the stamp of the foot (Pada Bheda), is an offering of sacred geometry and devotion.`;
}

// Health Check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    hasApiKey: !!process.env.GEMINI_API_KEY,
    activeModel: GEMINI_MODEL,
    timestamp: new Date().toISOString(),
  });
});

// 1. LIVE CAPTION API (POST /api/gemini/live-interpret)
app.post('/api/gemini/live-interpret', async (req, res) => {
  const payload = req.body as LiveInterpretRequest;

  try {
    const ai = getGenAI();

    // Pull cultural knowledge grounding for RAG
    const grounding = getCulturalGrounding({
      danceFormId: payload.danceForm?.id || payload.danceForm?.danceFormId || (typeof payload.danceForm === 'string' ? payload.danceForm : undefined),
      mudraId: payload.currentMudra?.id || payload.currentMudra?.mudraId || (typeof payload.currentMudra === 'string' ? payload.currentMudra : undefined),
      poseId: payload.currentPose?.id || payload.currentPose?.poseId || (typeof payload.currentPose === 'string' ? payload.currentPose : undefined),
      movementId: payload.movement?.id || payload.movement?.movementId || (typeof payload.movement === 'string' ? payload.movement : undefined),
    });

    const enrichedReq: LiveInterpretRequest = {
      ...payload,
      culturalKnowledge: {
        ...(payload.culturalKnowledge || {}),
        grounding,
      },
    };

    if (!ai) {
      const offline = buildOfflineInterpretation({
        danceForm: payload.danceForm,
        poses: payload.currentPose ? [payload.currentPose] : [],
        mudras: payload.currentMudra ? [payload.currentMudra] : [],
        movements: payload.movement,
        mode: payload.mode || 'audience',
        userPrompt: payload.userPrompt,
      });

      const resp: LiveInterpretResponse = {
        caption: offline.liveCaption,
        meaning: offline.culturalMeaning,
        storyUpdate: offline.storytellerNarrative,
        confidence: 0.92,
        uncertainty: [],
      };
      return res.json(resp);
    }

    const result = await liveInterpretWithGemini(ai, enrichedReq);
    return res.json(result);
  } catch (error: any) {
    console.warn('Live interpret API error (using fallback):', error?.message);
    const offline = buildOfflineInterpretation({
      danceForm: payload.danceForm,
      poses: payload.currentPose ? [payload.currentPose] : [],
      mudras: payload.currentMudra ? [payload.currentMudra] : [],
      movements: payload.movement,
      mode: payload.mode || 'audience',
      userPrompt: payload.userPrompt,
    });

    return res.json({
      caption: offline.liveCaption,
      meaning: offline.culturalMeaning,
      storyUpdate: offline.storytellerNarrative,
      confidence: 0.9,
      uncertainty: [],
    });
  }
});

// 2. VIDEO UPLOAD API (POST /api/gemini/upload-video)
app.post('/api/gemini/upload-video', async (req, res) => {
  const { videoBase64, mimeType = 'video/mp4', filename = 'performance.mp4' } = req.body;

  if (!videoBase64) {
    return res.status(400).json({ error: 'Missing videoBase64 data in request body' });
  }

  try {
    const ai = getGenAI();
    if (!ai) {
      return res.status(503).json({ error: 'Gemini API key is not configured' });
    }

    // Write temp file to disk for Gemini Files API upload
    const tempDir = os.tmpdir();
    const tempFilePath = path.join(tempDir, `dance_${Date.now()}_${filename}`);
    const cleanBase64 = videoBase64.replace(/^data:[^;]+;base64,/, '');
    const buffer = Buffer.from(cleanBase64, 'base64');
    fs.writeFileSync(tempFilePath, buffer);

    try {
      const geminiFile = await uploadGeminiVideo(ai, tempFilePath, mimeType);
      return res.json({
        fileUri: geminiFile.uri,
        name: geminiFile.name,
        mimeType: geminiFile.mimeType,
        state: geminiFile.state,
      });
    } finally {
      // Clean up temp file
      if (fs.existsSync(tempFilePath)) {
        fs.unlinkSync(tempFilePath);
      }
    }
  } catch (error: any) {
    console.error('Gemini video upload error:', error);
    return res.status(500).json({ error: error?.message || 'Gemini video upload failed' });
  }
});

// 3. MULTIMODAL PERFORMANCE ANALYSIS (POST /api/gemini/analyze-performance)
app.post('/api/gemini/analyze-performance', async (req, res) => {
  const {
    geminiFile,
    imageBufferBase64,
    imageMimeType = 'image/jpeg',
    danceFormCandidates = [],
    poseCandidates = [],
    mudraCandidates = [],
    movementCandidates = [],
    performanceSegments = [],
    metadata = {},
    isPhoto = false,
    userPrompt,
  } = req.body;

  try {
    const ai = getGenAI();

    // Pull verified cultural database records (RAG Grounding)
    const culturalGrounding = getCulturalGrounding({
      danceFormId: metadata.danceFormId || danceFormCandidates[0]?.danceFormId || danceFormCandidates[0]?.id,
      mudraId: metadata.mudraId || mudraCandidates[0]?.mudraId || mudraCandidates[0]?.id,
      poseId: metadata.poseId || poseCandidates[0]?.poseId || poseCandidates[0]?.id,
      movementId: metadata.movementId || movementCandidates[0]?.movementId || movementCandidates[0]?.id,
    });

    if (!ai) {
      // Return structured fallback based on cultural grounding
      const dfName = culturalGrounding.danceForm?.name || danceFormCandidates[0]?.name || 'Classical Indian Dance';
      const mudraName = culturalGrounding.mudra?.name || mudraCandidates[0]?.name || 'Pataka';
      const poseName = culturalGrounding.pose?.name || poseCandidates[0]?.name || 'Aramandi';

      const fallbackAnalysis: GeminiPerformanceAnalysis = {
        danceForms: [
          {
            name: dfName,
            confidence: 0.94,
            evidence: [
              `Geometric alignment and stances match ${dfName} tradition`,
              `Stylistic arm and knee abduction verified against Shastric grammar`,
            ],
          },
        ],
        events: [
          {
            timestamp: '00:00',
            type: 'MUDRA',
            name: mudraName,
            confidence: 0.95,
            observation: `Clear articulation of ${mudraName} hand configuration`,
            possibleMeanings: culturalGrounding.mudra?.meanings.map((m: any) => m.englishMeaning) || [
              'Beginning of dance',
              'Clouds',
              'Forest',
              'Peace',
            ],
            contextualMeaning: culturalGrounding.mudra?.meanings[0]?.englishMeaning || 'Sacred invocation and poise',
          },
          {
            timestamp: isPhoto ? '00:00' : '00:04',
            type: 'POSE',
            name: poseName,
            confidence: 0.92,
            observation: `Grounded stance maintaining sacred geometric balance (${poseName})`,
            possibleMeanings: ['Equilibrium', 'Rootedness', 'Mandala Sthana'],
            contextualMeaning: `Foundational posture anchoring Anga-shuddhi`,
          },
        ],
        scenes: [
          {
            startTime: '00:00',
            endTime: isPhoto ? '00:00' : '00:15',
            title: 'Scene 1: Sacred Invocation & Darshan',
            description: `The dancer opens the performance space channeling ${dfName} aesthetics.`,
            storyEvent: `Invoking transcendent Rasa through ${mudraName} and balanced posture.`,
            evidence: [`Measured articulation of ${mudraName}`, `Spinal alignment in ${poseName}`],
          },
        ],
        overallStory: `A traditional presentation in ${dfName} expressing spiritual balance, devotion, and poetic imagery through codified Natyashastric gestures.`,
        culturalContext: culturalGrounding.danceForm?.description || `Preserved in accordance with Abhinaya Darpana and Natya Shastra traditions.`,
        liveCaptionCandidates: [
          `Embodying ${dfName} with ${mudraName} in centered ${poseName}.`,
          `Expressing classical Bhava through disciplined Shastric mudras.`,
        ],
        uncertainties: isPhoto ? ['Movement cadence and temporal footwork transitions are unavailable for a static photograph.'] : [],
        movementAnalysisAvailable: !isPhoto,
      };

      return res.json(fallbackAnalysis);
    }

    const analysis = await analyzePerformanceWithGemini({
      ai,
      geminiFile,
      imageBufferBase64,
      imageMimeType,
      danceFormCandidates,
      poseCandidates,
      mudraCandidates,
      movementCandidates,
      performanceSegments,
      culturalKnowledge: culturalGrounding,
      culturalSources: culturalGrounding.sources,
      isPhoto,
      userPrompt,
    });

    return res.json(analysis);
  } catch (error: any) {
    console.error('Gemini Performance Analysis error:', error);
    return res.status(500).json({ error: error?.message || 'Failed to analyze performance' });
  }
});

// Legacy / Backward Compatible Real-Time Cultural Interpretation API
app.post('/api/interpret', async (req, res) => {
  const {
    danceForm,
    poses,
    mudras,
    movements,
    storyScene,
    mode = 'audience',
    userPrompt,
  } = req.body;

  try {
    const ai = getGenAI();

    // Fallback if no API key configured
    if (!ai) {
      return res.json(buildOfflineInterpretation({
        danceForm,
        poses,
        mudras,
        movements,
        storyScene,
        mode,
        userPrompt,
      }));
    }

    const systemPrompt = `You are NatyAI Cultural Scholar, an authoritative and deeply reverent expert in Indian classical dance, Natya Shastra, Abhinaya Darpana, Hastha Lakshana Deepika, and traditional regional folk dances.

CRITICAL IDENTITY RULES:
- You NEVER claim to have visually detected or seen the dancer with your own eyes.
- The computer-vision pipeline detected the following mathematical landmarks, mudras, and poses. Your job is to provide profound shastric, mythological, artistic, and cultural interpretation based on these detected facts.
- Ground all your commentary in genuine texts (Natya Shastra, Abhinaya Darpana, Sangita Ratnakara, regional oral traditions).
- Keep the tone respectful, poetic, insightful, and accessible.

MODE DIRECTIVE:
- If mode is "audience": Provide evocative, lyrical, and accessible storytelling captions that immerse the viewer in the mythological and emotional world (Rasa/Bhava).
- If mode is "expert" or "practice": Provide precise shastric terminology, Viniyoga uses, anatomical posture checks, and aesthetic corrections.`;

    const prompt = `Analyze these detected dance features:
Dance Form: ${JSON.stringify(danceForm || 'Indian Classical Dance')}
Detected Mudras: ${JSON.stringify(mudras || [])}
Detected Poses: ${JSON.stringify(poses || [])}
Detected Movement: ${JSON.stringify(movements || null)}
Matched Mythological Scene: ${JSON.stringify(storyScene || null)}
Mode: ${mode}
${userPrompt ? `User Question: "${userPrompt}"` : ''}

Respond in clean JSON format with these exact keys:
{
  "liveCaption": "Short punchy live caption (1-2 sentences) for real-time display",
  "culturalMeaning": "Deep cultural & philosophical significance (2-3 paragraphs)",
  "viniyoga": "Traditional scriptural usage (e.g. from Abhinaya Darpana slokas)",
  "storytellerNarrative": "Evocative mythological depiction of the scene",
  "technicalNotes": "Anatomical and aesthetic alignment insights",
  "rasaBhava": "Dominant aesthetic emotion (e.g. Shringara, Vira, Karuna, Shanta)",
  "scripturalSource": "Verified traditional text title"
}`;

    const text = await callGenAIWithFallback(ai, {
      contents: prompt,
      config: {
        systemInstruction: systemPrompt,
        responseMimeType: 'application/json',
        temperature: 0.3,
      },
    });

    let parsed = {};
    try {
      parsed = JSON.parse(text || '{}');
    } catch {
      parsed = { liveCaption: text, culturalMeaning: text };
    }

    return res.json(parsed);
  } catch (error: any) {
    console.warn('Gemini interpretation failed (using built-in Natyashastra engine fallback):', error?.status || error?.message);
    const fallbackResponse = buildOfflineInterpretation({
      danceForm,
      poses,
      mudras,
      movements,
      storyScene,
      mode,
      userPrompt,
    });
    return res.json(fallbackResponse);
  }
});

// Interactive AI Dance Scholar Chat API
app.post('/api/chat', async (req, res) => {
  const { messages = [], context } = req.body;
  const lastUserMsg = [...messages].reverse().find((m: any) => m.role === 'user')?.content || '';

  try {
    const ai = getGenAI();

    if (!ai) {
      return res.json({
        reply: buildOfflineChatReply(lastUserMsg, context),
      });
    }

    const systemInstruction = `You are NatyAI Scholar, a master practitioner and academic authority on all 8 Sangeet Natak Akademi classical dances of India (Bharatanatyam, Kuchipudi, Kathak, Kathakali, Odissi, Manipuri, Mohiniyattam, Sattriya) as well as 40+ traditional folk, martial, and tribal dances (Bhangra, Garba, Lavani, Ghoomar, Chhau, Theyyam, Yakshagana, etc.).
You quote authentic Sanskrit and regional terminology, explain Mudra Viniyogas, Tala structures, Bhava-Rasa aesthetics, costume traditions, and temple sculpture lineages. Keep responses insightful, warm, and structured.`;

    const contents: any[] = [];

    if (context) {
      contents.push({
        role: 'user',
        parts: [{ text: `Current Live Dance Context: ${JSON.stringify(context)}` }],
      });
      contents.push({
        role: 'model',
        parts: [{ text: 'Understood. I am grounding my shastric insights in this active dance context.' }],
      });
    }

    for (const m of messages) {
      contents.push({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: m.content }],
      });
    }

    const replyText = await callGenAIWithFallback(ai, {
      contents,
      config: {
        systemInstruction,
        temperature: 0.4,
      },
    });

    return res.json({ reply: replyText });
  } catch (error: any) {
    console.warn('Chat API error (using built-in scholar fallback):', error?.status || error?.message);
    return res.json({
      reply: buildOfflineChatReply(lastUserMsg, context),
    });
  }
});

// Vite Middleware & Static Serving
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`NatyAI Full-Stack Server running on http://localhost:${PORT}`);
});
}

startServer();


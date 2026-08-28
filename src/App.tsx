import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Sparkles,
  Layers,
  BookOpen,
  MessageSquareText,
  Eye,
  Activity,
  Compass,
  MapPin,
  Flame,
  Info,
  Database,
  Camera,
  Upload,
  Home,
} from 'lucide-react';
import { LandingPage } from './components/LandingPage';
import { MudraLensLogo } from './components/MudraLensLogo';
import { CameraFeed } from './components/CameraFeed';
import { LiveCaptionBar } from './components/LiveCaptionBar';
import { MudraPanel } from './components/MudraPanel';
import { PracticeMetricsCard } from './components/PracticeMetricsCard';
import { StorySceneCard } from './components/StorySceneCard';
import { DanceFormDrawer } from './components/DanceFormDrawer';
import { ScholarChatModal } from './components/ScholarChatModal';
import { PerformanceRecorder } from './components/PerformanceRecorder';
import { DatasetManagerPage } from './pages/DatasetManager/DatasetManagerPage';
import { BodyTrackingState, PoseCandidate, PoseFeatures } from './types/pose';
import { MudraObservation } from './types/mudra';
import { MovementObservation } from './types/movement';
import { DanceFormCandidate } from './types/dance';
import { SceneMatch } from './types/story';

export default function App() {
  // Navigation: Landing Page vs Live Camera vs Dataset & Ingestion Manager
  const [activeMainTab, setActiveMainTab] = useState<'landing' | 'live' | 'dataset'>('landing');

  // App View Modes in Live Camera
  const [viewMode, setViewMode] = useState<'audience' | 'expert' | 'explorer'>('audience');
  const [overlayStyle, setOverlayStyle] = useState<'full' | 'hands_only' | 'subtle' | 'none'>('full');

  // Modals
  const [isDanceDrawerOpen, setIsDanceDrawerOpen] = useState(false);
  const [isScholarChatOpen, setIsScholarChatOpen] = useState(false);

  // Live Vision Data States
  const [trackingState, setTrackingState] = useState<BodyTrackingState>('NO_PERSON');
  const [poseFeatures, setPoseFeatures] = useState<PoseFeatures | null>(null);
  const [poseCandidates, setPoseCandidates] = useState<PoseCandidate[]>([]);
  const [leftMudra, setLeftMudra] = useState<MudraObservation | null>(null);
  const [rightMudra, setRightMudra] = useState<MudraObservation | null>(null);
  const [isDetectingMudra, setIsDetectingMudra] = useState(false);
  const [movement, setMovement] = useState<MovementObservation | null>(null);
  const [danceForms, setDanceForms] = useState<DanceFormCandidate[]>([]);
  const [storyScenes, setStoryScenes] = useState<SceneMatch[]>([]);

  // Live AI Interpretation States
  const [liveCaption, setLiveCaption] = useState<string>('Ready for dance posture and gesture detection.');
  const [culturalMeaning, setCulturalMeaning] = useState<string>('');
  const [viniyoga, setViniyoga] = useState<string>('');
  const [rasa, setRasa] = useState<string>('Shanta');
  const [scripturalSource, setScripturalSource] = useState<string>('Natya Shastra & Abhinaya Darpana');
  const [isLoadingInterpretation, setIsLoadingInterpretation] = useState<boolean>(false);

  // Last interpreted signature to prevent redundant API calls
  const lastInterpretedSigRef = useRef<string>('');
  const interpretationDebounceTimerRef = useRef<any>(null);

  const [samyutaMudra, setSamyutaMudra] = useState<any>(null);
  const [confirmedPose, setConfirmedPose] = useState<any>(null);

  // Local LRU memory cache for live interpretations to minimize network calls
  const clientInterpretationCacheRef = useRef<Map<string, any>>(new Map());

  // Handle frame analysis results from CameraFeed
  const handleFrameAnalyzed = useCallback(
    (data: {
      trackingState: BodyTrackingState;
      poseFeatures: PoseFeatures | null;
      poseCandidates: PoseCandidate[];
      confirmedPose: any;
      leftMudra: MudraObservation | null;
      rightMudra: MudraObservation | null;
      leftMudraResult: any;
      rightMudraResult: any;
      samyutaMudraResult: any;
      isDetectingMudra: boolean;
      movement: MovementObservation | null;
      motionFeatures: any;
      danceForms: DanceFormCandidate[];
      danceFormPredictions: any[];
      storyScenes: SceneMatch[];
      framingStatus: any;
      performanceState: any;
    }) => {
      setTrackingState(data.trackingState);
      setPoseFeatures(data.poseFeatures);
      setPoseCandidates(data.poseCandidates);
      setConfirmedPose(data.confirmedPose);
      setLeftMudra(data.leftMudra);
      setRightMudra(data.rightMudra);
      setSamyutaMudra(data.samyutaMudraResult);
      setIsDetectingMudra(data.isDetectingMudra);
      setMovement(data.movement);
      setDanceForms(data.danceForms);
      setStoryScenes(data.storyScenes);

      // Identify major active elements
      const activeFormId = data.danceForms[0]?.danceFormId || 'classical';
      const activePoseName = data.confirmedPose?.label || data.poseCandidates[0]?.name || '';
      const activeMudraName = data.samyutaMudraResult?.label || data.leftMudra?.name || data.rightMudra?.name || '';

      // Compute stable signature
      const currentSignature = [
        activeFormId,
        activePoseName,
        activeMudraName,
      ].join('|');

      // Check if we have an active gesture or posture
      const hasMeaningfulFeatures = !!(
        data.samyutaMudraResult ||
        data.leftMudra ||
        data.rightMudra ||
        (data.poseCandidates.length > 0 && data.poseCandidates[0].confidence > 0.6)
      );

      if (hasMeaningfulFeatures && currentSignature !== lastInterpretedSigRef.current) {
        // 1. Check local client cache first
        const cached = clientInterpretationCacheRef.current.get(currentSignature);
        if (cached) {
          lastInterpretedSigRef.current = currentSignature;
          if (cached.caption) setLiveCaption(cached.caption);
          if (cached.meaning) setCulturalMeaning(cached.meaning);
          if (cached.viniyoga) setViniyoga(cached.viniyoga);
          if (cached.rasa) setRasa(cached.rasa);
          if (cached.scripturalSource) setScripturalSource(cached.scripturalSource);
          return;
        }

        // 2. Instant local preliminary caption update for zero-latency feedback
        const formName = data.danceForms[0]?.name || 'Classical Dance';
        const mudraDesc = data.samyutaMudraResult?.label || 
          [data.leftMudra?.name ? `Left: ${data.leftMudra.name}` : '', data.rightMudra?.name ? `Right: ${data.rightMudra.name}` : '']
            .filter(Boolean)
            .join(' & ') || '';

        if (mudraDesc && activePoseName) {
          setLiveCaption(`Performing ${activePoseName} in ${formName} with ${mudraDesc}.`);
        } else if (mudraDesc) {
          setLiveCaption(`Channeling ${mudraDesc} in ${formName}.`);
        } else if (activePoseName) {
          setLiveCaption(`Anchoring in ${activePoseName} (${formName}).`);
        }

        // 3. Debounced enrichment fetch
        if (interpretationDebounceTimerRef.current) {
          clearTimeout(interpretationDebounceTimerRef.current);
        }

        interpretationDebounceTimerRef.current = setTimeout(() => {
          lastInterpretedSigRef.current = currentSignature;
          fetchInterpretation(data, currentSignature);
        }, 2200);
      }
    },
    [viewMode]
  );

  // Recent detected milestones for progressive Gemini live story engine
  const recentEventsRef = useRef<string[]>([]);

  // Call server-side Gemini API for live cultural interpretation
  const fetchInterpretation = async (data: any, signature: string) => {
    try {
      setIsLoadingInterpretation(true);

      const activeForm = data.danceForms[0];
      const activeMudra = data.leftMudra || data.rightMudra;
      const activePose = data.poseCandidates[0];

      if (activePose?.name) {
        recentEventsRef.current = [...recentEventsRef.current.slice(-5), `Pose: ${activePose.name}`];
      }
      if (activeMudra?.name) {
        recentEventsRef.current = [...recentEventsRef.current.slice(-5), `Mudra: ${activeMudra.name}`];
      }

      const response = await fetch('/api/gemini/live-interpret', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          danceForm: activeForm,
          currentMudra: activeMudra,
          leftMudra: data.leftMudra,
          rightMudra: data.rightMudra,
          samyutaMudra: data.samyutaMudraResult,
          currentPose: activePose,
          movement: data.movement,
          highSpeedMovement: data.performanceState?.highSpeedMovement || data.motionFeatures?.highSpeedEvent || null,
          motionFeatures: data.motionFeatures,
          previousEvents: recentEventsRef.current,
          storyState: {
            currentScene: data.storyScenes[0]?.sceneName || 'Active Devotional Portrayal',
            previousEvents: recentEventsRef.current,
            currentCharacters: data.storyScenes[0]?.characters || ['Dancer'],
            narrativeState: data.storyScenes[0]?.narrativeDescription || 'Channeling shastric Posture and Mudra',
          },
          mode: viewMode,
        }),
      });

      const resData = await response.json();
      const newCaption = resData.caption || resData.liveCaption;
      const newMeaning = resData.meaning || resData.culturalMeaning;
      const newViniyoga = resData.viniyoga || '';
      const newRasa = resData.rasaBhava || resData.rasa || 'Shanta';
      const newSource = resData.scripturalSource || 'Natya Shastra & Abhinaya Darpana';

      if (newCaption) setLiveCaption(newCaption);
      if (newMeaning) setCulturalMeaning(newMeaning);
      if (newViniyoga) setViniyoga(newViniyoga);
      if (newRasa) setRasa(newRasa);
      if (newSource) setScripturalSource(newSource);

      // Save to client cache
      if (signature) {
        clientInterpretationCacheRef.current.set(signature, {
          caption: newCaption,
          meaning: newMeaning,
          viniyoga: newViniyoga,
          rasa: newRasa,
          scripturalSource: newSource,
        });
      }
    } catch (err) {
      // Gracefully silent on transient network/fetch issues
    } finally {
      setIsLoadingInterpretation(false);
    }
  };

  const activeDanceForm = danceForms[0];

  return (
    <div className="min-h-screen bg-[#120405] text-stone-100 flex flex-col font-cinzel selection:bg-red-900 selection:text-amber-200">
      {activeMainTab === 'landing' ? (
        <LandingPage
          onEnterStudio={() => setActiveMainTab('live')}
          onExploreDataset={() => setActiveMainTab('dataset')}
          onOpenTraditions={() => setIsDanceDrawerOpen(true)}
        />
      ) : (
        <>
          {/* Top Navigation Bar */}
          <header id="main-header" className="sticky top-0 z-40 bg-[#1a0608]/95 backdrop-blur-md border-b border-red-900/40 px-4 md:px-6 py-3 shadow-lg shadow-black/50">
            <div className="max-w-7xl mx-auto flex items-center justify-between">
              {/* Logo & Title (clickable to return home) */}
              <button
                id="btn-nav-home"
                onClick={() => setActiveMainTab('landing')}
                className="flex items-center space-x-3 text-left group cursor-pointer focus:outline-none"
              >
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#3b0f14] via-[#240a0c] to-[#120405] flex items-center justify-center shadow-lg shadow-red-950/80 border border-amber-500/50 group-hover:border-amber-400 transition p-1">
                  <MudraLensLogo size={30} variant="gold" />
                </div>
                <div>
                  <div className="flex items-center space-x-2">
                    <h1 className="text-lg md:text-xl font-bold tracking-wider text-amber-100 group-hover:text-amber-300 transition font-cinzel-dec">
                      Mudra Lens
                    </h1>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-red-950 text-amber-300 border border-red-800 font-bold uppercase tracking-wider">
                      Studio
                    </span>
                  </div>
                  <p className="text-[11px] text-amber-200/60 hidden sm:block font-sans">
                    Real-Time Indian Classical &amp; Traditional Dance Interpretation
                  </p>
                </div>
              </button>

              {/* Primary View Switcher: Home vs Live Camera vs Dataset & Ingestion */}
              <div id="primary-nav-tabs" className="flex items-center bg-[#25090c]/90 p-1 rounded-xl border border-red-900/60">
                <button
                  id="tab-home"
                  onClick={() => setActiveMainTab('landing')}
                  className="flex items-center space-x-1.5 px-2.5 py-1.5 rounded-lg text-xs font-bold text-stone-400 hover:text-amber-200 transition"
                  title="Return to Home Landing"
                >
                  <Home className="w-3.5 h-3.5" />
                  <span className="hidden md:inline">Home</span>
                </button>

                <button
                  id="tab-live-camera"
                  onClick={() => setActiveMainTab('live')}
                  className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                    activeMainTab === 'live'
                      ? 'bg-amber-600 text-white shadow'
                      : 'text-stone-400 hover:text-stone-200'
                  }`}
                >
                  <Camera className="w-3.5 h-3.5" />
                  <span>Live Vision</span>
                </button>

                <button
                  id="tab-dataset-manager"
                  onClick={() => setActiveMainTab('dataset')}
                  className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                    activeMainTab === 'dataset'
                      ? 'bg-gradient-to-r from-amber-600 to-rose-600 text-white shadow'
                      : 'text-stone-400 hover:text-stone-200'
                  }`}
                >
                  <Database className="w-3.5 h-3.5" />
                  <span>Dataset &amp; AI Analysis</span>
                </button>
              </div>

              {/* Quick Action Tools */}
              <div className="flex items-center space-x-2">
                {activeMainTab === 'live' && (
                  <>
                    {/* Live Sub-Mode Switcher */}
                    <div id="mode-switcher-bar" className="hidden sm:flex items-center bg-stone-900 p-1 rounded-xl border border-stone-800">
                      <button
                        id="btn-mode-audience"
                        onClick={() => setViewMode('audience')}
                        className={`flex items-center space-x-1 px-2.5 py-1 rounded-lg text-xs font-semibold transition ${
                          viewMode === 'audience'
                            ? 'bg-stone-800 text-amber-300'
                            : 'text-stone-400 hover:text-stone-200'
                        }`}
                      >
                        <Eye className="w-3 h-3" />
                        <span>Audience</span>
                      </button>

                      <button
                        id="btn-mode-expert"
                        onClick={() => setViewMode('expert')}
                        className={`flex items-center space-x-1 px-2.5 py-1 rounded-lg text-xs font-semibold transition ${
                          viewMode === 'expert'
                            ? 'bg-stone-800 text-amber-300'
                            : 'text-stone-400 hover:text-stone-200'
                        }`}
                      >
                        <Activity className="w-3 h-3" />
                        <span>Practice</span>
                      </button>
                    </div>

                    {/* Overlay Selector */}
                    <select
                      id="select-overlay-style"
                      value={overlayStyle}
                      onChange={(e) => setOverlayStyle(e.target.value as any)}
                      className="hidden md:block px-2.5 py-1.5 bg-stone-900 border border-stone-800 rounded-xl text-xs text-stone-300 focus:outline-none focus:border-amber-500"
                    >
                      <option value="full">Skeleton + Mudras</option>
                      <option value="hands_only">Hands Only</option>
                      <option value="subtle">Subtle Glow</option>
                      <option value="none">Clean Camera</option>
                    </select>
                  </>
                )}

                {/* Dance Traditions Encyclopedia */}
                <button
                  id="btn-open-dance-drawer"
                  onClick={() => setIsDanceDrawerOpen(true)}
                  className="flex items-center space-x-1.5 px-3 py-1.5 bg-stone-900 hover:bg-stone-800 text-stone-200 rounded-xl border border-stone-700/80 text-xs font-semibold transition shadow-sm"
                >
                  <BookOpen className="w-3.5 h-3.5 text-amber-400" />
                  <span className="hidden sm:inline">Traditions</span>
                </button>

                {/* AI Scholar Chat */}
                <button
                  id="btn-open-scholar-chat"
                  onClick={() => setIsScholarChatOpen(true)}
                  className="flex items-center space-x-1.5 px-3 py-1.5 bg-gradient-to-r from-amber-600 to-rose-600 hover:from-amber-500 hover:to-rose-500 text-white rounded-xl text-xs font-bold transition shadow-md shadow-amber-950/40"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>AI Scholar</span>
                </button>
              </div>
            </div>
          </header>

          {/* Main Workspace: Dataset Page OR Live Camera Feed */}
          {activeMainTab === 'dataset' ? (
            <DatasetManagerPage onNavigateToLiveCamera={() => setActiveMainTab('live')} />
          ) : (
            <main className="flex-1 max-w-7xl w-full mx-auto p-3 md:p-6 grid grid-cols-1 lg:grid-cols-12 gap-5">
              {/* Left Column: Live Camera Feed & Live Caption Bar (7 of 12 cols on desktop) */}
              <div className="lg:col-span-7 flex flex-col space-y-4">
                <CameraFeed
                  onFrameAnalyzed={handleFrameAnalyzed}
                  overlayStyle={overlayStyle}
                />

                <LiveCaptionBar
                  caption={liveCaption}
                  culturalMeaning={culturalMeaning}
                  rasa={rasa}
                  viniyoga={viniyoga}
                  scripturalSource={scripturalSource}
                  isLoadingInterpretation={isLoadingInterpretation}
                />
              </div>

              {/* Right Column: Intelligent Insights, Mudras, Storytelling & Metrics (5 of 12 cols) */}
              <div className="lg:col-span-5 flex flex-col space-y-4">
                {/* Active Dance Form Card */}
                <div id="active-dance-form-banner" className="bg-stone-900/90 border border-stone-800 rounded-2xl p-4 shadow-xl">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center space-x-2 text-xs font-bold uppercase tracking-wider text-stone-400">
                      <Compass className="w-4 h-4 text-amber-400" />
                      <span>Detected Dance Form</span>
                    </div>
                    {activeDanceForm && (
                      <span
                        className={`text-xs font-mono font-bold px-2 py-0.5 rounded-full ${
                          activeDanceForm.confidence >= 0.6
                            ? 'text-emerald-400 bg-emerald-950/60 border border-emerald-800/60'
                            : activeDanceForm.confidence >= 0.4
                            ? 'text-amber-400 bg-amber-950/60 border border-amber-800/60'
                            : 'text-stone-400 bg-stone-900 border border-stone-700'
                        }`}
                      >
                        {Math.round(activeDanceForm.confidence * 100)}% Confidence
                      </span>
                    )}
                  </div>

                  {trackingState === 'NO_PERSON' ? (
                    <p className="text-xs text-stone-400 py-2">
                      Awaiting dancer in camera view to identify dance tradition...
                    </p>
                  ) : !activeDanceForm || activeDanceForm.confidence < 0.4 ? (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <h3 className="text-lg font-bold text-amber-400">Dance form: Uncertain</h3>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-950 text-amber-300 border border-amber-800 uppercase font-bold">
                          Low Confidence
                        </span>
                      </div>
                      <p className="text-xs text-stone-400">
                        Current posture or gesture cues do not conclusively match a specific tradition with high confidence. Perform characteristic stances (such as Aramandi, Chowka, or Ayata) or hold signature mudras.
                      </p>

                      {/* Show candidate breakdown with confidence scores even when uncertain */}
                      {danceForms.length > 0 && (
                        <div className="mt-3 pt-2.5 border-t border-stone-800/80 space-y-1.5">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400 block mb-1">
                            Candidate Traditions (Confidence Scores):
                          </span>
                          {danceForms.slice(0, 3).map((candidate) => (
                            <div key={candidate.danceFormId} className="flex items-center justify-between text-xs">
                              <span className="text-stone-300">{candidate.name}</span>
                              <div className="flex items-center space-x-2">
                                <div className="w-20 h-1.5 bg-stone-800 rounded-full overflow-hidden">
                                  <div
                                    className="h-full bg-amber-500/70 rounded-full"
                                    style={{ width: `${Math.round(candidate.confidence * 100)}%` }}
                                  />
                                </div>
                                <span className="text-[11px] font-mono text-stone-400 w-9 text-right">
                                  {Math.round(candidate.confidence * 100)}%
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div>
                        <div className="flex items-center justify-between">
                          <h3 className="text-xl font-bold text-white">{activeDanceForm.name}</h3>
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-red-950 text-red-300 border border-red-800 uppercase font-bold">
                            {activeDanceForm.category}
                          </span>
                        </div>
                        <p className="text-xs text-stone-400 mt-0.5 flex items-center space-x-1">
                          <MapPin className="w-3 h-3 text-rose-400" />
                          <span>State of Origin: {activeDanceForm.state}</span>
                        </p>
                      </div>

                      {/* Overall Confidence Meter */}
                      <div className="space-y-1">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-[11px] text-stone-400">Match Confidence</span>
                          <span className="text-xs font-mono font-bold text-amber-400">
                            {Math.round(activeDanceForm.confidence * 100)}%
                          </span>
                        </div>
                        <div className="w-full h-2 bg-stone-800 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-300 ${
                              activeDanceForm.confidence >= 0.7
                                ? 'bg-emerald-500'
                                : 'bg-amber-500'
                            }`}
                            style={{ width: `${Math.round(activeDanceForm.confidence * 100)}%` }}
                          />
                        </div>
                      </div>

                      {activeDanceForm.reasons && activeDanceForm.reasons.length > 0 && (
                        <div className="pt-2 border-t border-stone-800/80 space-y-1">
                          {activeDanceForm.reasons.map((r, i) => (
                            <div key={i} className="text-[11px] text-stone-300 flex items-start space-x-1.5">
                              <span className="text-amber-400 mt-0.5">&bull;</span>
                              <span>{r}</span>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Secondary Candidate Traditions with Confidence Scores */}
                      {danceForms.length > 1 && (
                        <div className="pt-2.5 border-t border-stone-800/80">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400 block mb-1.5">
                            Other Matching Traditions
                          </span>
                          <div className="space-y-1.5">
                            {danceForms.slice(1, 4).map((candidate) => (
                              <div key={candidate.danceFormId} className="flex items-center justify-between text-xs">
                                <span className="text-stone-300">{candidate.name}</span>
                                <div className="flex items-center space-x-2">
                                  <div className="w-20 h-1.5 bg-stone-800 rounded-full overflow-hidden">
                                    <div
                                      className="h-full bg-stone-500 rounded-full"
                                      style={{ width: `${Math.round(candidate.confidence * 100)}%` }}
                                    />
                                  </div>
                                  <span className="text-[11px] font-mono text-stone-400 w-9 text-right">
                                    {Math.round(candidate.confidence * 100)}%
                                  </span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Mudra Recognition Card (Left & Right Hands + Samyuta) */}
                <MudraPanel
                  leftMudra={leftMudra}
                  rightMudra={rightMudra}
                  samyutaMudra={samyutaMudra}
                  isDetectingMudra={isDetectingMudra}
                />

                {/* Mythological Narrative / Story Match */}
                {storyScenes.length > 0 && (
                  <StorySceneCard scenes={storyScenes} />
                )}

                {/* Expert / Practice Mode Joint Metrics & Alignments */}
                {viewMode === 'expert' && (
                  <PracticeMetricsCard
                    poseFeatures={poseFeatures}
                    poseCandidates={poseCandidates}
                    movement={movement}
                  />
                )}

                {/* Performance Recorder Card */}
                <PerformanceRecorder
                  leftMudra={leftMudra}
                  rightMudra={rightMudra}
                  poseFeatures={poseFeatures}
                  danceForms={danceForms}
                />
              </div>
            </main>
          )}
        </>
      )}

      {/* Dance Form Drawer Modal */}
      <DanceFormDrawer
        isOpen={isDanceDrawerOpen}
        onClose={() => setIsDanceDrawerOpen(false)}
      />

      {/* AI Scholar Chat Modal */}
      <ScholarChatModal
        isOpen={isScholarChatOpen}
        onClose={() => setIsScholarChatOpen(false)}
        currentContext={{
          activeDanceForm: activeDanceForm?.name,
          poses: poseCandidates.map((p) => p.name),
          leftMudra: leftMudra?.name,
          rightMudra: rightMudra?.name,
          movement: movement?.name,
          storyScene: storyScenes[0]?.sceneName,
        }}
      />
    </div>
  );
}

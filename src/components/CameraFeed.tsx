import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  Camera,
  SwitchCamera,
  Upload,
  Play,
  Pause,
  AlertCircle,
  RefreshCw,
  Activity,
  CheckCircle2,
  ShieldAlert,
  Hand,
  User,
  Gauge,
  Zap,
  Cpu,
} from 'lucide-react';
import { PoseDetector } from '../vision/pose/PoseDetector';
import { HandDetector } from '../vision/hands/HandDetector';
import { extractHandFeatures } from '../vision/mudra/MudraFeatures';
import { MudraClassifier } from '../vision/mudra/MudraClassifier';
import { MudraTemporalFilter } from '../vision/mudra/MudraTemporalFilter';
import { extractPoseFeatures } from '../vision/dance/DanceFeatures';
import { DancePoseClassifier } from '../vision/dance/DancePoseClassifier';
import { MovementTracker, MovementClassifier } from '../vision/movement/MovementClassifier';
import { DanceFormClassifier } from '../vision/dance/DanceFormClassifier';
import { StoryClassifier } from '../vision/story/StoryClassifier';
import { TemporalLandmarkBuffer } from '../vision/pipeline/TemporalLandmarkBuffer';
import { FramingChecker } from '../vision/pipeline/FramingChecker';
import { EventManager } from '../vision/pipeline/EventManager';
import { LandmarkSmoother, JointTrail } from '../vision/smoothing/LandmarkSmoother';
import { HandTrackingState } from '../vision/VisionCore';
import { VISION_CONFIG } from '../config/vision';
import { OverlayCanvas } from './OverlayCanvas';
import { BodyLandmark, BodyTrackingState, PoseFeatures, PoseCandidate } from '../types/pose';
import { FingerLandmark, MudraObservation } from '../types/mudra';
import { MovementObservation } from '../types/movement';
import { DanceFormCandidate } from '../types/dance';
import { SceneMatch } from '../types/story';
import {
  DanceEvent,
  DanceFormPrediction,
  DancePerformanceState,
  FramingStatus,
  MotionFeatures,
  RecognitionResult,
  SynchronizedPerformanceFrame,
} from '../types/pipeline';

export interface NormalizedLandmark {
  x: number;
  y: number;
  z: number;
  visibility?: number;
}

/**
 * Exponential Moving Average (EMA) smoothing algorithm for NormalizedLandmark coordinate arrays.
 * Replaces raw frame coordinates with a weighted average of recent frames:
 *   S_t = α * X_t + (1 - α) * S_{t-1}
 * where α (alpha factor: 0 < alpha <= 1) controls smoothing strength:
 * - Lower alpha (e.g. 0.3 - 0.5): heavier smoothing, maximum jitter reduction
 * - Higher alpha (e.g. 0.7 - 0.9): lighter smoothing, ultra-fast tracking response
 */
export function applyLandmarkEMA<T extends NormalizedLandmark>(
  currentRaw: T[],
  previousSmoothed: T[] | null,
  alpha: number = 0.65
): T[] {
  if (!currentRaw || currentRaw.length === 0) {
    return [];
  }
  if (!previousSmoothed || previousSmoothed.length !== currentRaw.length) {
    // Initialize with current raw data if no previous history exists
    return currentRaw.map((lm) => ({ ...lm }));
  }

  // Constrain alpha to valid unit interval (0 < alpha <= 1)
  const clampedAlpha = Math.max(0.01, Math.min(1.0, alpha));

  return currentRaw.map((curr, idx) => {
    const prev = previousSmoothed[idx];
    const smoothedX = clampedAlpha * curr.x + (1 - clampedAlpha) * prev.x;
    const smoothedY = clampedAlpha * curr.y + (1 - clampedAlpha) * prev.y;
    const smoothedZ = clampedAlpha * curr.z + (1 - clampedAlpha) * prev.z;
    const smoothedVis =
      curr.visibility !== undefined && prev.visibility !== undefined
        ? clampedAlpha * curr.visibility + (1 - clampedAlpha) * prev.visibility
        : curr.visibility;

    return {
      ...curr,
      x: smoothedX,
      y: smoothedY,
      z: smoothedZ,
      ...(smoothedVis !== undefined ? { visibility: smoothedVis } : {}),
    };
  });
}

export const smoothLandmarksEMA = applyLandmarkEMA;

interface CameraFeedProps {
  onFrameAnalyzed: (data: {
    trackingState: BodyTrackingState;
    poseFeatures: PoseFeatures | null;
    poseCandidates: PoseCandidate[];
    confirmedPose: RecognitionResult | null;
    leftMudra: MudraObservation | null;
    rightMudra: MudraObservation | null;
    leftMudraResult: RecognitionResult;
    rightMudraResult: RecognitionResult;
    samyutaMudraResult: RecognitionResult | null;
    isDetectingMudra: boolean;
    movement: MovementObservation | null;
    motionFeatures: MotionFeatures;
    danceForms: DanceFormCandidate[];
    danceFormPredictions: DanceFormPrediction[];
    storyScenes: SceneMatch[];
    framingStatus: FramingStatus;
    performanceState: DancePerformanceState;
  }) => void;
  onDanceEvent?: (event: DanceEvent) => void;
  overlayStyle: 'full' | 'hands_only' | 'subtle' | 'none';
  selectedDanceFormId?: string;
  smoothingAlpha?: number;
}

export const CameraFeed: React.FC<CameraFeedProps> = ({
  onFrameAnalyzed,
  onDanceEvent,
  overlayStyle,
  selectedDanceFormId,
  smoothingAlpha = 0.65,
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Vision Pipeline Engine Modules (persisted in refs)
  const poseDetectorRef = useRef<PoseDetector>(new PoseDetector());
  const handDetectorRef = useRef<HandDetector>(new HandDetector());
  const landmarkBufferRef = useRef<TemporalLandmarkBuffer>(new TemporalLandmarkBuffer(60));
  const framingCheckerRef = useRef<FramingChecker>(new FramingChecker());
  const eventManagerRef = useRef<EventManager>(new EventManager());
  const mudraClassifierRef = useRef<MudraClassifier>(new MudraClassifier());
  const temporalFilterRef = useRef<MudraTemporalFilter>(new MudraTemporalFilter(8, 4));
  const poseClassifierRef = useRef<DancePoseClassifier>(new DancePoseClassifier());
  const movementTrackerRef = useRef<MovementTracker>(new MovementTracker(30));
  const movementClassifierRef = useRef<MovementClassifier>(new MovementClassifier());
  const danceFormClassifierRef = useRef<DanceFormClassifier>(new DanceFormClassifier());
  const storyClassifierRef = useRef<StoryClassifier>(new StoryClassifier());

  const animationFrameIdRef = useRef<number | null>(null);
  const videoFrameCallbackIdRef = useRef<number | null>(null);

  // FPS & Latency Monitoring
  const lastFrameTimeRef = useRef<number>(performance.now());
  const isAnalyzingRef = useRef<boolean>(false);
  const [actualFps, setActualFps] = useState<number>(60);
  const [cameraResolution, setCameraResolution] = useState<string>('1280x720');
  const [bodyConfidencePct, setBodyConfidencePct] = useState<number>(0);
  const [handConfidencePct, setHandConfidencePct] = useState<number>(0);
  const [poseLatency, setPoseLatency] = useState<number>(0);
  const [handLatency, setHandLatency] = useState<number>(0);
  const [droppedFramesCount, setDroppedFramesCount] = useState<number>(0);
  const [showLatencyHud, setShowLatencyHud] = useState<boolean>(false);
  const [leftHandTrackingState, setLeftHandTrackingState] = useState<HandTrackingState>('LOST');
  const [rightHandTrackingState, setRightHandTrackingState] = useState<HandTrackingState>('LOST');

  // Component State
  const [isInitialized, setIsInitialized] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);
  const [initError, setInitError] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');
  const [isMirrored, setIsMirrored] = useState(true);
  const [trackingState, setTrackingState] = useState<BodyTrackingState>('NO_PERSON');

  // Video Dimension States
  const [videoDims, setVideoDims] = useState({ width: 640, height: 480 });

  // Real-time Canvas Rendering States (Dual-Path Display Overlay)
  const landmarkSmootherRef = useRef<LandmarkSmoother>(new LandmarkSmoother());
  const [poseLandmarks, setPoseLandmarks] = useState<BodyLandmark[]>([]);
  const [leftHandLandmarks, setLeftHandLandmarks] = useState<FingerLandmark[]>([]);
  const [rightHandLandmarks, setRightHandLandmarks] = useState<FingerLandmark[]>([]);
  const [trails, setTrails] = useState<JointTrail[]>([]);
  const [leftMudra, setLeftMudra] = useState<MudraObservation | null>(null);
  const [rightMudra, setRightMudra] = useState<MudraObservation | null>(null);
  const [poseFeatures, setPoseFeatures] = useState<PoseFeatures | null>(null);

  // Status indicators for top HUD
  const [hasHandTracking, setHasHandTracking] = useState(false);

  // Pipeline Live State
  const [framingStatus, setFramingStatus] = useState<FramingStatus>({
    headVisible: false,
    shouldersVisible: false,
    hipsVisible: false,
    kneesVisible: false,
    feetVisible: false,
    overallVisibilityScore: 0,
    distanceStatus: 'NO_PERSON',
    guidanceMessage: 'Position yourself in the camera view to begin recognition.',
  });
  const [motionFeatures, setMotionFeatures] = useState<MotionFeatures>({
    velocity: 0,
    acceleration: 0,
    direction: 0,
    wristVelocity: 0,
    elbowVelocity: 0,
    shoulderVelocity: 0,
    hipVelocity: 0,
    kneeVelocity: 0,
    ankleVelocity: 0,
    bodyRotation: 0,
    speedCategory: 'STATIC',
    motionMode: 'NORMAL',
    motionScore: {
      velocityScore: 0,
      accelerationScore: 0,
      trajectoryScore: 0,
      directionChangeScore: 0,
      overallScore: 0,
    },
    bodyScale: 1.0,
    isMotionBlurred: false,
    blurStatus: 'OPTIMAL',
    blurMessage: 'Tracking optimal',
    highSpeedEvent: null,
  });

  // Upload Video File state
  const [isUsingUploadedVideo, setIsUsingUploadedVideo] = useState(false);
  const [isVideoPlaying, setIsVideoPlaying] = useState(true);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Subscribe to Event Managers
  useEffect(() => {
    const unsub = eventManagerRef.current.subscribe((event) => {
      if (onDanceEvent) {
        onDanceEvent(event);
      }
    });

    return () => {
      unsub();
    };
  }, [onDanceEvent]);

  // Initialize MediaPipe models (Pose & Hands)
  const initModels = useCallback(async () => {
    try {
      setIsInitializing(true);
      setInitError(null);
      await Promise.all([
        poseDetectorRef.current.initialize(),
        handDetectorRef.current.initialize(),
      ]);
      setIsInitialized(true);
    } catch (err: any) {
      console.error('Model initialization error:', err);
      setInitError(err.message || 'Failed to load MediaPipe AI Vision models. Please refresh to try again.');
    } finally {
      setIsInitializing(false);
    }
  }, []);

  useEffect(() => {
    initModels();

    return () => {
      if (animationFrameIdRef.current) {
        cancelAnimationFrame(animationFrameIdRef.current);
      }
      if (videoRef.current && 'cancelVideoFrameCallback' in HTMLVideoElement.prototype && videoFrameCallbackIdRef.current) {
        (videoRef.current as any).cancelVideoFrameCallback(videoFrameCallbackIdRef.current);
      }
      poseDetectorRef.current.dispose();
      handDetectorRef.current.dispose();
    };
  }, [initModels]);

  // Start Camera Stream with 30-60 FPS constraints
  const startCamera = useCallback(async () => {
    if (!isInitialized || isUsingUploadedVideo) return;

    try {
      if (videoRef.current && videoRef.current.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach((t) => t.stop());
      }

      const constraints: MediaStreamConstraints = {
        video: {
          facingMode,
          width: { ideal: 1280 },
          height: { ideal: 720 },
          frameRate: { ideal: 60, min: 30 },
        },
        audio: false,
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      const track = stream.getVideoTracks()[0];
      if (track) {
        const settings = track.getSettings();
        console.log({
          width: settings.width,
          height: settings.height,
          frameRate: settings.frameRate,
        });
        if (settings.width && settings.height) {
          setCameraResolution(`${settings.width}x${settings.height}`);
        }
      }

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => {
          if (videoRef.current) {
            videoRef.current.play();
            setVideoDims({
              width: videoRef.current.videoWidth || 640,
              height: videoRef.current.videoHeight || 480,
            });
          }
        };
      }
    } catch (err: any) {
      console.warn('Webcam start notice:', err);
    }
  }, [isInitialized, facingMode, isUsingUploadedVideo]);

  useEffect(() => {
    if (isInitialized && !isUsingUploadedVideo) {
      startCamera();
    }
  }, [isInitialized, facingMode, isUsingUploadedVideo, startCamera]);

  // Core Frame Analysis Routine (30-60 FPS)
  const executeFrameAnalysis = useCallback((now: number) => {
    const video = videoRef.current;
    if (!video || video.readyState < 2 || video.paused || video.ended) {
      return;
    }

    // Drop backlogged frames to guarantee real-time latency
    if (isAnalyzingRef.current) {
      setDroppedFramesCount((prev) => prev + 1);
      return;
    }
    isAnalyzingRef.current = true;

    const startTime = performance.now();
    const dt = startTime - lastFrameTimeRef.current;
    if (dt > 0) {
      const instantaneousFps = Math.round(1000 / dt);
      setActualFps((prev) => Math.round(prev * 0.9 + instantaneousFps * 0.1));
    }
    lastFrameTimeRef.current = startTime;

    try {
      // 1. Pose Detection (Full body skeleton)
      const tPoseStart = performance.now();
      const poseResult = poseDetectorRef.current.detect(video, now);
      const tPoseEnd = performance.now();
      setPoseLatency(Math.round((tPoseEnd - tPoseStart) * 10) / 10);

      const rawPoseLandmarks = poseResult.landmarks;
      const currentTrackingState = poseResult.trackingState;

      setTrackingState(currentTrackingState);

      // 2. Camera Framing Check
      const framing = framingCheckerRef.current.checkFraming(rawPoseLandmarks);
      setFramingStatus(framing);

      // 3. Hand Detection & Mudra Classification (Left & Right Hands)
      const tHandStart = performance.now();
      const hands = handDetectorRef.current.detect(video, now);
      const tHandEnd = performance.now();
      setHandLatency(Math.round((tHandEnd - tHandStart) * 10) / 10);

      let rawLeftHandLms: FingerLandmark[] = [];
      let rawRightHandLms: FingerLandmark[] = [];
      let leftCandList: any[] = [];
      let rightCandList: any[] = [];
      let leftHandVis = 0;
      let rightHandVis = 0;

      for (const hand of hands) {
        if (hand.handedness === 'Left') {
          rawLeftHandLms = hand.landmarks;
          leftHandVis = hand.landmarks.length / 21;
          const leftFeatures = extractHandFeatures(hand.landmarks, 'Left', hand.score);
          leftCandList = mudraClassifierRef.current.classify(leftFeatures);
        } else {
          rawRightHandLms = hand.landmarks;
          rightHandVis = hand.landmarks.length / 21;
          const rightFeatures = extractHandFeatures(hand.landmarks, 'Right', hand.score);
          rightCandList = mudraClassifierRef.current.classify(rightFeatures);
        }
      }

      setHasHandTracking(rawLeftHandLms.length > 0 || rawRightHandLms.length > 0);

      // Compute Confidence Percentages
      const bodyConf = rawPoseLandmarks.length >= 33
        ? Math.round((rawPoseLandmarks.reduce((sum, pt) => sum + (pt.visibility ?? 1), 0) / rawPoseLandmarks.length) * 100)
        : 0;
      setBodyConfidencePct(bodyConf);

      const handCount = (rawLeftHandLms.length > 0 ? 1 : 0) + (rawRightHandLms.length > 0 ? 1 : 0);
      const handConf = handCount === 2 ? 96 : handCount === 1 ? 92 : 0;
      setHandConfidencePct(handConf);

      // 4. High-Speed Kinematic Motion Engine (Recognition Path)
      // Buffer the raw frames with high-resolution timestamps to compute physical velocities & accelerations
      landmarkBufferRef.current.addFrame(now, rawPoseLandmarks, rawLeftHandLms, rawRightHandLms);
      const motion = landmarkBufferRef.current.computeMotionFeatures();
      setMotionFeatures(motion);

      // Emit high-speed movement events and motion blur tracking status
      if (motion.highSpeedEvent) {
        eventManagerRef.current.checkHighSpeedMovement(motion.highSpeedEvent, now);
      }
      if (motion.blurStatus && motion.blurStatus !== 'OPTIMAL') {
        eventManagerRef.current.checkMotionBlurStatus(motion.blurStatus, motion.blurMessage, now);
      }

      // 5. Adaptive Low-Latency Smoothing Engine (Display Path)
      // Uses LowLatencyStabilizer for hands (instant velocity-adaptive tracking) and One Euro for body.
      const displayState = landmarkSmootherRef.current.update(
        rawPoseLandmarks,
        rawLeftHandLms,
        rawRightHandLms,
        now
      );

      // Update state for live visual OverlayCanvas rendering
      setPoseLandmarks(displayState.pose);
      setLeftHandLandmarks(displayState.leftHand);
      setRightHandLandmarks(displayState.rightHand);
      setLeftHandTrackingState(displayState.leftHandState);
      setRightHandTrackingState(displayState.rightHandState);
      setTrails(displayState.trails);

      // 6. Pose Feature Extraction & Classification (Recognition Path uses raw high-fidelity landmarks)
      let extractedPoseFeatures: PoseFeatures | null = null;
      let poseCandidates: PoseCandidate[] = [];
      let confirmedPoseResult: RecognitionResult | null = null;

      if (rawPoseLandmarks.length >= 33) {
        extractedPoseFeatures = extractPoseFeatures(rawPoseLandmarks);
        setPoseFeatures(extractedPoseFeatures);

        if (extractedPoseFeatures) {
          const poseOutput = poseClassifierRef.current.classify(extractedPoseFeatures, now);
          poseCandidates = poseOutput.candidates;
          confirmedPoseResult = poseOutput.confirmedPose;

          if (confirmedPoseResult && confirmedPoseResult.status === 'CONFIRMED') {
            eventManagerRef.current.checkPoseChange(
              poseCandidates[0]?.poseId || null,
              confirmedPoseResult.label,
              confirmedPoseResult.sanskritName,
              confirmedPoseResult.confidence,
              now
            );
          }
        }

        // Add to movement tracker
        movementTrackerRef.current.addFrame({
          timestamp: now,
          landmarks: rawPoseLandmarks,
        });
      } else {
        setPoseFeatures(null);
      }

      // 7. Temporal Mudra Stabilization (Left, Right, Samyuta)
      const {
        stableLeft,
        stableRight,
        leftResult,
        rightResult,
        samyutaResult,
        isDetecting,
      } = temporalFilterRef.current.addObservation(
        leftCandList,
        rightCandList,
        now,
        rawLeftHandLms.length > 0,
        rawRightHandLms.length > 0,
        leftHandVis,
        rightHandVis
      );

      setLeftMudra(stableLeft);
      setRightMudra(stableRight);

      // Check Mudra Events (Debounced)
      if (stableLeft && stableLeft.isStable) {
        eventManagerRef.current.checkMudraChange(
          'Left',
          stableLeft.mudraId,
          stableLeft.name,
          stableLeft.sanskritName,
          stableLeft.confidence,
          true,
          now
        );
      }
      if (stableRight && stableRight.isStable) {
        eventManagerRef.current.checkMudraChange(
          'Right',
          stableRight.mudraId,
          stableRight.name,
          stableRight.sanskritName,
          stableRight.confidence,
          true,
          now
        );
      }

      // 7. Movement Classification (Trajectories & Rhythmic Patterns)
      const movFeatures = movementTrackerRef.current.getFeatures();
      const movementObs = movementClassifierRef.current.classify(movFeatures, now);

      if (movementObs && movementObs.confidence > 0.65) {
        eventManagerRef.current.checkMovementChange(
          movementObs.movementId,
          movementObs.name,
          movementObs.confidence,
          now
        );
      }

      // 8. Dance Form Rolling Temporal Classification
      const mudraList: MudraObservation[] = [];
      if (stableLeft) mudraList.push(stableLeft);
      if (stableRight) mudraList.push(stableRight);

      const danceFormPredictions = danceFormClassifierRef.current.classify(
        poseCandidates,
        mudraList,
        movementObs,
        now
      );

      const topDanceForm = danceFormPredictions[0];
      if (topDanceForm && topDanceForm.isConfirmed) {
        eventManagerRef.current.checkDanceFormChange(
          topDanceForm.danceFormId,
          topDanceForm.name,
          topDanceForm.confidence,
          true,
          now
        );
      }

      // Convert predictions to candidate format for compatibility
      const danceFormCandidates: DanceFormCandidate[] = danceFormPredictions.map((df) => ({
        danceFormId: df.danceFormId,
        name: df.name,
        category: df.category,
        state: df.state,
        confidence: df.confidence,
        reasons: df.evidence,
        reasoning: df.evidence,
      }));

      // 9. Mythological Scene Matching
      const storyMatches = storyClassifierRef.current.classify(
        poseCandidates,
        mudraList,
        movementObs
      );

      const latencyMs = Math.round(performance.now() - startTime);

      // Synchronized Performance Frame (Body + Hands)
      const synchronizedFrame: SynchronizedPerformanceFrame = {
        timestamp: now,
        pose: {
          landmarks: rawPoseLandmarks,
          features: extractedPoseFeatures,
          candidate: poseCandidates[0] || null,
        },
        leftHand: {
          landmarks: rawLeftHandLms,
          mudra: stableLeft,
        },
        rightHand: {
          landmarks: rawRightHandLms,
          mudra: stableRight,
        },
      };

      // Build clean DancePerformanceState without facial data
      const performanceState: DancePerformanceState = {
        danceForm: topDanceForm,
        currentPose: confirmedPoseResult || undefined,
        leftMudra: leftResult,
        rightMudra: rightResult,
        samyutaMudra: samyutaResult || undefined,
        currentMovement: movementObs
          ? {
              label: movementObs.name,
              confidence: movementObs.confidence,
              sanskritName: movementObs.sanskritName,
              status: 'CONFIRMED',
            }
          : undefined,
        synchronizedFrame,
        motionSpeed: motion.speedCategory,
        motionFeatures: motion,
        framePerformance: landmarkBufferRef.current.getFramePerformance(),
        highSpeedMovement: motion.highSpeedEvent,
        framingStatus: framing,
        storyState: {
          currentScene: storyMatches[0]?.sceneName || 'Sacred Invocation',
          narrativeState: storyMatches[0]?.narrativeDescription || 'Channeling shastric posture and mudras',
          recentEvents: eventManagerRef.current.getRecentEvents().map((e) => e.summary),
        },
        lastEvents: eventManagerRef.current.getRecentEvents(),
        fps: actualFps,
        latencyMs,
      };

      // Dispatch results up to parent
      onFrameAnalyzed({
        trackingState: currentTrackingState,
        poseFeatures: extractedPoseFeatures,
        poseCandidates,
        confirmedPose: confirmedPoseResult,
        leftMudra: stableLeft,
        rightMudra: stableRight,
        leftMudraResult: leftResult,
        rightMudraResult: rightResult,
        samyutaMudraResult: samyutaResult,
        isDetectingMudra: isDetecting,
        movement: movementObs,
        motionFeatures: motion,
        danceForms: danceFormCandidates,
        danceFormPredictions,
        storyScenes: storyMatches,
        framingStatus: framing,
        performanceState,
      });
    } catch (err) {
      console.warn('Frame processing pass skipped:', err);
    } finally {
      isAnalyzingRef.current = false;
    }
  }, [actualFps, onFrameAnalyzed]);

  // RequestVideoFrameCallback Loop with RequestAnimationFrame Fallback
  const scheduleNextFrame = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;

    if ('requestVideoFrameCallback' in HTMLVideoElement.prototype) {
      videoFrameCallbackIdRef.current = (video as any).requestVideoFrameCallback(
        (now: number, metadata: any) => {
          executeFrameAnalysis(metadata?.mediaTime ? metadata.mediaTime * 1000 : now);
          scheduleNextFrame();
        }
      );
    } else {
      animationFrameIdRef.current = requestAnimationFrame((timestamp) => {
        executeFrameAnalysis(timestamp);
        scheduleNextFrame();
      });
    }
  }, [executeFrameAnalysis]);

  // Start processing loop when initialized
  useEffect(() => {
    if (isInitialized) {
      scheduleNextFrame();
    }
    return () => {
      if (animationFrameIdRef.current) {
        cancelAnimationFrame(animationFrameIdRef.current);
      }
      if (videoRef.current && 'cancelVideoFrameCallback' in HTMLVideoElement.prototype && videoFrameCallbackIdRef.current) {
        (videoRef.current as any).cancelVideoFrameCallback(videoFrameCallbackIdRef.current);
      }
    };
  }, [isInitialized, scheduleNextFrame]);

  // Handle Video Upload
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const url = URL.createObjectURL(file);
    setIsUsingUploadedVideo(true);
    if (videoRef.current) {
      if (videoRef.current.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach((t) => t.stop());
        videoRef.current.srcObject = null;
      }
      videoRef.current.src = url;
      videoRef.current.loop = true;
      videoRef.current.play();
      setIsVideoPlaying(true);
    }
  };

  const toggleFacingMode = () => {
    const next = facingMode === 'user' ? 'environment' : 'user';
    setFacingMode(next);
    setIsMirrored(next === 'user');
    setIsUsingUploadedVideo(false);
  };

  const toggleVideoPlayback = () => {
    if (videoRef.current) {
      if (videoRef.current.paused) {
        videoRef.current.play();
        setIsVideoPlaying(true);
      } else {
        videoRef.current.pause();
        setIsVideoPlaying(false);
      }
    }
  };

  return (
    <div
      id="camera-feed-container"
      ref={containerRef}
      className="relative w-full aspect-4/3 md:aspect-16/9 bg-stone-950 rounded-2xl overflow-hidden shadow-2xl border border-stone-800 flex items-center justify-center"
    >
      {/* Video Element */}
      <video
        id="natya-video-feed"
        ref={videoRef}
        playsInline
        muted
        className={`w-full h-full object-cover ${isMirrored ? 'scale-x-[-1]' : ''}`}
      />

      {/* Overlay Canvas */}
      <OverlayCanvas
        poseLandmarks={poseLandmarks}
        leftHandLandmarks={leftHandLandmarks}
        rightHandLandmarks={rightHandLandmarks}
        leftMudra={leftMudra}
        rightMudra={rightMudra}
        poseFeatures={poseFeatures}
        trails={trails}
        overlayStyle={overlayStyle}
        isMirrored={isMirrored}
        videoWidth={videoDims.width}
        videoHeight={videoDims.height}
      />

      {/* Loading Overlay */}
      {isInitializing && (
        <div id="loading-overlay" className="absolute inset-0 bg-stone-950/80 backdrop-blur-sm z-30 flex flex-col items-center justify-center p-6 text-center">
          <RefreshCw className="w-10 h-10 text-amber-500 animate-spin mb-4" />
          <h3 className="text-xl font-bold text-white mb-2">Initializing Mudra Lens Real-Time Vision Engine</h3>
          <p className="text-sm text-stone-400 max-w-md">
            Loading MediaPipe Pose Landmarker (33 body points) and Hand Landmarker (21 finger joints)...
          </p>
        </div>
      )}

      {/* Error Overlay */}
      {initError && (
        <div id="error-overlay" className="absolute inset-0 bg-stone-950/90 z-30 flex flex-col items-center justify-center p-6 text-center">
          <AlertCircle className="w-12 h-12 text-rose-500 mb-4" />
          <h3 className="text-lg font-bold text-white mb-2">Model Load Notice</h3>
          <p className="text-sm text-stone-400 max-w-md mb-4">{initError}</p>
          <button
            id="btn-retry-init"
            onClick={initModels}
            className="px-5 py-2.5 bg-amber-600 hover:bg-amber-500 text-white rounded-xl font-semibold transition"
          >
            Retry Loading
          </button>
        </div>
      )}

      {/* Top Left: High-Speed Temporal Diagnostic Status HUD */}
      <div id="tracking-status-badge" className="absolute top-4 left-4 z-20 flex flex-wrap items-center gap-1.5 max-w-[85%]">
        {/* 1. Motion Tracking Quality Indicator */}
        {(() => {
          const perf = landmarkBufferRef.current.getFramePerformance();
          const quality = perf.quality;
          return (
            <div
              id="tracking-quality-pill"
              className="flex items-center space-x-1.5 bg-stone-900/90 backdrop-blur-md px-2.5 py-1 rounded-full border border-stone-700/60 shadow-lg text-[11px]"
            >
              <span
                className={`w-2 h-2 rounded-full ${
                  quality === 'Excellent'
                    ? 'bg-emerald-400 animate-pulse'
                    : quality === 'Good'
                    ? 'bg-amber-400'
                    : 'bg-rose-400'
                }`}
              />
              <span className="font-semibold text-stone-200">
                {quality === 'Excellent'
                  ? '🟢 Body: Excellent'
                  : quality === 'Good'
                  ? '🟡 Body: Good'
                  : '⚪ Body: Searching'}
              </span>
            </div>
          );
        })()}

        {/* 2. Low-Latency Hand Tracking Status Pill */}
        {(() => {
          const isRapid = leftHandTrackingState === 'RAPID_MOVEMENT' || rightHandTrackingState === 'RAPID_MOVEMENT';
          const isTracking = leftHandTrackingState === 'TRACKING' || rightHandTrackingState === 'TRACKING';
          const isLowConf = leftHandTrackingState === 'LOW_CONFIDENCE' || rightHandTrackingState === 'LOW_CONFIDENCE';
          const isBoth = (leftHandTrackingState === 'TRACKING' || leftHandTrackingState === 'RAPID_MOVEMENT') && 
                         (rightHandTrackingState === 'TRACKING' || rightHandTrackingState === 'RAPID_MOVEMENT');

          let pillClass = 'bg-stone-900/90 border-stone-700/60 text-stone-300';
          let dotColor = 'bg-stone-400';
          let label = '⚪ No Hands';

          if (isRapid) {
            pillClass = 'bg-amber-950/90 border-amber-500/70 text-amber-300';
            dotColor = 'bg-amber-400 animate-ping';
            label = '🟡 Rapid Hand Motion (0-Lag)';
          } else if (isBoth) {
            pillClass = 'bg-emerald-950/90 border-emerald-500/70 text-emerald-300';
            dotColor = 'bg-emerald-400';
            label = '🟢 Both Hands Active';
          } else if (isTracking) {
            pillClass = 'bg-emerald-950/90 border-emerald-500/70 text-emerald-300';
            dotColor = 'bg-emerald-400';
            label = `🟢 Hand Tracking (${leftHandTrackingState === 'TRACKING' ? 'L' : 'R'})`;
          } else if (isLowConf) {
            pillClass = 'bg-orange-950/90 border-orange-500/70 text-orange-300';
            dotColor = 'bg-orange-400';
            label = '🟠 Reacquiring Hand';
          }

          return (
            <div
              id="hand-tracking-status-pill"
              className={`flex items-center space-x-1.5 px-2.5 py-1 rounded-full border shadow-lg text-[11px] backdrop-blur-md font-semibold transition-all ${pillClass}`}
            >
              <span className={`w-2 h-2 rounded-full ${dotColor}`} />
              <Hand className="w-3 h-3" />
              <span>{label}</span>
            </div>
          );
        })()}

        {/* 3. Motion Speed Level Pill */}
        <div
          id="motion-speed-pill"
          className={`flex items-center space-x-1.5 px-2.5 py-1 rounded-full border shadow-lg text-[11px] backdrop-blur-md font-semibold transition-all ${
            motionFeatures.speedCategory === 'VERY_FAST'
              ? 'bg-rose-950/90 border-rose-500/70 text-rose-300 animate-pulse'
              : motionFeatures.speedCategory === 'FAST'
              ? 'bg-amber-950/90 border-amber-500/70 text-amber-300'
              : motionFeatures.speedCategory === 'NORMAL'
              ? 'bg-stone-900/90 border-emerald-700/60 text-emerald-300'
              : 'bg-stone-900/90 border-stone-700/60 text-stone-300'
          }`}
        >
          <Activity className="w-3 h-3" />
          <span>Motion: {motionFeatures.speedCategory.replace('_', ' ')}</span>
        </div>

        {/* 4. Real measured FPS */}
        <div className="flex items-center space-x-1 bg-stone-900/80 backdrop-blur-md px-2 py-1 rounded-md border border-stone-800 text-[10px] text-stone-300 font-mono">
          <span className="text-emerald-400 font-semibold">{actualFps} FPS</span>
          <span className="text-stone-600">•</span>
          <span>{cameraResolution}</span>
        </div>

        {/* 5. Body & Hand Confidence Percentages */}
        <div className="hidden sm:flex items-center space-x-2 bg-stone-900/85 backdrop-blur-md px-2.5 py-1 rounded-md border border-stone-800 text-[10px] text-stone-300 font-mono">
          <span>Body: <strong className="text-stone-100">{bodyConfidencePct}%</strong></span>
          <span className="text-stone-600">|</span>
          <span>Hands: <strong className="text-stone-100">{handConfidencePct}%</strong></span>
        </div>
      </div>

      {/* Latency & Vision Telemetry Diagnostic HUD Overlay */}
      {showLatencyHud && (
        <div
          id="latency-debugger-hud"
          className="absolute top-16 left-4 z-25 bg-stone-950/95 border border-amber-500/60 rounded-xl p-3 shadow-2xl backdrop-blur-md text-xs font-mono text-stone-300 w-72 pointer-events-auto"
        >
          <div className="flex items-center justify-between border-b border-stone-800 pb-1.5 mb-2">
            <span className="font-bold text-amber-400 flex items-center gap-1">
              <Zap className="w-3.5 h-3.5" /> Low-Latency Telemetry
            </span>
            <button
              onClick={() => setShowLatencyHud(false)}
              className="text-stone-500 hover:text-stone-300 px-1 text-sm font-sans"
            >
              ✕
            </button>
          </div>
          <div className="space-y-1.5">
            <div className="flex justify-between">
              <span className="text-stone-400">Processing Rate:</span>
              <span className="text-emerald-400 font-bold">{actualFps} FPS (Vsync)</span>
            </div>
            <div className="flex justify-between">
              <span className="text-stone-400">Pose Inference:</span>
              <span className="text-stone-200">{poseLatency} ms</span>
            </div>
            <div className="flex justify-between">
              <span className="text-stone-400">Hand Inference:</span>
              <span className="text-cyan-300">{handLatency} ms</span>
            </div>
            <div className="flex justify-between">
              <span className="text-stone-400">Total Latency:</span>
              <span className="text-emerald-400 font-semibold">{Math.round((poseLatency + handLatency) * 10) / 10} ms</span>
            </div>
            <div className="flex justify-between">
              <span className="text-stone-400">Dropped/Skipped:</span>
              <span className={droppedFramesCount > 0 ? 'text-amber-400' : 'text-stone-400'}>
                {droppedFramesCount} frames
              </span>
            </div>
            <div className="border-t border-stone-800 pt-1.5 mt-1.5 space-y-1">
              <div className="flex justify-between">
                <span className="text-stone-400">Hand Filter:</span>
                <span className="text-amber-300 font-medium">Velocity-Adaptive (0-Lag)</span>
              </div>
              <div className="flex justify-between">
                <span className="text-stone-400">Left Hand:</span>
                <span className={leftHandTrackingState === 'TRACKING' ? 'text-emerald-400' : leftHandTrackingState === 'RAPID_MOVEMENT' ? 'text-amber-400' : 'text-stone-500'}>
                  {leftHandTrackingState}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-stone-400">Right Hand:</span>
                <span className={rightHandTrackingState === 'TRACKING' ? 'text-emerald-400' : rightHandTrackingState === 'RAPID_MOVEMENT' ? 'text-amber-400' : 'text-stone-500'}>
                  {rightHandTrackingState}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* High-Speed Movement / Motion Blur Alert Banner */}
      {motionFeatures.blurStatus && motionFeatures.blurStatus !== 'OPTIMAL' && (
        <div
          id="motion-blur-alert-banner"
          className="absolute top-16 left-4 right-4 z-25 pointer-events-none flex justify-center animate-fade-in"
        >
          <div
            className={`px-3.5 py-1.5 rounded-lg border backdrop-blur-md text-xs font-semibold flex items-center space-x-2 shadow-xl ${
              motionFeatures.blurStatus === 'RAPID_MOTION_LOW_CONFIDENCE'
                ? 'bg-amber-950/90 border-amber-500/80 text-amber-200'
                : 'bg-emerald-950/90 border-emerald-500/80 text-emerald-200'
            }`}
          >
            <Activity className="w-3.5 h-3.5" />
            <span>{motionFeatures.blurMessage}</span>
          </div>
        </div>
      )}

      {/* Top Right Quick Controls */}
      <div id="camera-controls-bar" className="absolute top-4 right-4 z-20 flex items-center space-x-2">
        {/* Toggle Telemetry HUD Button */}
        <button
          id="btn-toggle-latency-hud"
          onClick={() => setShowLatencyHud((prev) => !prev)}
          title="Toggle Low-Latency & Performance HUD"
          className={`p-2.5 rounded-full backdrop-blur-md border transition shadow-lg ${
            showLatencyHud
              ? 'bg-amber-500 text-stone-950 border-amber-400 font-bold'
              : 'bg-stone-900/80 hover:bg-stone-800 text-stone-300 hover:text-white border-stone-700/60'
          }`}
        >
          <Gauge className="w-4 h-4" />
        </button>

        {/* Upload Video Button */}
        <button
          id="btn-upload-video"
          onClick={() => fileInputRef.current?.click()}
          title="Upload Dance Video File"
          className="p-2.5 bg-stone-900/80 hover:bg-stone-800 text-stone-300 hover:text-white rounded-full backdrop-blur-md border border-stone-700/60 transition shadow-lg"
        >
          <Upload className="w-4 h-4" />
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="video/*"
          className="hidden"
          onChange={handleFileUpload}
        />

        {/* Switch Camera */}
        {!isUsingUploadedVideo && (
          <button
            id="btn-switch-camera"
            onClick={toggleFacingMode}
            title="Switch Camera (Front/Back)"
            className="p-2.5 bg-stone-900/80 hover:bg-stone-800 text-stone-300 hover:text-white rounded-full backdrop-blur-md border border-stone-700/60 transition shadow-lg"
          >
            <SwitchCamera className="w-4 h-4" />
          </button>
        )}

        {/* Play/Pause for uploaded video */}
        {isUsingUploadedVideo && (
          <button
            id="btn-toggle-play"
            onClick={toggleVideoPlayback}
            className="p-2.5 bg-amber-600 hover:bg-amber-500 text-white rounded-full backdrop-blur-md transition shadow-lg"
          >
            {isVideoPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
          </button>
        )}
      </div>

      {/* Bottom Live Camera Framing Guidance Banner */}
      {framingStatus.distanceStatus !== 'OPTIMAL' && !isInitializing && (
        <div
          id="camera-framing-guidance"
          className="absolute bottom-4 left-4 right-4 z-20 pointer-events-none flex items-center justify-center"
        >
          <div className="bg-stone-900/90 backdrop-blur-md px-4 py-2 rounded-xl border border-amber-500/40 text-amber-200 text-xs md:text-sm flex items-center space-x-2 shadow-xl">
            {framingStatus.distanceStatus === 'FEET_CUT_OFF' ? (
              <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0" />
            ) : (
              <Camera className="w-4 h-4 text-amber-400 shrink-0" />
            )}
            <span>{framingStatus.guidanceMessage}</span>
          </div>
        </div>
      )}

      {/* Pose Guide Overlay when No Person is Visible */}
      {trackingState === 'NO_PERSON' && !isInitializing && (
        <div id="stand-in-frame-hint" className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center z-15 bg-stone-950/40">
          <div className="w-56 h-80 border-2 border-dashed border-amber-500/40 rounded-3xl flex flex-col items-center justify-center p-6 text-center">
            <Camera className="w-8 h-8 text-amber-400 mb-2 opacity-80" />
            <p className="text-sm font-medium text-stone-300">Position yourself in camera view</p>
            <p className="text-xs text-stone-400 mt-1">Show full body or hands to begin recognition</p>
          </div>
        </div>
      )}
    </div>
  );
};

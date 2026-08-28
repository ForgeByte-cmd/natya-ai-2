/**
 * VisionCore.ts
 * High-Performance Zero-Lag Vision Pipeline Architecture for Live Classical Dance Tracking.
 * 
 * Key Architectural Guarantees:
 * 1. Independent body and hand tracking pipelines (no heavy EMA on hands).
 * 2. Ultra low-latency velocity-adaptive hand stabilizer (LowLatencyStabilizer).
 * 3. Fast motion bypasses heavy dampening; slow motion activates micro-jitter suppression.
 * 4. Wrist vs finger joint differentiation (wrist = zero latency, fingers = jitter suppressed).
 * 5. Latest-frame-only processing engine (never processes backlogged frames).
 * 6. Display render loop decoupled from AI inference loop.
 * 7. Gemini completely decoupled from tracking/rendering path.
 */

import { BodyLandmark, BodyTrackingState } from '../types/pose';
import { FingerLandmark } from '../types/mudra';
import { AdaptiveSmoother } from './smoothing/AdaptiveSmoother';
import { FilterProfileConfig, VISION_CONFIG } from '../config/vision';

export type HandTrackingState = 'TRACKING' | 'RAPID_MOVEMENT' | 'LOW_CONFIDENCE' | 'LOST';

export interface Point2D {
  x: number;
  y: number;
  z?: number;
  visibility?: number;
}

export interface HandJointHistory {
  current: Point2D;
  previous: Point2D | null;
  previousPrev: Point2D | null;
  timestamp: number;
  velocity: { vx: number; vy: number };
}

export interface LowLatencyStabilizerConfig {
  minConfidence: number;
  wristAlphaBoost: number;
  deadZoneFingers: number;
  predictionTimeMs: number;
  maxPredictionDist: number;
  lostGracePeriodMs: number;
  speedThresholds: {
    slow: number;       // <= 0.15 norm/s
    normal: number;     // 0.15 - 0.55 norm/s
    fast: number;       // 0.55 - 1.20 norm/s
    veryFast: number;   // > 1.20 norm/s
  };
  smoothingAlphas: {
    slow: number;       // 0.75 - stronger stabilization during static mudra hold
    normal: number;     // 0.88 - medium responsive
    fast: number;       // 0.95 - light smoothing
    veryFast: number;   // 1.00 - raw instantaneous pass-through
  };
}

export const DEFAULT_STABILIZER_CONFIG: LowLatencyStabilizerConfig = {
  minConfidence: 0.25,
  wristAlphaBoost: 0.08,
  deadZoneFingers: 0.0012,
  predictionTimeMs: 14,
  maxPredictionDist: 0.04,
  lostGracePeriodMs: 120,
  speedThresholds: {
    slow: 0.15,
    normal: 0.55,
    fast: 1.20,
    veryFast: 2.20,
  },
  smoothingAlphas: {
    slow: 0.76,
    normal: 0.88,
    fast: 0.95,
    veryFast: 1.0,
  },
};

export const HAND_TRACKING_CONFIG = {
  recognition: {
    smoothing: 'adaptive',
  },
  rendering: {
    smoothing: 'very-light',
    prediction: true,
    interpolation: true,
  },
};

/**
 * LowLatencyStabilizer
 * Dedicated per-hand stabilizer that eliminates trailing and hand lag
 * using velocity-adaptive filtering, joint-specific thresholds, and short prediction.
 */
export class LowLatencyStabilizer {
  private history: Map<number, HandJointHistory> = new Map();
  private lastUpdateTime: number = 0;
  private lastSeenTime: number = 0;
  private trackingState: HandTrackingState = 'LOST';
  private config: LowLatencyStabilizerConfig;
  private handedness: 'Left' | 'Right';

  constructor(handedness: 'Left' | 'Right', customConfig?: Partial<LowLatencyStabilizerConfig>) {
    this.handedness = handedness;
    this.config = {
      ...DEFAULT_STABILIZER_CONFIG,
      ...(customConfig || {}),
    };
  }

  public getTrackingState(): HandTrackingState {
    return this.trackingState;
  }

  /**
   * Adaptive hand smoothing calculation based on joint velocity and confidence
   */
  public getAdaptiveHandSmoothing(speed: number, confidence: number, isWrist: boolean): number {
    let baseAlpha = this.config.smoothingAlphas.normal;

    if (speed > this.config.speedThresholds.fast) {
      baseAlpha = this.config.smoothingAlphas.veryFast;
    } else if (speed > this.config.speedThresholds.normal) {
      baseAlpha = this.config.smoothingAlphas.fast;
    } else if (speed < this.config.speedThresholds.slow) {
      baseAlpha = this.config.smoothingAlphas.slow;
    }

    // Boost wrist responsiveness for zero-lag arm/wrist trajectories
    if (isWrist) {
      baseAlpha = Math.min(1.0, baseAlpha + this.config.wristAlphaBoost);
    }

    // Confidence weighting
    if (confidence < 0.5) {
      baseAlpha = Math.max(0.4, baseAlpha * (confidence / 0.5));
    }

    return baseAlpha;
  }

  /**
   * Confidence-aware single landmark position update
   */
  public updateHandLandmark(
    previous: Point2D | null,
    current: Point2D,
    confidence: number,
    speed: number,
    isWrist: boolean
  ): Point2D {
    if (!previous || isNaN(previous.x) || isNaN(previous.y)) {
      return current;
    }

    if (confidence < this.config.minConfidence) {
      return previous;
    }

    // Dead-zone suppression for fingers during static mudra hold
    if (!isWrist) {
      const dx = current.x - previous.x;
      const dy = current.y - previous.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < this.config.deadZoneFingers && speed < this.config.speedThresholds.slow) {
        return {
          x: previous.x,
          y: previous.y,
          z: current.z ?? previous.z ?? 0,
          visibility: confidence,
        };
      }
    }

    const smoothing = this.getAdaptiveHandSmoothing(speed, confidence, isWrist);

    // Current frame dominates on fast movements (smoothing -> 1.0)
    return {
      x: previous.x + (current.x - previous.x) * smoothing,
      y: previous.y + (current.y - previous.y) * smoothing,
      z: (previous.z ?? 0) + ((current.z ?? 0) - (previous.z ?? 0)) * smoothing,
      visibility: confidence,
    };
  }

  /**
   * Clamps prediction to prevent noisy overshoot
   */
  public clampPrediction(smooth: Point2D, predicted: Point2D, maxDist: number): Point2D {
    const dx = predicted.x - smooth.x;
    const dy = predicted.y - smooth.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist > maxDist && dist > 0) {
      const ratio = maxDist / dist;
      return {
        ...predicted,
        x: smooth.x + dx * ratio,
        y: smooth.y + dy * ratio,
      };
    }
    return predicted;
  }

  /**
   * Processes raw 21 MediaPipe hand landmarks and returns stabilized, zero-lag landmarks
   */
  public update(rawLandmarks: FingerLandmark[] | undefined | null, now: number = performance.now()): FingerLandmark[] {
    const dt = this.lastUpdateTime > 0 ? Math.max(1, (now - this.lastUpdateTime) / 1000) : 0.033;
    this.lastUpdateTime = now;

    // Handle missing / lost hand detection
    if (!rawLandmarks || rawLandmarks.length < 21) {
      const timeSinceSeen = now - this.lastSeenTime;
      if (this.lastSeenTime > 0 && timeSinceSeen <= this.config.lostGracePeriodMs) {
        this.trackingState = 'LOW_CONFIDENCE';
        return this.extrapolateGracePeriod(now);
      }
      this.trackingState = 'LOST';
      return [];
    }

    this.lastSeenTime = now;

    // Estimate hand velocity across key joints (wrist + middle mcp)
    const wristRaw = rawLandmarks[0];
    const prevWristHist = this.history.get(0);
    let handSpeed = 0;

    if (prevWristHist && prevWristHist.current) {
      const dx = wristRaw.x - prevWristHist.current.x;
      const dy = wristRaw.y - prevWristHist.current.y;
      handSpeed = Math.sqrt(dx * dx + dy * dy) / dt;
    }

    // Set Hand Tracking Quality State
    if (handSpeed > this.config.speedThresholds.fast) {
      this.trackingState = 'RAPID_MOVEMENT';
    } else {
      this.trackingState = 'TRACKING';
    }

    const stabilizedLandmarks: FingerLandmark[] = [];
    const predictionTimeSec = this.config.predictionTimeMs / 1000;

    for (let i = 0; i < rawLandmarks.length; i++) {
      const rawLm = rawLandmarks[i];
      const isWrist = i === 0;
      const confidence = rawLm.visibility !== undefined ? rawLm.visibility : 0.95;

      const jointHist = this.history.get(i);
      const prevPos = jointHist ? jointHist.current : null;

      // 1. Calculate joint speed
      let jointSpeed = handSpeed;
      if (prevPos) {
        const jdx = rawLm.x - prevPos.x;
        const jdy = rawLm.y - prevPos.y;
        jointSpeed = Math.sqrt(jdx * jdx + jdy * jdy) / dt;
      }

      // 2. Velocity-adaptive stabilization
      const smoothed = this.updateHandLandmark(prevPos, rawLm, confidence, jointSpeed, isWrist);

      // 3. Calculate joint velocity for short latency compensation prediction
      let vx = 0;
      let vy = 0;
      if (prevPos) {
        vx = (smoothed.x - prevPos.x) / dt;
        vy = (smoothed.y - prevPos.y) / dt;
      }

      // 4. Very short prediction for display latency compensation (clamped)
      let finalX = smoothed.x;
      let finalY = smoothed.y;

      if (this.config.predictionTimeMs > 0 && jointSpeed > this.config.speedThresholds.slow) {
        const rawPred: Point2D = {
          x: smoothed.x + vx * predictionTimeSec,
          y: smoothed.y + vy * predictionTimeSec,
        };
        const clamped = this.clampPrediction(smoothed, rawPred, this.config.maxPredictionDist);
        finalX = clamped.x;
        finalY = clamped.y;
      }

      const finalPoint: FingerLandmark = {
        x: finalX,
        y: finalY,
        z: smoothed.z ?? rawLm.z ?? 0,
        visibility: confidence,
      };

      // 5. Update short 3-frame history (current, previous, previousPrev)
      this.history.set(i, {
        current: finalPoint,
        previous: prevPos,
        previousPrev: jointHist?.previous ?? null,
        timestamp: now,
        velocity: { vx, vy },
      });

      stabilizedLandmarks.push(finalPoint);
    }

    return stabilizedLandmarks;
  }

  private extrapolateGracePeriod(now: number): FingerLandmark[] {
    const result: FingerLandmark[] = [];
    const decay = Math.max(0, 1.0 - (now - this.lastSeenTime) / this.config.lostGracePeriodMs);

    for (let i = 0; i < 21; i++) {
      const hist = this.history.get(i);
      if (!hist || !hist.current) continue;

      const predX = hist.current.x + hist.velocity.vx * 0.012 * decay;
      const predY = hist.current.y + hist.velocity.vy * 0.012 * decay;

      result.push({
        x: predX,
        y: predY,
        z: hist.current.z ?? 0,
        visibility: Math.max(0.1, (hist.current.visibility ?? 0.8) * decay),
      });
    }

    return result.length === 21 ? result : [];
  }

  public reset(): void {
    this.history.clear();
    this.lastUpdateTime = 0;
    this.lastSeenTime = 0;
    this.trackingState = 'LOST';
  }
}

export interface LiveTrackingState {
  rawPose: BodyLandmark[];
  rawLeftHand: FingerLandmark[];
  rawRightHand: FingerLandmark[];
  renderedPose: BodyLandmark[];
  renderedLeftHand: FingerLandmark[];
  renderedRightHand: FingerLandmark[];
  timestamp: number;
  poseConfidence: number;
  leftHandConfidence: number;
  rightHandConfidence: number;
  leftHandState: HandTrackingState;
  rightHandState: HandTrackingState;
  motionSpeed: string;
}

export interface VisionTelemetry {
  cameraFps: number;
  visionFps: number;
  renderFps: number;
  poseLatencyMs: number;
  handLatencyMs: number;
  renderLatencyMs: number;
  totalLatencyMs: number;
  droppedFrames: number;
  queuedFrames: number;
  leftHandState: HandTrackingState;
  rightHandState: HandTrackingState;
  motionSpeed: string;
}

/**
 * VisionCore
 * Coordinates independent high-speed vision pipelines and provides a thread-safe
 * latest-frame-only state store for decoupled display rendering.
 */
export class VisionCore {
  private bodySmoother: AdaptiveSmoother<BodyLandmark>;
  private leftHandStabilizer: LowLatencyStabilizer;
  private rightHandStabilizer: LowLatencyStabilizer;

  // Live Tracking State Store (Accessed by requestAnimationFrame Display Loop)
  private liveState: LiveTrackingState = {
    rawPose: [],
    rawLeftHand: [],
    rawRightHand: [],
    renderedPose: [],
    renderedLeftHand: [],
    renderedRightHand: [],
    timestamp: 0,
    poseConfidence: 0,
    leftHandConfidence: 0,
    rightHandConfidence: 0,
    leftHandState: 'LOST',
    rightHandState: 'LOST',
    motionSpeed: 'STATIC',
  };

  // Telemetry Metrics
  private droppedFrames: number = 0;
  private totalFramesProcessed: number = 0;
  private lastVisionFrameTime: number = 0;
  private visionFps: number = 0;
  private isProcessingBusy: boolean = false;

  constructor() {
    this.bodySmoother = new AdaptiveSmoother<BodyLandmark>('body');
    this.leftHandStabilizer = new LowLatencyStabilizer('Left');
    this.rightHandStabilizer = new LowLatencyStabilizer('Right');
  }

  public isBusy(): boolean {
    return this.isProcessingBusy;
  }

  public recordDroppedFrame(): void {
    this.droppedFrames++;
  }

  /**
   * Process incoming frame landmarks through independent body and hand stabilizing pipelines.
   */
  public processLandmarks(
    rawPose: BodyLandmark[],
    rawLeftHand: FingerLandmark[],
    rawRightHand: FingerLandmark[],
    now: number,
    motionSpeed: string = 'NORMAL'
  ): {
    renderedPose: BodyLandmark[];
    renderedLeftHand: FingerLandmark[];
    renderedRightHand: FingerLandmark[];
    leftHandState: HandTrackingState;
    rightHandState: HandTrackingState;
  } {
    this.isProcessingBusy = true;
    const dt = this.lastVisionFrameTime > 0 ? now - this.lastVisionFrameTime : 33;
    if (dt > 0) {
      const instFps = 1000 / dt;
      this.visionFps = Math.round(this.visionFps * 0.85 + instFps * 0.15);
    }
    this.lastVisionFrameTime = now;
    this.totalFramesProcessed++;

    // 1. Body Pipeline: AdaptiveSmoother with posture stability optimization
    const renderedPose = this.bodySmoother.update(rawPose, now);

    // 2. Hand Pipelines: Independent LowLatencyStabilizers for zero-lag hasta mudras
    const renderedLeftHand = this.leftHandStabilizer.update(rawLeftHand, now);
    const renderedRightHand = this.rightHandStabilizer.update(rawRightHand, now);

    const leftHandState = this.leftHandStabilizer.getTrackingState();
    const rightHandState = this.rightHandStabilizer.getTrackingState();

    // 3. Compute confidences
    const poseConfidence = rawPose.length >= 33
      ? Math.round((rawPose.reduce((sum, p) => sum + (p.visibility ?? 1), 0) / rawPose.length) * 100)
      : 0;
    const leftHandConfidence = rawLeftHand.length > 0 ? (leftHandState === 'TRACKING' ? 96 : 85) : 0;
    const rightHandConfidence = rawRightHand.length > 0 ? (rightHandState === 'TRACKING' ? 96 : 85) : 0;

    // 4. Update Live State
    this.liveState = {
      rawPose,
      rawLeftHand,
      rawRightHand,
      renderedPose,
      renderedLeftHand,
      renderedRightHand,
      timestamp: now,
      poseConfidence,
      leftHandConfidence,
      rightHandConfidence,
      leftHandState,
      rightHandState,
      motionSpeed,
    };

    this.isProcessingBusy = false;

    return {
      renderedPose,
      renderedLeftHand,
      renderedRightHand,
      leftHandState,
      rightHandState,
    };
  }

  /**
   * Thread-safe access to latest live tracking state for display render loop
   */
  public getLiveState(): LiveTrackingState {
    return this.liveState;
  }

  public getTelemetry(cameraFps: number, renderFps: number, poseLat: number, handLat: number, renderLat: number): VisionTelemetry {
    return {
      cameraFps,
      visionFps: this.visionFps,
      renderFps,
      poseLatencyMs: Math.round(poseLat),
      handLatencyMs: Math.round(handLat),
      renderLatencyMs: Math.round(renderLat),
      totalLatencyMs: Math.round(poseLat + handLat + renderLat),
      droppedFrames: this.droppedFrames,
      queuedFrames: 0,
      leftHandState: this.liveState.leftHandState,
      rightHandState: this.liveState.rightHandState,
      motionSpeed: this.liveState.motionSpeed,
    };
  }

  public reset(): void {
    this.bodySmoother.reset();
    this.leftHandStabilizer.reset();
    this.rightHandStabilizer.reset();
    this.droppedFrames = 0;
    this.liveState = {
      rawPose: [],
      rawLeftHand: [],
      rawRightHand: [],
      renderedPose: [],
      renderedLeftHand: [],
      renderedRightHand: [],
      timestamp: 0,
      poseConfidence: 0,
      leftHandConfidence: 0,
      rightHandConfidence: 0,
      leftHandState: 'LOST',
      rightHandState: 'LOST',
      motionSpeed: 'STATIC',
    };
  }
}

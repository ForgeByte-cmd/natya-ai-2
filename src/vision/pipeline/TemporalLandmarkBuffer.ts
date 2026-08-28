import { BodyLandmark } from '../../types/pose';
import { FingerLandmark } from '../../types/mudra';
import {
  MotionFrame,
  LandmarkFrame,
  MotionFeatures,
  MotionSpeed,
  MotionMode,
  MotionScore,
  KinematicFeatures,
  TrajectoryPoint,
  JointTrajectory,
  FramePerformance,
  DeviceMotionCalibration,
  HighSpeedMovementEvent,
} from '../../types/pipeline';
import { calculateDistance } from '../coordinates/coordinateTransform';

export interface Point {
  x: number;
  y: number;
  z?: number;
  visibility?: number;
}

export type SmoothingAlgorithm = 'adaptive_ema' | 'ema' | 'kalman' | 'none';

export interface LandmarkSmoothingConfig {
  algorithm: SmoothingAlgorithm;
  /** Fixed smoothing alpha for standard EMA (0 < alpha <= 1). Default: 0.65 */
  emaAlpha?: number;
  /** Minimum alpha for adaptive EMA (used when still / slow motion). Default: 0.35 */
  minAlpha?: number;
  /** Maximum alpha for adaptive EMA (used during fast motion). Default: 0.95 */
  maxAlpha?: number;
  /** Velocity sensitivity cutoff for adaptive EMA. Default: 0.015 */
  velocityCutoff?: number;
  /** Kalman measurement noise covariance R. Default: 0.005 */
  kalmanR?: number;
  /** Kalman process noise covariance Q. Default: 0.0001 */
  kalmanQ?: number;
  /** Configurable mode-based smoothing factors */
  smoothingFactors?: {
    normal: number;
    fast: number;
    veryFast: number;
  };
}

interface KalmanState1D {
  estimate: number;
  errorCovariance: number;
}

interface LandmarkFilterState {
  x: number;
  y: number;
  z: number;
  visibility?: number;
  lastUpdated: number;
  kalmanX?: KalmanState1D;
  kalmanY?: KalmanState1D;
  kalmanZ?: KalmanState1D;
  kalmanVis?: KalmanState1D;
}

export const TRACKED_JOINTS = [
  'leftWrist',
  'rightWrist',
  'leftElbow',
  'rightElbow',
  'leftShoulder',
  'rightShoulder',
  'leftHip',
  'rightHip',
  'leftKnee',
  'rightKnee',
  'leftAnkle',
  'rightAnkle',
  'leftFoot',
  'rightFoot',
  'bodyCenter',
  'leftHand',
  'rightHand',
] as const;

export type TrackedJointName = typeof TRACKED_JOINTS[number];

/**
 * Calculates raw instantaneous velocity between two timestamped 2D/3D points:
 * v = sqrt(dx^2 + dy^2) / dt
 */
export function calculateVelocity(current: Point, previous: Point, dt: number): number {
  if (dt <= 0.0001) return 0;
  const dx = current.x - previous.x;
  const dy = current.y - previous.y;
  return Math.sqrt(dx * dx + dy * dy) / dt;
}

/**
 * Calculates movement direction angle in radians (-PI to PI)
 */
export function calculateDirection(current: Point, previous: Point): number {
  const dx = current.x - previous.x;
  const dy = current.y - previous.y;
  return Math.atan2(dy, dx);
}

/**
 * Calculates stable body scale using torso length (mid-shoulder to mid-hip)
 * and biacromial shoulder width to make measurements invariant to camera distance.
 */
export function calculateBodyScale(poseLandmarks: BodyLandmark[]): number {
  if (!poseLandmarks || poseLandmarks.length < 25) {
    return 0.35;
  }

  // 11 = left shoulder, 12 = right shoulder
  // 23 = left hip, 24 = right hip
  const leftShoulder = poseLandmarks[11];
  const rightShoulder = poseLandmarks[12];
  const leftHip = poseLandmarks[23];
  const rightHip = poseLandmarks[24];

  if (!leftShoulder || !rightShoulder) {
    return 0.35;
  }

  const shoulderWidth = calculateDistance(leftShoulder, rightShoulder);

  let torsoLength = 0;
  if (leftHip && rightHip) {
    const midShoulder = {
      x: (leftShoulder.x + rightShoulder.x) / 2,
      y: (leftShoulder.y + rightShoulder.y) / 2,
      z: ((leftShoulder.z ?? 0) + (rightShoulder.z ?? 0)) / 2,
    };
    const midHip = {
      x: (leftHip.x + rightHip.x) / 2,
      y: (leftHip.y + rightHip.y) / 2,
      z: ((leftHip.z ?? 0) + (rightHip.z ?? 0)) / 2,
    };
    torsoLength = calculateDistance(midShoulder, midHip);
  }

  // Choose the most stable anatomical dimension (prefer torsoLength or shoulderWidth)
  const scale = torsoLength > 0.08 ? torsoLength : shoulderWidth > 0.05 ? shoulderWidth : 0.35;
  return Math.max(0.06, scale);
}

export class TemporalLandmarkBuffer {
  private bufferSize: number;
  private frames: MotionFrame[] = [];
  private previousMotionFeatures: MotionFeatures | null = null;
  private previousKinematics: Map<string, KinematicFeatures> = new Map();

  // Joint trajectory histories
  private trajectories: Map<string, TrajectoryPoint[]> = new Map();
  private maxTrajectoryLength: number = 30;

  // Smoothing Configuration & State
  private smoothingConfig: LandmarkSmoothingConfig = {
    algorithm: 'adaptive_ema',
    emaAlpha: 0.65,
    minAlpha: 0.35,
    maxAlpha: 0.95,
    velocityCutoff: 0.015,
    kalmanR: 0.005,
    kalmanQ: 0.0001,
    smoothingFactors: {
      normal: 0.70,
      fast: 0.35,
      veryFast: 0.15,
    },
  };

  private poseFilterStates: Map<number, LandmarkFilterState> = new Map();
  private leftHandFilterStates: Map<number, LandmarkFilterState> = new Map();
  private rightHandFilterStates: Map<number, LandmarkFilterState> = new Map();

  private smoothedPose: BodyLandmark[] = [];
  private smoothedLeftHand: FingerLandmark[] = [];
  private smoothedRightHand: FingerLandmark[] = [];

  // Minimum visibility threshold for landmark kinematic inclusion
  private readonly MIN_VISIBILITY = 0.40;

  // Calibration & Performance state
  private calibration: DeviceMotionCalibration = {
    actualFPS: 30,
    frameIntervalMs: 33.3,
    landmarkStability: 0.95,
    cameraResolution: '1280x720',
    bodyScale: 0.35,
    calibratedAt: 0,
    isCalibrated: false,
  };
  private calibrationSamples: number[] = [];

  private framePerformance: FramePerformance = {
    expectedFrames: 0,
    processedFrames: 0,
    droppedFrames: 0,
    actualFPS: 30,
    quality: 'Excellent',
    message: 'Initializing motion tracking...',
  };
  private lastProcessedTimestamp: number = 0;
  private frameCount: number = 0;
  private droppedCount: number = 0;

  // Motion blur and high-speed event tracking
  private lastMotionBlurState: 'OPTIMAL' | 'RAPID_MOTION_LOW_CONFIDENCE' | 'RAPID_MOTION_RESTORED' = 'OPTIMAL';
  private latestHighSpeedEvent: HighSpeedMovementEvent | null = null;

  constructor(bufferSize: number = 60, smoothingConfig?: Partial<LandmarkSmoothingConfig>) {
    this.bufferSize = bufferSize;
    if (smoothingConfig) {
      this.smoothingConfig = { ...this.smoothingConfig, ...smoothingConfig };
    }
  }

  public setSmoothingConfig(config: Partial<LandmarkSmoothingConfig>): void {
    this.smoothingConfig = { ...this.smoothingConfig, ...config };
  }

  public getSmoothingConfig(): LandmarkSmoothingConfig {
    return { ...this.smoothingConfig };
  }

  public getCalibration(): DeviceMotionCalibration {
    return { ...this.calibration };
  }

  public getFramePerformance(): FramePerformance {
    return { ...this.framePerformance };
  }

  public getLatestHighSpeedEvent(): HighSpeedMovementEvent | null {
    return this.latestHighSpeedEvent;
  }

  /**
   * Applies the selected smoothing algorithm (Adaptive EMA, Standard EMA, or Kalman) to a 1D scalar.
   */
  private smoothCoordinate(
    currentVal: number,
    state: LandmarkFilterState,
    coordKey: 'x' | 'y' | 'z' | 'visibility',
    now: number,
    velocityAlpha: number
  ): number {
    const { algorithm, emaAlpha = 0.65, kalmanR = 0.005, kalmanQ = 0.0001 } = this.smoothingConfig;

    if (algorithm === 'none') {
      return currentVal;
    }

    if (algorithm === 'adaptive_ema') {
      const prevVal = (state as any)[coordKey] ?? currentVal;
      return velocityAlpha * currentVal + (1 - velocityAlpha) * prevVal;
    }

    if (algorithm === 'ema') {
      const prevVal = (state as any)[coordKey] ?? currentVal;
      return emaAlpha * currentVal + (1 - emaAlpha) * prevVal;
    }

    if (algorithm === 'kalman') {
      const kalmanKey = ('kalman' + coordKey.charAt(0).toUpperCase() + coordKey.slice(1)) as keyof LandmarkFilterState;
      let kState = (state as any)[kalmanKey] as KalmanState1D | undefined;

      if (!kState) {
        kState = { estimate: currentVal, errorCovariance: 1.0 };
        (state as any)[kalmanKey] = kState;
        return currentVal;
      }

      // Prediction step
      const pPredict = kState.errorCovariance + kalmanQ;

      // Update step
      const kalmanGain = pPredict / (pPredict + kalmanR);
      const estimate = kState.estimate + kalmanGain * (currentVal - kState.estimate);
      const errorCovariance = (1 - kalmanGain) * pPredict;

      kState.estimate = estimate;
      kState.errorCovariance = errorCovariance;

      return estimate;
    }

    return currentVal;
  }

  /**
   * Smooths 33 body pose landmarks using temporal filtering with velocity-adapted response.
   */
  private smoothPoseLandmarks(landmarks: BodyLandmark[], now: number): BodyLandmark[] {
    if (!landmarks || landmarks.length === 0) {
      this.poseFilterStates.clear();
      return [];
    }

    if (this.smoothingConfig.algorithm === 'none') {
      return landmarks.map((lm) => ({ ...lm }));
    }

    const { minAlpha = 0.35, maxAlpha = 0.95, velocityCutoff = 0.015 } = this.smoothingConfig;

    return landmarks.map((lm, idx) => {
      let state = this.poseFilterStates.get(idx);
      const isStale = !state || now - state.lastUpdated > 350;

      if (isStale || !state) {
        state = {
          x: lm.x,
          y: lm.y,
          z: lm.z,
          visibility: lm.visibility,
          lastUpdated: now,
        };
        this.poseFilterStates.set(idx, state);
        return { ...lm };
      }

      // Compute velocity/distance from previous estimate for adaptive EMA
      const dx = lm.x - state.x;
      const dy = lm.y - state.y;
      const dz = (lm.z ?? 0) - state.z;
      const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);

      const velRatio = Math.min(1.0, dist / Math.max(0.001, velocityCutoff));
      // Adaptive alpha: higher when moving fast (up to maxAlpha 0.95) to prevent lag,
      // lower when static (down to minAlpha 0.35) to eliminate jitter
      const velocityAlpha = minAlpha + velRatio * (maxAlpha - minAlpha);

      const smoothX = this.smoothCoordinate(lm.x, state, 'x', now, velocityAlpha);
      const smoothY = this.smoothCoordinate(lm.y, state, 'y', now, velocityAlpha);
      const smoothZ = this.smoothCoordinate(lm.z ?? 0, state, 'z', now, velocityAlpha);
      const smoothVis = this.smoothCoordinate(lm.visibility ?? 1.0, state, 'visibility', now, 0.5);

      state.x = smoothX;
      state.y = smoothY;
      state.z = smoothZ;
      state.visibility = smoothVis;
      state.lastUpdated = now;

      return {
        ...lm,
        x: smoothX,
        y: smoothY,
        z: smoothZ,
        visibility: smoothVis,
      };
    });
  }

  /**
   * Smooths 21 hand landmarks using temporal filtering.
   */
  private smoothHandLandmarks(
    landmarks: FingerLandmark[] | undefined,
    filterStates: Map<number, LandmarkFilterState>,
    now: number
  ): FingerLandmark[] {
    if (!landmarks || landmarks.length === 0) {
      filterStates.clear();
      return [];
    }

    if (this.smoothingConfig.algorithm === 'none') {
      return landmarks.map((lm) => ({ ...lm }));
    }

    const { minAlpha = 0.35, maxAlpha = 0.95, velocityCutoff = 0.015 } = this.smoothingConfig;

    return landmarks.map((lm, idx) => {
      let state = filterStates.get(idx);
      const isStale = !state || now - state.lastUpdated > 350;

      if (isStale || !state) {
        state = {
          x: lm.x,
          y: lm.y,
          z: lm.z ?? 0,
          lastUpdated: now,
        };
        filterStates.set(idx, state);
        return { ...lm };
      }

      // Compute velocity/distance from previous estimate
      const dx = lm.x - state.x;
      const dy = lm.y - state.y;
      const dz = (lm.z ?? 0) - state.z;
      const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);

      const velRatio = Math.min(1.0, dist / Math.max(0.001, velocityCutoff));
      const velocityAlpha = minAlpha + velRatio * (maxAlpha - minAlpha);

      const smoothX = this.smoothCoordinate(lm.x, state, 'x', now, velocityAlpha);
      const smoothY = this.smoothCoordinate(lm.y, state, 'y', now, velocityAlpha);
      const smoothZ = this.smoothCoordinate(lm.z ?? 0, state, 'z', now, velocityAlpha);

      state.x = smoothX;
      state.y = smoothY;
      state.z = smoothZ;
      state.lastUpdated = now;

      return {
        ...lm,
        x: smoothX,
        y: smoothY,
        z: smoothZ,
      };
    });
  }

  /**
   * Adds a high-speed timestamped video frame to the temporal buffer.
   * Frame drops and actual inter-frame timing (dt) are recorded and calibrated.
   */
  addFrame(
    timestamp: number,
    poseLandmarks: BodyLandmark[],
    leftHandLandmarks?: FingerLandmark[],
    rightHandLandmarks?: FingerLandmark[]
  ): void {
    // 1. Calculate actual elapsed time (dt)
    if (this.lastProcessedTimestamp > 0) {
      const dtMs = timestamp - this.lastProcessedTimestamp;
      if (dtMs > 0) {
        this.calibrationSamples.push(dtMs);
        if (this.calibrationSamples.length > 40) {
          this.calibrationSamples.shift();
        }

        // Expected interval ~16.6ms (60 FPS) or ~33.3ms (30 FPS)
        const avgDt = this.calibrationSamples.reduce((a, b) => a + b, 0) / this.calibrationSamples.length;
        const actualFPS = Math.round(1000 / Math.max(1, avgDt));

        // Detect dropped frames if dt is significantly higher than average interval
        const expectedInterval = Math.max(12, avgDt);
        if (dtMs > expectedInterval * 1.75) {
          const estimatedDropped = Math.floor(dtMs / expectedInterval) - 1;
          this.droppedCount += Math.max(1, estimatedDropped);
        }

        this.frameCount++;
        const dropRatio = this.droppedCount / Math.max(1, this.frameCount);
        const quality: 'Excellent' | 'Good' | 'Reduced' =
          dropRatio < 0.08 ? 'Excellent' : dropRatio < 0.25 ? 'Good' : 'Reduced';

        this.framePerformance = {
          expectedFrames: this.frameCount + this.droppedCount,
          processedFrames: this.frameCount,
          droppedFrames: this.droppedCount,
          actualFPS,
          quality,
          message:
            quality === 'Reduced'
              ? 'Motion tracking quality: Reduced (Frame drops detected)'
              : quality === 'Good'
              ? 'Motion tracking quality: Good'
              : 'Motion tracking quality: Excellent',
        };

        if (!this.calibration.isCalibrated && this.calibrationSamples.length >= 25) {
          const bodyScale = calculateBodyScale(poseLandmarks);
          this.calibration = {
            actualFPS,
            frameIntervalMs: Math.round(avgDt * 10) / 10,
            landmarkStability: 0.96,
            cameraResolution: '1280x720',
            bodyScale: Math.round(bodyScale * 100) / 100,
            calibratedAt: timestamp,
            isCalibrated: true,
          };
        }
      }
    }
    this.lastProcessedTimestamp = timestamp;

    // 2. Apply landmark smoothing
    this.smoothedPose = this.smoothPoseLandmarks(poseLandmarks, timestamp);
    this.smoothedLeftHand = this.smoothHandLandmarks(leftHandLandmarks, this.leftHandFilterStates, timestamp);
    this.smoothedRightHand = this.smoothHandLandmarks(rightHandLandmarks, this.rightHandFilterStates, timestamp);

    // 3. Buffer the frame with smoothed landmarks
    const framePose = this.smoothedPose.length > 0 ? this.smoothedPose : poseLandmarks;
    const frameLeft = this.smoothedLeftHand.length > 0 ? this.smoothedLeftHand : leftHandLandmarks;
    const frameRight = this.smoothedRightHand.length > 0 ? this.smoothedRightHand : rightHandLandmarks;

    this.frames.push({
      timestamp,
      poseLandmarks: framePose,
      leftHandLandmarks: frameLeft,
      rightHandLandmarks: frameRight,
    });

    if (this.frames.length > this.bufferSize) {
      this.frames.shift();
    }

    // 4. Update Rolling Trajectories
    this.updateJointTrajectories(timestamp, framePose, frameLeft, frameRight);
  }

  private updateJointTrajectories(
    timestamp: number,
    pose: BodyLandmark[],
    leftHand?: FingerLandmark[],
    rightHand?: FingerLandmark[]
  ): void {
    if (!pose || pose.length < 33) return;

    const jointMap: Record<string, Point | null> = {
      leftWrist: pose[15] && (pose[15].visibility ?? 1) >= this.MIN_VISIBILITY ? pose[15] : null,
      rightWrist: pose[16] && (pose[16].visibility ?? 1) >= this.MIN_VISIBILITY ? pose[16] : null,
      leftElbow: pose[13] && (pose[13].visibility ?? 1) >= this.MIN_VISIBILITY ? pose[13] : null,
      rightElbow: pose[14] && (pose[14].visibility ?? 1) >= this.MIN_VISIBILITY ? pose[14] : null,
      leftShoulder: pose[11] && (pose[11].visibility ?? 1) >= this.MIN_VISIBILITY ? pose[11] : null,
      rightShoulder: pose[12] && (pose[12].visibility ?? 1) >= this.MIN_VISIBILITY ? pose[12] : null,
      leftHip: pose[23] && (pose[23].visibility ?? 1) >= this.MIN_VISIBILITY ? pose[23] : null,
      rightHip: pose[24] && (pose[24].visibility ?? 1) >= this.MIN_VISIBILITY ? pose[24] : null,
      leftKnee: pose[25] && (pose[25].visibility ?? 1) >= this.MIN_VISIBILITY ? pose[25] : null,
      rightKnee: pose[26] && (pose[26].visibility ?? 1) >= this.MIN_VISIBILITY ? pose[26] : null,
      leftAnkle: pose[27] && (pose[27].visibility ?? 1) >= this.MIN_VISIBILITY ? pose[27] : null,
      rightAnkle: pose[28] && (pose[28].visibility ?? 1) >= this.MIN_VISIBILITY ? pose[28] : null,
      leftFoot: pose[31] && (pose[31].visibility ?? 1) >= this.MIN_VISIBILITY ? pose[31] : null,
      rightFoot: pose[32] && (pose[32].visibility ?? 1) >= this.MIN_VISIBILITY ? pose[32] : null,
      bodyCenter:
        pose[23] && pose[24]
          ? {
              x: (pose[23].x + pose[24].x) / 2,
              y: (pose[23].y + pose[24].y) / 2,
              z: ((pose[23].z ?? 0) + (pose[24].z ?? 0)) / 2,
            }
          : null,
      leftHand: leftHand && leftHand.length > 0 ? leftHand[0] : null,
      rightHand: rightHand && rightHand.length > 0 ? rightHand[0] : null,
    };

    for (const [jointName, point] of Object.entries(jointMap)) {
      if (!point) continue;

      let history = this.trajectories.get(jointName);
      if (!history) {
        history = [];
        this.trajectories.set(jointName, history);
      }

      history.push({
        x: point.x,
        y: point.y,
        timestamp,
      });

      if (history.length > this.maxTrajectoryLength) {
        history.shift();
      }
    }
  }

  getSmoothedPose(): BodyLandmark[] {
    return this.smoothedPose;
  }

  getSmoothedLeftHand(): FingerLandmark[] {
    return this.smoothedLeftHand;
  }

  getSmoothedRightHand(): FingerLandmark[] {
    return this.smoothedRightHand;
  }

  getLatestSmoothedFrame(): {
    pose: BodyLandmark[];
    leftHand: FingerLandmark[];
    rightHand: FingerLandmark[];
  } {
    return {
      pose: this.smoothedPose,
      leftHand: this.smoothedLeftHand,
      rightHand: this.smoothedRightHand,
    };
  }

  getFrames(): MotionFrame[] {
    return this.frames;
  }

  getRecentFrames(count: number): MotionFrame[] {
    return this.frames.slice(-count);
  }

  getJointTrajectory(jointName: TrackedJointName): JointTrajectory | null {
    const points = this.trajectories.get(jointName);
    if (!points || points.length < 2) return null;

    let totalDist = 0;
    let directionChanges = 0;
    let prevAngle: number | null = null;

    for (let i = 1; i < points.length; i++) {
      const p1 = points[i - 1];
      const p2 = points[i];
      const dist = Math.sqrt((p2.x - p1.x) ** 2 + (p2.y - p1.y) ** 2);
      totalDist += dist;

      const angle = Math.atan2(p2.y - p1.y, p2.x - p1.x);
      if (prevAngle !== null) {
        let diff = Math.abs(angle - prevAngle);
        if (diff > Math.PI) diff = 2 * Math.PI - diff;
        if (diff > Math.PI / 2) {
          directionChanges++;
        }
      }
      prevAngle = angle;
    }

    const duration = Math.max(0.01, (points[points.length - 1].timestamp - points[0].timestamp) / 1000);
    const bodyScale = this.calibration.bodyScale || 0.35;

    return {
      jointName,
      points,
      totalDistance: totalDist,
      normalizedRate: (totalDist / bodyScale) / duration,
      directionChangeCount: directionChanges,
    };
  }

  clear(): void {
    this.frames = [];
    this.previousMotionFeatures = null;
    this.previousKinematics.clear();
    this.trajectories.clear();
    this.poseFilterStates.clear();
    this.leftHandFilterStates.clear();
    this.rightHandFilterStates.clear();
    this.smoothedPose = [];
    this.smoothedLeftHand = [];
    this.smoothedRightHand = [];
    this.calibrationSamples = [];
    this.frameCount = 0;
    this.droppedCount = 0;
    this.latestHighSpeedEvent = null;
  }

  /**
   * Computes comprehensive high-speed temporal motion measurements:
   * 1. Real elapsed time dt (never assuming 30 FPS)
   * 2. Body-scale invariant joint velocities & accelerations
   * 3. Movement directions and trajectory analysis
   * 4. Multi-feature MotionScore & Adaptive speed classification (STATIC -> VERY_FAST)
   * 5. High-speed movement event emission prioritizing extremities (hands, feet, ankles, wrists)
   * 6. Motion blur & confidence degradation monitoring
   */
  computeMotionFeatures(): MotionFeatures {
    const defaultScore: MotionScore = {
      velocityScore: 0,
      accelerationScore: 0,
      trajectoryScore: 0,
      directionChangeScore: 0,
      overallScore: 0,
    };

    if (this.frames.length < 2) {
      return {
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
        motionScore: defaultScore,
        bodyScale: this.calibration.bodyScale || 0.35,
        isMotionBlurred: false,
        blurStatus: 'OPTIMAL',
        blurMessage: 'Tracking stable',
        highSpeedEvent: null,
      };
    }

    const latest = this.frames[this.frames.length - 1];
    const prev = this.frames[this.frames.length - 2];

    // High-resolution elapsed time in seconds (strictly based on timestamps)
    const deltaTime = Math.max(0.005, (latest.timestamp - prev.timestamp) / 1000);

    const currPose = latest.poseLandmarks;
    const prevPose = prev.poseLandmarks;

    if (!currPose || !prevPose || currPose.length < 33 || prevPose.length < 33) {
      return {
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
        motionScore: defaultScore,
        bodyScale: this.calibration.bodyScale || 0.35,
        isMotionBlurred: false,
        blurStatus: 'OPTIMAL',
        blurMessage: 'Standing by for pose landmarks',
        highSpeedEvent: null,
      };
    }

    // 1. Stable Body Scale Normalization
    const bodyScale = calculateBodyScale(currPose);

    // 2. Kinematic Feature Extraction for Tracked Joints
    const kinematics: Record<string, KinematicFeatures> = {};

    const evaluateJointKinematics = (
      name: TrackedJointName,
      currPt: Point | null,
      prevPt: Point | null
    ): { vel: number; acc: number; dir: number } => {
      if (!currPt || !prevPt || (currPt.visibility ?? 1) < this.MIN_VISIBILITY || (prevPt.visibility ?? 1) < this.MIN_VISIBILITY) {
        return { vel: 0, acc: 0, dir: 0 };
      }

      const rawVel = calculateVelocity(currPt, prevPt, deltaTime);
      const normalizedVel = rawVel / bodyScale;
      const dir = calculateDirection(currPt, prevPt);

      const prevKin = this.previousKinematics.get(name);
      const prevVel = prevKin ? prevKin.velocity : normalizedVel;
      const acc = (normalizedVel - prevVel) / deltaTime;

      kinematics[name] = {
        position: { x: currPt.x, y: currPt.y, z: currPt.z },
        velocity: normalizedVel,
        acceleration: acc,
        direction: dir,
        timestamp: latest.timestamp,
      };

      this.previousKinematics.set(name, kinematics[name]);
      return { vel: normalizedVel, acc, dir };
    };

    // Wrist kinematics
    const leftWristKin = evaluateJointKinematics('leftWrist', currPose[15], prevPose[15]);
    const rightWristKin = evaluateJointKinematics('rightWrist', currPose[16], prevPose[16]);
    const wristVelocity = Math.max(leftWristKin.vel, rightWristKin.vel) * 0.7 + ((leftWristKin.vel + rightWristKin.vel) / 2) * 0.3;

    // Elbow kinematics
    const leftElbowKin = evaluateJointKinematics('leftElbow', currPose[13], prevPose[13]);
    const rightElbowKin = evaluateJointKinematics('rightElbow', currPose[14], prevPose[14]);
    const elbowVelocity = (leftElbowKin.vel + rightElbowKin.vel) / 2;

    // Shoulder kinematics
    const leftShoulderKin = evaluateJointKinematics('leftShoulder', currPose[11], prevPose[11]);
    const rightShoulderKin = evaluateJointKinematics('rightShoulder', currPose[12], prevPose[12]);
    const shoulderVelocity = (leftShoulderKin.vel + rightShoulderKin.vel) / 2;

    // Hip kinematics
    const currMidHip = {
      x: (currPose[23].x + currPose[24].x) / 2,
      y: (currPose[23].y + currPose[24].y) / 2,
      visibility: Math.min(currPose[23].visibility ?? 1, currPose[24].visibility ?? 1),
    };
    const prevMidHip = {
      x: (prevPose[23].x + prevPose[24].x) / 2,
      y: (prevPose[23].y + prevPose[24].y) / 2,
      visibility: Math.min(prevPose[23].visibility ?? 1, prevPose[24].visibility ?? 1),
    };
    const hipKin = evaluateJointKinematics('bodyCenter', currMidHip, prevMidHip);
    const hipVelocity = hipKin.vel;

    // Knee kinematics
    const leftKneeKin = evaluateJointKinematics('leftKnee', currPose[25], prevPose[25]);
    const rightKneeKin = evaluateJointKinematics('rightKnee', currPose[26], prevPose[26]);
    const kneeVelocity = (leftKneeKin.vel + rightKneeKin.vel) / 2;

    // Ankle & Foot kinematics
    const leftAnkleKin = evaluateJointKinematics('leftAnkle', currPose[27], prevPose[27]);
    const rightAnkleKin = evaluateJointKinematics('rightAnkle', currPose[28], prevPose[28]);
    const ankleVelocity = (leftAnkleKin.vel + rightAnkleKin.vel) / 2;

    const leftFootKin = evaluateJointKinematics('leftFoot', currPose[31], prevPose[31]);
    const rightFootKin = evaluateJointKinematics('rightFoot', currPose[32], prevPose[32]);
    const footVelocity = Math.max(leftFootKin.vel, rightFootKin.vel);

    // Hand extremities kinematics
    const leftHandKin = evaluateJointKinematics(
      'leftHand',
      latest.leftHandLandmarks?.[0] ? latest.leftHandLandmarks[0] : null,
      prev.leftHandLandmarks?.[0] ? prev.leftHandLandmarks[0] : null
    );
    const rightHandKin = evaluateJointKinematics(
      'rightHand',
      latest.rightHandLandmarks?.[0] ? latest.rightHandLandmarks[0] : null,
      prev.rightHandLandmarks?.[0] ? prev.rightHandLandmarks[0] : null
    );
    const handVelocity = Math.max(leftHandKin.vel, rightHandKin.vel);

    // 3. Multi-Joint Weighted Root Velocity & Acceleration
    const rootVelocity =
      hipVelocity * 0.25 +
      shoulderVelocity * 0.20 +
      wristVelocity * 0.25 +
      ankleVelocity * 0.20 +
      footVelocity * 0.10;

    const prevVel = this.previousMotionFeatures ? this.previousMotionFeatures.velocity : rootVelocity;
    const acceleration = (rootVelocity - prevVel) / deltaTime;

    // 4. Direction of primary kinetic movement
    let primaryDirection = hipKin.dir;
    if (wristVelocity > rootVelocity * 1.3) {
      primaryDirection = leftWristKin.vel > rightWristKin.vel ? leftWristKin.dir : rightWristKin.dir;
    } else if (ankleVelocity > rootVelocity * 1.3) {
      primaryDirection = leftAnkleKin.vel > rightAnkleKin.vel ? leftAnkleKin.dir : rightAnkleKin.dir;
    }

    // 5. Body Rotation Velocity around vertical axis
    const prevShoulderDiff = prevPose[12].x - prevPose[11].x;
    const currShoulderDiff = currPose[12].x - currPose[11].x;
    const bodyRotation = (Math.abs(currShoulderDiff - prevShoulderDiff) / bodyScale / deltaTime) * 180;

    // 6. Trajectory Length & Direction Change Scoring
    let totalTrajectoryScore = 0;
    let directionChangeCount = 0;
    let trackedJointCount = 0;

    for (const jointName of TRACKED_JOINTS) {
      const traj = this.getJointTrajectory(jointName);
      if (traj) {
        totalTrajectoryScore += Math.min(1.0, traj.normalizedRate / 3.0);
        directionChangeCount += traj.directionChangeCount;
        trackedJointCount++;
      }
    }

    const avgTrajectoryScore = trackedJointCount > 0 ? totalTrajectoryScore / trackedJointCount : 0;
    const directionChangeScore = Math.min(1.0, directionChangeCount / 6.0);
    const velocityScore = Math.min(1.0, rootVelocity / 2.2);
    const accelerationScore = Math.min(1.0, Math.abs(acceleration) / 5.0);

    // Multi-feature Motion Score
    const overallMotionScore =
      velocityScore * 0.40 +
      accelerationScore * 0.25 +
      avgTrajectoryScore * 0.20 +
      directionChangeScore * 0.15;

    const motionScore: MotionScore = {
      velocityScore: Math.round(velocityScore * 100) / 100,
      accelerationScore: Math.round(accelerationScore * 100) / 100,
      trajectoryScore: Math.round(avgTrajectoryScore * 100) / 100,
      directionChangeScore: Math.round(directionChangeScore * 100) / 100,
      overallScore: Math.round(overallMotionScore * 100) / 100,
    };

    // 7. Motion Speed Categorization & Adaptive High-Speed Mode
    let speedCategory: MotionSpeed = 'STATIC';
    let motionMode: MotionMode = 'NORMAL';

    if (overallMotionScore < 0.10 && rootVelocity < 0.15) {
      speedCategory = 'STATIC';
      motionMode = 'NORMAL';
    } else if (overallMotionScore < 0.28 && rootVelocity < 0.45) {
      speedCategory = 'SLOW';
      motionMode = 'NORMAL';
    } else if (overallMotionScore < 0.58 && rootVelocity < 1.15) {
      speedCategory = 'NORMAL';
      motionMode = 'NORMAL';
    } else if (overallMotionScore < 0.82 && rootVelocity < 2.1) {
      speedCategory = 'FAST';
      motionMode = 'FAST';
    } else {
      speedCategory = 'VERY_FAST';
      motionMode = 'VERY_FAST';
    }

    // 8. Extremity Prioritization List during rapid dance movements
    const activeJointPriorities: string[] = [];
    if (motionMode === 'VERY_FAST' || motionMode === 'FAST') {
      // Prioritize wrists, hands, ankles, feet, knees, elbows
      if (wristVelocity > 0.8) activeJointPriorities.push('wrists');
      if (handVelocity > 0.8) activeJointPriorities.push('hands');
      if (footVelocity > 0.8) activeJointPriorities.push('feet');
      if (ankleVelocity > 0.8) activeJointPriorities.push('ankles');
      if (kneeVelocity > 0.8) activeJointPriorities.push('knees');
      if (elbowVelocity > 0.8) activeJointPriorities.push('elbows');
    }

    // 9. Motion Blur & Tracking Confidence Monitoring
    const avgPoseConfidence =
      currPose.reduce((acc, pt) => acc + (pt.visibility ?? 1), 0) / currPose.length;
    const avgHandConfidence =
      ((latest.leftHandLandmarks?.length ? 1 : 0) + (latest.rightHandLandmarks?.length ? 1 : 0)) / 2;

    const isHighSpeed = rootVelocity > 1.3 || wristVelocity > 1.5 || footVelocity > 1.5;
    const isConfidenceLow = avgPoseConfidence < 0.65 || (avgHandConfidence < 0.5 && (latest.leftHandLandmarks || latest.rightHandLandmarks));

    let blurStatus: 'OPTIMAL' | 'RAPID_MOTION_LOW_CONFIDENCE' | 'RAPID_MOTION_RESTORED' = 'OPTIMAL';
    let blurMessage = 'Tracking optimal';
    let isMotionBlurred = false;

    if (isHighSpeed && isConfidenceLow) {
      blurStatus = 'RAPID_MOTION_LOW_CONFIDENCE';
      blurMessage = 'RAPID MOTION — LOW TRACKING CONFIDENCE';
      isMotionBlurred = true;
      this.lastMotionBlurState = blurStatus;
    } else if (this.lastMotionBlurState === 'RAPID_MOTION_LOW_CONFIDENCE' && !isConfidenceLow) {
      blurStatus = 'RAPID_MOTION_RESTORED';
      blurMessage = 'RAPID MOTION TRACKING RESTORED';
      this.lastMotionBlurState = 'OPTIMAL';
    }

    // 10. Generate High-Speed Movement Event when speed is FAST or VERY_FAST
    let highSpeedEvent: HighSpeedMovementEvent | null = null;
    if (motionMode === 'FAST' || motionMode === 'VERY_FAST') {
      const affectedJoints: string[] = [];
      if (leftWristKin.vel > 0.9) affectedJoints.push('leftWrist');
      if (rightWristKin.vel > 0.9) affectedJoints.push('rightWrist');
      if (leftAnkleKin.vel > 0.9) affectedJoints.push('leftAnkle');
      if (rightAnkleKin.vel > 0.9) affectedJoints.push('rightAnkle');
      if (leftFootKin.vel > 0.9) affectedJoints.push('leftFoot');
      if (rightFootKin.vel > 0.9) affectedJoints.push('rightFoot');
      if (leftElbowKin.vel > 0.9) affectedJoints.push('leftElbow');
      if (rightElbowKin.vel > 0.9) affectedJoints.push('rightElbow');
      if (leftKneeKin.vel > 0.9) affectedJoints.push('leftKnee');
      if (rightKneeKin.vel > 0.9) affectedJoints.push('rightKnee');

      const primaryJoint = affectedJoints[0] || 'bodyCenter';
      const trajPoints = this.trajectories.get(primaryJoint) || [];

      highSpeedEvent = {
        timestamp: latest.timestamp,
        affectedJoints: affectedJoints.length > 0 ? affectedJoints : ['bodyCenter'],
        speed: Math.round(rootVelocity * 100) / 100,
        acceleration: Math.round(acceleration * 100) / 100,
        direction: Math.round(primaryDirection * 100) / 100,
        motionLevel: motionMode,
        trackingConfidence: Math.round(avgPoseConfidence * 100) / 100,
        trajectory: trajPoints.slice(-10),
      };
      this.latestHighSpeedEvent = highSpeedEvent;
    } else {
      this.latestHighSpeedEvent = null;
    }

    // Effective Adaptive EMA alpha factor
    const effectiveAlpha =
      motionMode === 'VERY_FAST'
        ? 0.92
        : motionMode === 'FAST'
        ? 0.82
        : speedCategory === 'NORMAL'
        ? 0.65
        : 0.40;

    const motionFeatures: MotionFeatures = {
      velocity: Math.round(rootVelocity * 100) / 100,
      acceleration: Math.round(acceleration * 100) / 100,
      direction: Math.round(primaryDirection * 100) / 100,
      wristVelocity: Math.round(wristVelocity * 100) / 100,
      leftWristVelocity: Math.round(leftWristKin.vel * 100) / 100,
      rightWristVelocity: Math.round(rightWristKin.vel * 100) / 100,
      handVelocity: Math.round(handVelocity * 100) / 100,
      elbowVelocity: Math.round(elbowVelocity * 100) / 100,
      leftElbowVelocity: Math.round(leftElbowKin.vel * 100) / 100,
      rightElbowVelocity: Math.round(rightElbowKin.vel * 100) / 100,
      shoulderVelocity: Math.round(shoulderVelocity * 100) / 100,
      leftShoulderVelocity: Math.round(leftShoulderKin.vel * 100) / 100,
      rightShoulderVelocity: Math.round(rightShoulderKin.vel * 100) / 100,
      hipVelocity: Math.round(hipVelocity * 100) / 100,
      kneeVelocity: Math.round(kneeVelocity * 100) / 100,
      leftKneeVelocity: Math.round(leftKneeKin.vel * 100) / 100,
      rightKneeVelocity: Math.round(rightKneeKin.vel * 100) / 100,
      ankleVelocity: Math.round(ankleVelocity * 100) / 100,
      leftAnkleVelocity: Math.round(leftAnkleKin.vel * 100) / 100,
      rightAnkleVelocity: Math.round(rightAnkleKin.vel * 100) / 100,
      footVelocity: Math.round(footVelocity * 100) / 100,
      bodyCenterVelocity: Math.round(hipKin.vel * 100) / 100,
      bodyRotation: Math.round(bodyRotation * 10) / 10,
      speedCategory,
      motionMode,
      motionScore,
      bodyScale: Math.round(bodyScale * 100) / 100,
      isMotionBlurred,
      blurStatus,
      blurMessage,
      kinematics,
      highSpeedEvent,
      activeJointPriorities,
      effectiveAlpha,
    };

    this.previousMotionFeatures = motionFeatures;
    return motionFeatures;
  }
}

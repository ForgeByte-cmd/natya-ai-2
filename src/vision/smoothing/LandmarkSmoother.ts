/**
 * LandmarkSmoother.ts
 * Master smoothing coordinator for full-body dance pose and bilateral hand tracking.
 * Provides adaptive low-latency One Euro filtering, predictive latency compensation,
 * and smooth fading movement trails.
 */

import { BodyLandmark } from '../../types/pose';
import { FingerLandmark } from '../../types/mudra';
import { AdaptiveSmoother } from './AdaptiveSmoother';
import { LowLatencyStabilizer, HandTrackingState } from '../VisionCore';
import { FilterProfileConfig, VISION_CONFIG } from '../../config/vision';

export interface TrailPoint {
  x: number;
  y: number;
  timestamp: number;
  alpha: number; // 0..1 fading opacity
}

export interface JointTrail {
  jointName: string;
  points: TrailPoint[];
  color: string;
}

export class LandmarkSmoother {
  private bodySmoother: AdaptiveSmoother<BodyLandmark>;
  private leftHandStabilizer: LowLatencyStabilizer;
  private rightHandStabilizer: LowLatencyStabilizer;

  // Movement trails
  private trails: Map<string, TrailPoint[]> = new Map();
  private maxTrailPoints: number = VISION_CONFIG.trails.maxTrailPoints;
  private decayDurationMs: number = VISION_CONFIG.trails.decayDurationMs;

  constructor() {
    this.bodySmoother = new AdaptiveSmoother<BodyLandmark>('body');
    this.leftHandStabilizer = new LowLatencyStabilizer('Left');
    this.rightHandStabilizer = new LowLatencyStabilizer('Right');
  }

  /**
   * Main entry point: smoothly filters raw MediaPipe landmarks for visual overlay rendering.
   * Body receives posture-stabilized filtering; hands receive ultra-low-latency velocity-adaptive stabilization.
   */
  public update(
    rawPose: BodyLandmark[],
    rawLeftHand?: FingerLandmark[],
    rawRightHand?: FingerLandmark[],
    timestamp: number = performance.now()
  ): {
    pose: BodyLandmark[];
    leftHand: FingerLandmark[];
    rightHand: FingerLandmark[];
    leftHandState: HandTrackingState;
    rightHandState: HandTrackingState;
    trails: JointTrail[];
  } {
    // 1. Smooth body pose landmarks
    const smoothedPose = this.bodySmoother.update(rawPose, timestamp);

    // 2. Stabilize bilateral hand landmarks with LowLatencyStabilizer
    const smoothedLeftHand = this.leftHandStabilizer.update(rawLeftHand, timestamp);
    const smoothedRightHand = this.rightHandStabilizer.update(rawRightHand, timestamp);

    const leftHandState = this.leftHandStabilizer.getTrackingState();
    const rightHandState = this.rightHandStabilizer.getTrackingState();

    // 3. Update movement trails for rapid visual feedback
    this.updateTrails(smoothedPose, smoothedLeftHand, smoothedRightHand, timestamp);
    const activeTrails = this.getActiveTrails(timestamp);

    return {
      pose: smoothedPose,
      leftHand: smoothedLeftHand,
      rightHand: smoothedRightHand,
      leftHandState,
      rightHandState,
      trails: activeTrails,
    };
  }

  private updateTrails(
    pose: BodyLandmark[],
    leftHand: FingerLandmark[],
    rightHand: FingerLandmark[],
    now: number
  ): void {
    if (!VISION_CONFIG.trails.enabled) return;

    // Track wrists, ankles, and index fingertips for expressive dance motion trails
    const trackedPoints: { name: string; lm: { x: number; y: number; visibility?: number } | undefined; color: string }[] = [
      { name: 'leftWrist', lm: pose[15], color: '#38bdf8' },
      { name: 'rightWrist', lm: pose[16], color: '#f43f5e' },
      { name: 'leftAnkle', lm: pose[27], color: '#fbbf24' },
      { name: 'rightAnkle', lm: pose[28], color: '#fb923c' },
      { name: 'leftIndex', lm: leftHand[8], color: '#67e8f9' },
      { name: 'rightIndex', lm: rightHand[8], color: '#fda4af' },
    ];

    for (const item of trackedPoints) {
      if (!item.lm || (item.lm.visibility !== undefined && item.lm.visibility < 0.35)) {
        continue;
      }

      let history = this.trails.get(item.name);
      if (!history) {
        history = [];
        this.trails.set(item.name, history);
      }

      history.push({
        x: item.lm.x,
        y: item.lm.y,
        timestamp: now,
        alpha: 1.0,
      });

      // Limit length
      if (history.length > this.maxTrailPoints) {
        history.shift();
      }
    }
  }

  private getActiveTrails(now: number): JointTrail[] {
    if (!VISION_CONFIG.trails.enabled) return [];

    const result: JointTrail[] = [];
    const colorMap: Record<string, string> = {
      leftWrist: '#38bdf8',
      rightWrist: '#f43f5e',
      leftAnkle: '#fbbf24',
      rightAnkle: '#fb923c',
      leftIndex: '#67e8f9',
      rightIndex: '#fda4af',
    };

    for (const [name, points] of this.trails.entries()) {
      // Remove points older than decay duration
      const validPoints: TrailPoint[] = [];

      for (const p of points) {
        const age = now - p.timestamp;
        if (age < this.decayDurationMs) {
          const alpha = Math.max(0, 1.0 - age / this.decayDurationMs);
          validPoints.push({
            ...p,
            alpha,
          });
        }
      }

      this.trails.set(name, validPoints);

      if (validPoints.length >= 2) {
        result.push({
          jointName: name,
          points: validPoints,
          color: colorMap[name] || '#ffffff',
        });
      }
    }

    return result;
  }

  public setProfileConfig(profile: 'body' | 'hands', config: Partial<FilterProfileConfig>): void {
    if (profile === 'body') {
      this.bodySmoother.setConfig(config);
    }
  }

  public reset(): void {
    this.bodySmoother.reset();
    this.leftHandStabilizer.reset();
    this.rightHandStabilizer.reset();
    this.trails.clear();
  }
}

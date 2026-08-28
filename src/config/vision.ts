/**
 * Vision & Smoothing Configuration
 * Configurable parameters for adaptive One Euro Filtering, predictive latency compensation,
 * dead-zone jitter reduction, and movement trail visualization.
 */

export interface FilterProfileConfig {
  /** Minimum cutoff frequency in Hz. Lower = smoother when slow/still */
  minCutoff: number;
  /** Speed sensitivity coefficient (beta). Higher = faster response / less lag during rapid movement */
  beta: number;
  /** Cutoff frequency for derivative (velocity) estimation in Hz */
  dCutoff: number;
  /** Predictive latency compensation time in seconds (e.g. 0.018s = 18ms) */
  predictionTime: number;
  /** Maximum allowable prediction displacement distance (normalized 0..1) to prevent overshoot */
  maxPredictionDist: number;
  /** Normalized dead-zone threshold to eliminate micro-jitter during stillness */
  deadZone: number;
  /** Maximum grace period in ms to hold/predict lost landmarks before hiding */
  lostGracePeriodMs: number;
}

export interface VisionSmoothingConfig {
  body: FilterProfileConfig;
  hands: FilterProfileConfig;
  /** Visual movement trail settings */
  trails: {
    enabled: boolean;
    maxTrailPoints: number;
    decayDurationMs: number;
    joints: string[]; // e.g. ['leftWrist', 'rightWrist', 'leftFoot', 'rightFoot']
  };
}

export const VISION_CONFIG: VisionSmoothingConfig = {
  /**
   * Body Profile: Optimized for full-body stability and posture clarity (aramandi, natyarambha, etc.)
   * Stronger smoothing at low speeds; adapts smoothly during jumps and lunges.
   */
  body: {
    minCutoff: 0.9,       // Hz (smooth when standing or holding sthirata)
    beta: 0.008,          // Adapts quickly to whole-body turns, leaps, tatkar
    dCutoff: 1.0,         // Velocity filter cutoff
    predictionTime: 0.015,// 15ms display prediction compensation
    maxPredictionDist: 0.035, // Clamp prediction to 3.5% of frame
    deadZone: 0.0018,     // Normalized deadzone
    lostGracePeriodMs: 180, // Hold lost joints for up to 180ms
  },

  /**
   * Hands Profile: Ultra-responsive for rapid hasta mudra transitions (pataka, tripataka, kartarimukha, etc.)
   * Higher minCutoff and higher beta to eliminate visible hand lag.
   */
  hands: {
    minCutoff: 1.8,       // Hz (higher baseline response for fast fingers)
    beta: 0.022,          // Aggressive cutoff expansion during fast gestures
    dCutoff: 1.5,         // Responsive derivative estimation
    predictionTime: 0.020,// 20ms prediction for crisp hand alignment
    maxPredictionDist: 0.045, // Clamp prediction
    deadZone: 0.0012,     // Tighter deadzone for fine finger articulation
    lostGracePeriodMs: 150, // Hand lost grace period
  },

  /**
   * Movement Trails: Smooth fading particle/trajectory paths for fast movements
   */
  trails: {
    enabled: true,
    maxTrailPoints: 12,
    decayDurationMs: 350,
    joints: ['leftWrist', 'rightWrist', 'leftAnkle', 'rightAnkle', 'leftIndex', 'rightIndex'],
  },
};

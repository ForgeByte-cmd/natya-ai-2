/**
 * OneEuroFilter.ts
 * High-precision implementation of the 1€ Filter (Casiez et al., 2012)
 * for real-time adaptive noise filtering with ultra-low latency.
 *
 * Automatically balances jitter reduction at low speeds with lag-free
 * responsiveness during rapid dance movements.
 */

export interface OneEuroParams {
  /** Minimum cutoff frequency (Hz) - controls jitter at slow speeds */
  minCutoff: number;
  /** Speed coefficient - controls responsiveness at high speeds */
  beta: number;
  /** Derivative cutoff frequency (Hz) for velocity estimation */
  dCutoff: number;
}

export class OneEuroFilter {
  private minCutoff: number;
  private beta: number;
  private dCutoff: number;

  private xPrev: number | null = null;
  private dxPrev: number = 0;
  private tPrev: number | null = null;

  constructor(params: Partial<OneEuroParams> = {}) {
    this.minCutoff = params.minCutoff ?? 1.0;
    this.beta = params.beta ?? 0.01;
    this.dCutoff = params.dCutoff ?? 1.0;
  }

  /**
   * Calculates exponential smoothing factor alpha for a given cutoff frequency and delta time.
   * alpha = (2 * PI * fc * dt) / (1 + 2 * PI * fc * dt)
   */
  private computeAlpha(cutoff: number, dt: number): number {
    const tau = 1.0 / (2.0 * Math.PI * Math.max(0.0001, cutoff));
    return 1.0 / (1.0 + tau / dt);
  }

  /**
   * Updates the filter with a new measurement and timestamp (in milliseconds or seconds).
   * @param x Raw measurement value
   * @param timestamp Current timestamp (ms or sec)
   * @param confidence Optional measurement confidence (0..1)
   * @param deadZone Optional dead-zone threshold for micro-jitter suppression
   */
  filter(
    x: number,
    timestamp: number,
    confidence: number = 1.0,
    deadZone: number = 0
  ): number {
    // Standardize timestamp to seconds
    const tSec = timestamp > 1e11 ? timestamp / 1000 : timestamp > 1e7 ? timestamp / 1000 : timestamp;

    if (this.xPrev === null || this.tPrev === null) {
      this.xPrev = x;
      this.dxPrev = 0;
      this.tPrev = tSec;
      return x;
    }

    // Delta time in seconds
    let dt = tSec - this.tPrev;

    // Handle stale or reversed timestamps
    if (dt <= 0.0001) {
      dt = 0.016; // default fallback ~60fps
    } else if (dt > 0.4) {
      // Long interruption - reset filter state to prevent huge derivative spike
      this.xPrev = x;
      this.dxPrev = 0;
      this.tPrev = tSec;
      return x;
    }

    // 1. Dead-zone check for stationary micro-jitter removal
    if (deadZone > 0 && Math.abs(x - this.xPrev) < deadZone) {
      this.tPrev = tSec;
      return this.xPrev;
    }

    // 2. Estimate raw derivative (velocity)
    const rawDx = (x - this.xPrev) / dt;

    // 3. Filter derivative with fixed derivative cutoff dCutoff
    const alphaD = this.computeAlpha(this.dCutoff, dt);
    const filteredDx = alphaD * rawDx + (1.0 - alphaD) * this.dxPrev;
    this.dxPrev = filteredDx;

    // 4. Compute adaptive cutoff frequency based on movement speed:
    // fc = minCutoff + beta * |filteredDx|
    let adaptiveCutoff = this.minCutoff + this.beta * Math.abs(filteredDx);

    // 5. Confidence awareness: if confidence is low, pull cutoff towards minCutoff
    if (confidence < 0.6) {
      const confFactor = Math.max(0.1, confidence / 0.6);
      adaptiveCutoff = this.minCutoff + (adaptiveCutoff - this.minCutoff) * confFactor;
    }

    // 6. Filter position using the adaptive cutoff
    const alpha = this.computeAlpha(adaptiveCutoff, dt);
    const filteredX = alpha * x + (1.0 - alpha) * this.xPrev;

    this.xPrev = filteredX;
    this.tPrev = tSec;

    return filteredX;
  }

  /**
   * Returns the current estimated derivative (velocity in units/sec)
   */
  getVelocity(): number {
    return this.dxPrev;
  }

  /**
   * Returns the last filtered position
   */
  getValue(): number | null {
    return this.xPrev;
  }

  /**
   * Resets internal temporal state
   */
  reset(): void {
    this.xPrev = null;
    this.dxPrev = 0;
    this.tPrev = null;
  }

  /**
   * Updates filter parameters at runtime
   */
  setParams(params: Partial<OneEuroParams>): void {
    if (params.minCutoff !== undefined) this.minCutoff = params.minCutoff;
    if (params.beta !== undefined) this.beta = params.beta;
    if (params.dCutoff !== undefined) this.dCutoff = params.dCutoff;
  }
}

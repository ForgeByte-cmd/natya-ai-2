/**
 * AdaptiveSmoother.ts
 * Manages independent multi-dimensional 1€ filters for each anatomical landmark,
 * featuring confidence weighting, predictive latency compensation, jitter dead-zones,
 * and lost landmark handling with short-term decay prediction.
 */

import { OneEuroFilter } from './OneEuroFilter';
import { FilterProfileConfig, VISION_CONFIG } from '../../config/vision';

export interface Landmark3D {
  x: number;
  y: number;
  z?: number;
  visibility?: number;
}

export interface LandmarkFilterInstance {
  xFilter: OneEuroFilter;
  yFilter: OneEuroFilter;
  zFilter: OneEuroFilter;
  visFilter: OneEuroFilter;
  lastSeenTime: number;
  lastValidPosition: Landmark3D | null;
  isLost: boolean;
}

export class AdaptiveSmoother<T extends Landmark3D> {
  private filters: Map<number, LandmarkFilterInstance> = new Map();
  private config: FilterProfileConfig;
  private name: string;

  constructor(profile: 'body' | 'hands', customConfig?: Partial<FilterProfileConfig>) {
    this.name = profile;
    this.config = {
      ...(profile === 'body' ? VISION_CONFIG.body : VISION_CONFIG.hands),
      ...(customConfig || {}),
    };
  }

  public setConfig(customConfig: Partial<FilterProfileConfig>): void {
    this.config = { ...this.config, ...customConfig };
    // Propagate parameters to active filters
    for (const filterInst of this.filters.values()) {
      filterInst.xFilter.setParams({
        minCutoff: this.config.minCutoff,
        beta: this.config.beta,
        dCutoff: this.config.dCutoff,
      });
      filterInst.yFilter.setParams({
        minCutoff: this.config.minCutoff,
        beta: this.config.beta,
        dCutoff: this.config.dCutoff,
      });
      filterInst.zFilter.setParams({
        minCutoff: this.config.minCutoff,
        beta: this.config.beta,
        dCutoff: this.config.dCutoff,
      });
    }
  }

  public getConfig(): FilterProfileConfig {
    return { ...this.config };
  }

  private getOrCreateFilter(index: number): LandmarkFilterInstance {
    let filter = this.filters.get(index);
    if (!filter) {
      filter = {
        xFilter: new OneEuroFilter({
          minCutoff: this.config.minCutoff,
          beta: this.config.beta,
          dCutoff: this.config.dCutoff,
        }),
        yFilter: new OneEuroFilter({
          minCutoff: this.config.minCutoff,
          beta: this.config.beta,
          dCutoff: this.config.dCutoff,
        }),
        zFilter: new OneEuroFilter({
          minCutoff: this.config.minCutoff,
          beta: this.config.beta,
          dCutoff: this.config.dCutoff,
        }),
        visFilter: new OneEuroFilter({
          minCutoff: 1.5,
          beta: 0.005,
          dCutoff: 1.0,
        }),
        lastSeenTime: 0,
        lastValidPosition: null,
        isLost: false,
      };
      this.filters.set(index, filter);
    }
    return filter;
  }

  /**
   * Smooths an array of landmarks with independent coordinate filtering,
   * predictive display compensation, and lost landmark protection.
   */
  public update(rawLandmarks: T[] | undefined | null, timestamp: number): T[] {
    if (!rawLandmarks || rawLandmarks.length === 0) {
      return this.handleMissingFrame(timestamp);
    }

    const smoothedArray: T[] = [];

    for (let i = 0; i < rawLandmarks.length; i++) {
      const rawLm = rawLandmarks[i];
      if (!rawLm) continue;

      const filterInst = this.getOrCreateFilter(i);
      const confidence = rawLm.visibility !== undefined ? Math.max(0, Math.min(1, rawLm.visibility)) : 1.0;

      // 1. Check for invalid or missing measurement (e.g. (0,0) jump or NaN)
      const isValidMeasurement =
        !isNaN(rawLm.x) &&
        !isNaN(rawLm.y) &&
        (rawLm.x !== 0 || rawLm.y !== 0 || confidence > 0.3) &&
        confidence >= 0.20;

      if (!isValidMeasurement) {
        // Lost landmark handling with short grace period prediction
        const timeSinceSeen = timestamp - filterInst.lastSeenTime;
        if (filterInst.lastValidPosition && timeSinceSeen <= this.config.lostGracePeriodMs) {
          // Grace period: short decay prediction
          const decay = Math.max(0, 1.0 - timeSinceSeen / this.config.lostGracePeriodMs);
          const velX = filterInst.xFilter.getVelocity();
          const velY = filterInst.yFilter.getVelocity();

          const predX = filterInst.lastValidPosition.x + velX * 0.015 * decay;
          const predY = filterInst.lastValidPosition.y + velY * 0.015 * decay;

          smoothedArray.push({
            ...rawLm,
            x: predX,
            y: predY,
            z: filterInst.lastValidPosition.z,
            visibility: Math.max(0.1, (filterInst.lastValidPosition.visibility ?? 0.5) * decay),
          } as T);
          continue;
        } else {
          filterInst.isLost = true;
          // Return landmark with zero visibility so renderer safely omits without jumping to origin
          smoothedArray.push({
            ...rawLm,
            visibility: 0,
          } as T);
          continue;
        }
      }

      // Valid measurement recovered
      filterInst.isLost = false;
      filterInst.lastSeenTime = timestamp;

      // 2. Apply One Euro Filter independently to each coordinate
      const smoothedX = filterInst.xFilter.filter(rawLm.x, timestamp, confidence, this.config.deadZone);
      const smoothedY = filterInst.yFilter.filter(rawLm.y, timestamp, confidence, this.config.deadZone);
      const smoothedZ = filterInst.zFilter.filter(rawLm.z ?? 0, timestamp, confidence, this.config.deadZone);
      const smoothedVis = filterInst.visFilter.filter(confidence, timestamp, 1.0, 0);

      // 3. Predictive Latency Compensation for Display Overlay
      // v_x and v_y are measured in normalized coords per second
      const velX = filterInst.xFilter.getVelocity();
      const velY = filterInst.yFilter.getVelocity();

      let dispX = smoothedX;
      let dispY = smoothedY;

      if (this.config.predictionTime > 0) {
        const rawPredX = smoothedX + velX * this.config.predictionTime;
        const rawPredY = smoothedY + velY * this.config.predictionTime;

        // Clamp prediction to prevent noisy overshoot
        const dx = rawPredX - rawLm.x;
        const dy = rawPredY - rawLm.y;
        const predDist = Math.sqrt(dx * dx + dy * dy);

        if (predDist > this.config.maxPredictionDist) {
          const scale = this.config.maxPredictionDist / predDist;
          dispX = rawLm.x + dx * scale;
          dispY = rawLm.y + dy * scale;
        } else {
          dispX = rawPredX;
          dispY = rawPredY;
        }
      }

      const smoothedItem = {
        ...rawLm,
        x: dispX,
        y: dispY,
        z: smoothedZ,
        visibility: smoothedVis,
      } as T;

      filterInst.lastValidPosition = {
        x: dispX,
        y: dispY,
        z: smoothedZ,
        visibility: smoothedVis,
      };

      smoothedArray.push(smoothedItem);
    }

    return smoothedArray;
  }

  private handleMissingFrame(timestamp: number): T[] {
    const result: T[] = [];
    for (const [_, filterInst] of this.filters.entries()) {
      const timeSinceSeen = timestamp - filterInst.lastSeenTime;
      if (filterInst.lastValidPosition && timeSinceSeen <= this.config.lostGracePeriodMs) {
        const decay = Math.max(0, 1.0 - timeSinceSeen / this.config.lostGracePeriodMs);
        result.push({
          x: filterInst.lastValidPosition.x,
          y: filterInst.lastValidPosition.y,
          z: filterInst.lastValidPosition.z,
          visibility: Math.max(0.1, (filterInst.lastValidPosition.visibility ?? 0.5) * decay),
        } as T);
      }
    }
    return result;
  }

  public getVelocity(index: number): { vx: number; vy: number; vz: number } {
    const filter = this.filters.get(index);
    if (!filter) return { vx: 0, vy: 0, vz: 0 };
    return {
      vx: filter.xFilter.getVelocity(),
      vy: filter.yFilter.getVelocity(),
      vz: filter.zFilter.getVelocity(),
    };
  }

  public reset(): void {
    for (const filter of this.filters.values()) {
      filter.xFilter.reset();
      filter.yFilter.reset();
      filter.zFilter.reset();
      filter.visFilter.reset();
      filter.lastValidPosition = null;
      filter.isLost = false;
      filter.lastSeenTime = 0;
    }
    this.filters.clear();
  }
}

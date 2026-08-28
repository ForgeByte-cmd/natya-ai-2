import { MovementFeatures, PoseFrame } from '../../types/movement';
import { calculateDistance } from '../coordinates/coordinateTransform';

export function computeMovementFeatures(frames: PoseFrame[]): MovementFeatures {
  if (frames.length < 5) {
    return {
      displacement: 0,
      velocity: 0,
      acceleration: 0,
      verticalOscillation: 0,
      footStrikeCadence: 0,
      bodyRotationVelocity: 0,
      armTrajectoryCurvature: 0,
      legTrajectoryArc: 0,
      headMovementRate: 0,
      symmetryIndex: 1,
    };
  }

  const durationSec = Math.max(0.1, (frames[frames.length - 1].timestamp - frames[0].timestamp) / 1000);

  // Track key joint trajectories over time
  let totalDisplacement = 0;
  const hipYValues: number[] = [];
  const leftAnkleYValues: number[] = [];
  const rightAnkleYValues: number[] = [];
  const shoulderWidths: number[] = [];

  for (let i = 1; i < frames.length; i++) {
    const prev = frames[i - 1].landmarks;
    const curr = frames[i].landmarks;

    if (prev.length >= 33 && curr.length >= 33) {
      // Mid-hip displacement
      const prevMidHip = { x: (prev[23].x + prev[24].x) / 2, y: (prev[23].y + prev[24].y) / 2 };
      const currMidHip = { x: (curr[23].x + curr[24].x) / 2, y: (curr[23].y + curr[24].y) / 2 };
      totalDisplacement += calculateDistance(prevMidHip, currMidHip);

      hipYValues.push(currMidHip.y);
      leftAnkleYValues.push(curr[27].y);
      rightAnkleYValues.push(curr[28].y);

      const sWidth = curr[12].x - curr[11].x;
      shoulderWidths.push(sWidth);
    }
  }

  const velocity = totalDisplacement / durationSec;

  // Vertical oscillation (peak-to-peak variance of hip Y)
  let verticalOscillation = 0;
  if (hipYValues.length > 2) {
    const minHipY = Math.min(...hipYValues);
    const maxHipY = Math.max(...hipYValues);
    verticalOscillation = Math.max(0, (maxHipY - minHipY) * 10);
  }

  // Foot strike cadence (counting direction reversals in ankle Y positions)
  let footStrikes = 0;
  for (let i = 1; i < leftAnkleYValues.length - 1; i++) {
    if (
      (leftAnkleYValues[i] > leftAnkleYValues[i - 1] && leftAnkleYValues[i] > leftAnkleYValues[i + 1]) ||
      (rightAnkleYValues[i] > rightAnkleYValues[i - 1] && rightAnkleYValues[i] > rightAnkleYValues[i + 1])
    ) {
      footStrikes += 1;
    }
  }
  const footStrikeCadence = footStrikes / durationSec;

  // Body rotation velocity (detecting sign flips or rapid changes in shoulder x-difference)
  let rotationRate = 0;
  if (shoulderWidths.length > 2) {
    let signFlips = 0;
    for (let i = 1; i < shoulderWidths.length; i++) {
      if (Math.sign(shoulderWidths[i]) !== Math.sign(shoulderWidths[i - 1])) {
        signFlips += 1;
      }
    }
    rotationRate = (signFlips * 180) / durationSec;
  }

  return {
    displacement: totalDisplacement,
    velocity,
    acceleration: velocity / durationSec,
    verticalOscillation,
    footStrikeCadence,
    bodyRotationVelocity: rotationRate,
    armTrajectoryCurvature: 0.5,
    legTrajectoryArc: 0.5,
    headMovementRate: 0.2,
    symmetryIndex: 0.9,
  };
}

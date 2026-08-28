import { BodyLandmark } from '../../types/pose';
import { FingerLandmark } from '../../types/mudra';

/**
 * Transforms normalized coordinates (0..1) to actual canvas pixel coordinates.
 * Handles front-camera mirroring properly without altering source landmark data.
 * Precisely compensates for CSS object-fit: cover scaling and cropping.
 */
export function normalizedToCanvas(
  landmark: { x: number; y: number; z?: number },
  width: number,
  height: number,
  mirrored: boolean = false,
  videoWidth?: number,
  videoHeight?: number
): { x: number; y: number; z: number } {
  const normX = mirrored ? 1 - landmark.x : landmark.x;
  const normY = landmark.y;

  // Fallback to standard linear scaling if video dimensions aren't provided
  if (!videoWidth || !videoHeight || videoWidth <= 0 || videoHeight <= 0) {
    return {
      x: normX * width,
      y: normY * height,
      z: landmark.z ?? 0,
    };
  }

  // Account for CSS object-fit: cover
  const videoAspect = videoWidth / videoHeight;
  const canvasAspect = width / height;

  let renderWidth = width;
  let renderHeight = height;
  let offsetX = 0;
  let offsetY = 0;

  if (videoAspect > canvasAspect) {
    // Video is wider than canvas -> horizontal crop
    renderHeight = height;
    renderWidth = height * videoAspect;
    offsetX = (width - renderWidth) / 2;
  } else {
    // Video is taller than canvas -> vertical crop
    renderWidth = width;
    renderHeight = width / videoAspect;
    offsetY = (height - renderHeight) / 2;
  }

  return {
    x: normX * renderWidth + offsetX,
    y: normY * renderHeight + offsetY,
    z: landmark.z ?? 0,
  };
}

/**
 * Calculates Euclidean distance between two 3D or 2D points.
 */
export function calculateDistance(
  p1: { x: number; y: number; z?: number },
  p2: { x: number; y: number; z?: number }
): number {
  const dx = p1.x - p2.x;
  const dy = p1.y - p2.y;
  const dz = (p1.z ?? 0) - (p2.z ?? 0);
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

/**
 * Calculates the angle at vertex point B formed by segments AB and CB in degrees (0..180).
 */
export function calculateAngle(
  a: { x: number; y: number; z?: number },
  b: { x: number; y: number; z?: number },
  c: { x: number; y: number; z?: number }
): number {
  const v1 = {
    x: a.x - b.x,
    y: a.y - b.y,
    z: (a.z ?? 0) - (b.z ?? 0),
  };
  const v2 = {
    x: c.x - b.x,
    y: c.y - b.y,
    z: (c.z ?? 0) - (b.z ?? 0),
  };

  const dot = v1.x * v2.x + v1.y * v2.y + v1.z * v2.z;
  const mag1 = Math.sqrt(v1.x * v1.x + v1.y * v1.y + v1.z * v1.z);
  const mag2 = Math.sqrt(v2.x * v2.x + v2.y * v2.y + v2.z * v2.z);

  if (mag1 === 0 || mag2 === 0) return 0;
  const cosTheta = Math.max(-1, Math.min(1, dot / (mag1 * mag2)));
  return (Math.acos(cosTheta) * 180) / Math.PI;
}

/**
 * Computes normal vector of palm triangle formed by Wrist(0), Index MCP(5), Pinky MCP(17).
 */
export function computePalmNormal(
  wrist: FingerLandmark,
  indexMcp: FingerLandmark,
  pinkyMcp: FingerLandmark
): number[] {
  const v1 = {
    x: indexMcp.x - wrist.x,
    y: indexMcp.y - wrist.y,
    z: indexMcp.z - wrist.z,
  };
  const v2 = {
    x: pinkyMcp.x - wrist.x,
    y: pinkyMcp.y - wrist.y,
    z: pinkyMcp.z - wrist.z,
  };

  // Cross product v1 x v2
  const nx = v1.y * v2.z - v1.z * v2.y;
  const ny = v1.z * v2.x - v1.x * v2.z;
  const nz = v1.x * v2.y - v1.y * v2.x;
  const mag = Math.sqrt(nx * nx + ny * ny + nz * nz);

  if (mag === 0) return [0, 0, 1];
  return [nx / mag, ny / mag, nz / mag];
}

/**
 * Checks visibility threshold for a set of landmarks.
 */
export function getAverageVisibility(
  landmarks: BodyLandmark[],
  indices: number[]
): number {
  if (indices.length === 0) return 0;
  let sum = 0;
  for (const idx of indices) {
    if (landmarks[idx]) {
      sum += landmarks[idx].visibility ?? 0;
    }
  }
  return sum / indices.length;
}

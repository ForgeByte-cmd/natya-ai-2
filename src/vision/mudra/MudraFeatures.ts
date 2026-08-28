import { FingerCurl, FingerLandmark, FingerState, HandFeatures } from '../../types/mudra';
import { MudraFeaturesVector } from '../../types/pipeline';
import { calculateAngle, calculateDistance, computePalmNormal } from '../coordinates/coordinateTransform';

/**
 * Extracts normalized hand features independent of hand scale and camera distance.
 */
export function extractHandFeatures(
  landmarks: FingerLandmark[],
  handedness: 'Left' | 'Right',
  confidence: number = 0.85
): HandFeatures {
  if (landmarks.length < 21) {
    throw new Error('Insufficient landmarks to extract hand features');
  }

  const wrist = landmarks[0];

  // Palm scale reference: distance from Wrist(0) to Middle MCP(9)
  const palmScale = Math.max(0.01, calculateDistance(wrist, landmarks[9]));

  // Extract each finger state
  const thumbState = extractThumbState(landmarks, palmScale);
  const indexState = extractFingerState(landmarks, [5, 6, 7, 8], palmScale);
  const middleState = extractFingerState(landmarks, [9, 10, 11, 12], palmScale);
  const ringState = extractFingerState(landmarks, [13, 14, 15, 16], palmScale);
  const littleState = extractFingerState(landmarks, [17, 18, 19, 20], palmScale);

  // Tip-to-tip normalized distances (relative to palmScale)
  const thumbTip = landmarks[4];
  const indexTip = landmarks[8];
  const middleTip = landmarks[12];
  const ringTip = landmarks[16];
  const littleTip = landmarks[20];

  const thumbIndexDistance = calculateDistance(thumbTip, indexTip) / palmScale;
  const thumbMiddleDistance = calculateDistance(thumbTip, middleTip) / palmScale;
  const thumbRingDistance = calculateDistance(thumbTip, ringTip) / palmScale;
  const thumbLittleDistance = calculateDistance(thumbTip, littleTip) / palmScale;
  const indexMiddleDistance = calculateDistance(indexTip, middleTip) / palmScale;

  // Finger spreads: angles between adjacent finger directions (MCP to Tip)
  const fingerSpreads = [
    calculateAngle(indexTip, landmarks[5], middleTip),
    calculateAngle(middleTip, landmarks[9], ringTip),
    calculateAngle(ringTip, landmarks[13], littleTip),
  ];

  // Palm orientation normal vector
  const palmOrientation = computePalmNormal(wrist, landmarks[5], landmarks[17]);

  // Wrist angle relative to forearm / palm base
  const wristAngle = calculateAngle(landmarks[9], wrist, landmarks[5]);

  return {
    handedness,
    confidence,
    fingers: {
      thumb: thumbState,
      index: indexState,
      middle: middleState,
      ring: ringState,
      little: littleState,
    },
    palmOrientation,
    wristAngle,
    thumbIndexDistance,
    thumbMiddleDistance,
    thumbRingDistance,
    thumbLittleDistance,
    indexMiddleDistance,
    fingerSpreads,
  };
}

/**
 * Returns full numerical MudraFeaturesVector required for ML/statistical classification
 */
export function extractMudraFeaturesVector(
  landmarks: FingerLandmark[],
  handFeatures: HandFeatures
): MudraFeaturesVector {
  const f = handFeatures.fingers;
  const handVisibility = Math.min(1.0, landmarks.length / 21);

  return {
    fingerStates: [
      f.thumb.extensionRatio,
      f.index.extensionRatio,
      f.middle.extensionRatio,
      f.ring.extensionRatio,
      f.little.extensionRatio,
    ],
    jointAngles: [
      f.thumb.pipAngle,
      f.index.pipAngle,
      f.index.dipAngle,
      f.middle.pipAngle,
      f.middle.dipAngle,
      f.ring.pipAngle,
      f.ring.dipAngle,
      f.little.pipAngle,
      f.little.dipAngle,
    ],
    fingertipDistances: [
      handFeatures.thumbIndexDistance,
      handFeatures.thumbMiddleDistance,
      handFeatures.thumbRingDistance,
      handFeatures.thumbLittleDistance,
      handFeatures.indexMiddleDistance,
    ],
    palmOrientation: handFeatures.palmOrientation,
    handShape: [...handFeatures.fingerSpreads, handFeatures.wristAngle],
    handVisibility,
  };
}

function extractFingerState(
  landmarks: FingerLandmark[],
  indices: [number, number, number, number], // MCP, PIP, DIP, Tip
  palmScale: number
): FingerState {
  const [mcpIdx, pipIdx, dipIdx, tipIdx] = indices;
  const wrist = landmarks[0];
  const mcp = landmarks[mcpIdx];
  const pip = landmarks[pipIdx];
  const dip = landmarks[dipIdx];
  const tip = landmarks[tipIdx];

  // Angles at PIP and DIP joints
  const pipAngle = calculateAngle(mcp, pip, dip);
  const dipAngle = calculateAngle(pip, dip, tip);
  const mcpAngle = calculateAngle(wrist, mcp, pip);

  // Tip distance from wrist relative to MCP distance
  const tipToWrist = calculateDistance(tip, wrist);
  const mcpToWrist = calculateDistance(mcp, wrist);
  const tipToMcp = calculateDistance(tip, mcp);

  // Extension ratio (0 = fully tucked curled, 1 = fully extended straight)
  const maxSpan = calculateDistance(mcp, pip) + calculateDistance(pip, dip) + calculateDistance(dip, tip);
  const actualSpan = tipToMcp;
  const extensionRatio = Math.max(0, Math.min(1, actualSpan / Math.max(0.01, maxSpan)));

  let curl: FingerCurl = 'EXTENDED';
  if (extensionRatio < 0.42 || pipAngle < 100) {
    curl = 'CURLED';
  } else if (extensionRatio < 0.72 || pipAngle < 140) {
    curl = 'HALF_CURLED';
  } else {
    curl = 'EXTENDED';
  }

  return {
    curl,
    extensionRatio,
    mcpAngle,
    pipAngle,
    dipAngle,
  };
}

function extractThumbState(
  landmarks: FingerLandmark[],
  palmScale: number
): FingerState {
  const wrist = landmarks[0];
  const cmc = landmarks[1];
  const mcp = landmarks[2];
  const ip = landmarks[3];
  const tip = landmarks[4];
  const indexMcp = landmarks[5];

  const mcpAngle = calculateAngle(cmc, mcp, ip);
  const pipAngle = calculateAngle(mcp, ip, tip);
  const dipAngle = calculateAngle(cmc, ip, tip);

  const thumbSpan = calculateDistance(tip, indexMcp) / palmScale;
  const maxSpan = calculateDistance(cmc, mcp) + calculateDistance(mcp, ip) + calculateDistance(ip, tip);
  const tipToCmc = calculateDistance(tip, cmc);
  const extensionRatio = Math.max(0, Math.min(1, tipToCmc / Math.max(0.01, maxSpan)));

  let curl: FingerCurl = 'EXTENDED';
  if (extensionRatio < 0.45 || thumbSpan < 0.35) {
    curl = 'CURLED';
  } else if (extensionRatio < 0.75 || thumbSpan < 0.65) {
    curl = 'HALF_CURLED';
  } else {
    curl = 'EXTENDED';
  }

  return {
    curl,
    extensionRatio,
    mcpAngle,
    pipAngle,
    dipAngle,
  };
}

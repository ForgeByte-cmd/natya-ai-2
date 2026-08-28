import { BodyLandmark, PoseFeatures } from '../../types/pose';
import { calculateAngle, calculateDistance } from '../coordinates/coordinateTransform';

export function extractPoseFeatures(landmarks: BodyLandmark[]): PoseFeatures | null {
  if (landmarks.length < 33) return null;

  const leftShoulder = landmarks[11];
  const rightShoulder = landmarks[12];
  const leftElbow = landmarks[13];
  const rightElbow = landmarks[14];
  const leftWrist = landmarks[15];
  const rightWrist = landmarks[16];
  const leftHip = landmarks[23];
  const rightHip = landmarks[24];
  const leftKnee = landmarks[25];
  const rightKnee = landmarks[26];
  const leftAnkle = landmarks[27];
  const rightAnkle = landmarks[28];
  const nose = landmarks[0];

  // Shoulder width as primary body normalization scale
  const shoulderWidth = Math.max(0.01, calculateDistance(leftShoulder, rightShoulder));
  const torsoHeight = Math.max(
    0.01,
    calculateDistance(
      { x: (leftShoulder.x + rightShoulder.x) / 2, y: (leftShoulder.y + rightShoulder.y) / 2 },
      { x: (leftHip.x + rightHip.x) / 2, y: (leftHip.y + rightHip.y) / 2 }
    )
  );

  // Joint Angles
  const leftElbowAngle = calculateAngle(leftShoulder, leftElbow, leftWrist);
  const rightElbowAngle = calculateAngle(rightShoulder, rightElbow, rightWrist);
  const leftKneeAngle = calculateAngle(leftHip, leftKnee, leftAnkle);
  const rightKneeAngle = calculateAngle(rightHip, rightKnee, rightAnkle);

  // Shoulder line angle relative to horizontal
  const shoulderDy = rightShoulder.y - leftShoulder.y;
  const shoulderDx = rightShoulder.x - leftShoulder.x;
  const shoulderAngle = (Math.atan2(shoulderDy, shoulderDx) * 180) / Math.PI;

  // Hip line angle
  const hipDy = rightHip.y - leftHip.y;
  const hipDx = rightHip.x - leftHip.x;
  const hipAngle = (Math.atan2(hipDy, hipDx) * 180) / Math.PI;

  // Torso inclination from vertical
  const midShoulder = { x: (leftShoulder.x + rightShoulder.x) / 2, y: (leftShoulder.y + rightShoulder.y) / 2 };
  const midHip = { x: (leftHip.x + rightHip.x) / 2, y: (leftHip.y + rightHip.y) / 2 };
  const torsoDx = midShoulder.x - midHip.x;
  const torsoDy = midShoulder.y - midHip.y;
  const torsoInclination = Math.abs((Math.atan2(torsoDx, -torsoDy) * 180) / Math.PI);

  // Head orientation / tilt relative to mid shoulder
  const headOrientation = ((nose.x - midShoulder.x) / shoulderWidth) * 45;

  // Normalized Spans
  const legSeparation = calculateDistance(leftAnkle, rightAnkle) / shoulderWidth;
  const armSeparation = calculateDistance(leftWrist, rightWrist) / shoulderWidth;
  const wristHeightLeft = (leftShoulder.y - leftWrist.y) / torsoHeight;
  const wristHeightRight = (rightShoulder.y - rightWrist.y) / torsoHeight;

  // Stance Classifications
  // 1. Aramandi: Knees bent (105-145 deg) with knees turned outward wider than ankles/hips
  const avgKneeAngle = (leftKneeAngle + rightKneeAngle) / 2;
  const kneeSpread = calculateDistance(leftKnee, rightKnee) / shoulderWidth;
  const isAramandiStance = avgKneeAngle >= 100 && avgKneeAngle <= 148 && kneeSpread > 0.85 && torsoInclination < 25;

  // 2. Samapada: Standing upright, straight knees (> 160 deg), feet close
  const isSamapada = avgKneeAngle > 160 && legSeparation < 0.6 && torsoInclination < 15;

  // 3. Tribhanga (Odissi 3-bend curve): opposing lateral offsets between head, torso, and hips
  const headOffset = nose.x - midShoulder.x;
  const hipOffset = midHip.x - midShoulder.x;
  const isTribhanga = Math.abs(headOffset) > 0.03 && Math.abs(hipOffset) > 0.03 && Math.sign(headOffset) !== Math.sign(hipOffset);

  // Symmetry Score (0 to 1)
  const kneeDiff = Math.abs(leftKneeAngle - rightKneeAngle) / 180;
  const elbowDiff = Math.abs(leftElbowAngle - rightElbowAngle) / 180;
  const symmetryScore = Math.max(0, 1 - (kneeDiff + elbowDiff) / 2);

  return {
    shoulderAngle,
    hipAngle,
    leftElbowAngle,
    rightElbowAngle,
    leftKneeAngle,
    rightKneeAngle,
    torsoInclination,
    headOrientation,
    legSeparation,
    armSeparation,
    wristHeightLeft,
    wristHeightRight,
    isAramandiStance,
    isTribhanga,
    isSamapada,
    symmetryScore,
  };
}

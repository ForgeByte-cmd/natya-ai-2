import React, { useEffect, useRef } from 'react';
import { BodyLandmark, PoseFeatures } from '../types/pose';
import { FingerLandmark, MudraObservation } from '../types/mudra';
import { normalizedToCanvas } from '../vision/coordinates/coordinateTransform';
import { JointTrail } from '../vision/smoothing/LandmarkSmoother';

interface OverlayCanvasProps {
  poseLandmarks: BodyLandmark[];
  leftHandLandmarks: FingerLandmark[];
  rightHandLandmarks: FingerLandmark[];
  leftMudra: MudraObservation | null;
  rightMudra: MudraObservation | null;
  poseFeatures: PoseFeatures | null;
  trails?: JointTrail[];
  overlayStyle: 'full' | 'hands_only' | 'subtle' | 'none';
  isMirrored: boolean;
  videoWidth: number;
  videoHeight: number;
}

// MediaPipe Pose Skeleton Connections
const POSE_CONNECTIONS: [number, number][] = [
  [11, 12], // Shoulders
  [11, 13], [13, 15], // Left Arm
  [12, 14], [14, 16], // Right Arm
  [11, 23], [12, 24], // Torso
  [23, 24], // Hips
  [23, 25], [25, 27], // Left Leg
  [24, 26], [26, 28], // Right Leg
  [27, 29], [29, 31], [27, 31], // Left Foot
  [28, 30], [30, 32], [28, 32], // Right Foot
];

// MediaPipe Hand Connections (21 points)
const HAND_CONNECTIONS: [number, number][] = [
  [0, 1], [1, 2], [2, 3], [3, 4], // Thumb
  [0, 5], [5, 6], [6, 7], [7, 8], // Index
  [0, 9], [9, 10], [10, 11], [11, 12], // Middle
  [0, 13], [13, 14], [14, 15], [15, 16], // Ring
  [0, 17], [17, 18], [18, 19], [19, 20], // Pinky
  [5, 9], [9, 13], [13, 17], // Palm base
];

export const OverlayCanvas: React.FC<OverlayCanvasProps> = ({
  poseLandmarks,
  leftHandLandmarks,
  rightHandLandmarks,
  leftMudra,
  rightMudra,
  poseFeatures,
  trails,
  overlayStyle,
  isMirrored,
  videoWidth,
  videoHeight,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (overlayStyle === 'none') return;

    const width = canvas.width;
    const height = canvas.height;

    // 0. Draw Movement Trails (Smooth historical trajectories)
    if (trails && trails.length > 0 && overlayStyle !== 'none') {
      ctx.save();
      for (const trail of trails) {
        if (!trail.points || trail.points.length < 2) continue;

        for (let i = 1; i < trail.points.length; i++) {
          const p1 = normalizedToCanvas(trail.points[i - 1], width, height, isMirrored, videoWidth, videoHeight);
          const p2 = normalizedToCanvas(trail.points[i], width, height, isMirrored, videoWidth, videoHeight);
          const alpha = trail.points[i].alpha * (overlayStyle === 'subtle' ? 0.35 : 0.65);

          ctx.beginPath();
          ctx.moveTo(p1.x, p1.y);
          ctx.lineTo(p2.x, p2.y);
          ctx.strokeStyle = trail.color;
          ctx.globalAlpha = Math.max(0.05, Math.min(1.0, alpha));
          ctx.lineWidth = (i / trail.points.length) * 3 + 1;
          ctx.lineCap = 'round';
          ctx.stroke();
        }
      }
      ctx.restore();
    }

    // 1. Draw Pose Skeleton
    if (overlayStyle === 'full' || overlayStyle === 'subtle') {
      if (poseLandmarks && poseLandmarks.length >= 33) {
        // Draw Skeleton Lines
        ctx.lineWidth = overlayStyle === 'subtle' ? 2 : 3;
        ctx.strokeStyle = overlayStyle === 'subtle' ? 'rgba(234, 179, 8, 0.45)' : 'rgba(234, 179, 8, 0.85)';
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        for (const [startIdx, endIdx] of POSE_CONNECTIONS) {
          const start = poseLandmarks[startIdx];
          const end = poseLandmarks[endIdx];

          if (
            start &&
            end &&
            start.visibility > 0.25 &&
            end.visibility > 0.25 &&
            (start.x !== 0 || start.y !== 0) &&
            (end.x !== 0 || end.y !== 0)
          ) {
            const p1 = normalizedToCanvas(start, width, height, isMirrored, videoWidth, videoHeight);
            const p2 = normalizedToCanvas(end, width, height, isMirrored, videoWidth, videoHeight);

            ctx.beginPath();
            ctx.moveTo(p1.x, p1.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.stroke();
          }
        }

        // Draw Landmark Points
        for (let i = 0; i < poseLandmarks.length; i++) {
          const lm = poseLandmarks[i];
          if (lm && lm.visibility > 0.3 && (lm.x !== 0 || lm.y !== 0)) {
            const p = normalizedToCanvas(lm, width, height, isMirrored, videoWidth, videoHeight);

            ctx.beginPath();
            ctx.arc(p.x, p.y, overlayStyle === 'subtle' ? 3 : 5, 0, 2 * Math.PI);
            ctx.fillStyle = i >= 11 && i <= 16 ? '#f59e0b' : i >= 23 && i <= 28 ? '#ef4444' : '#fbbf24';
            ctx.fill();
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 1.5;
            ctx.stroke();
          }
        }

        // Draw Aramandi Stance Indicator Arc
        if (poseFeatures?.isAramandiStance && poseLandmarks[25] && poseLandmarks[26]) {
          const leftKnee = normalizedToCanvas(poseLandmarks[25], width, height, isMirrored, videoWidth, videoHeight);
          const rightKnee = normalizedToCanvas(poseLandmarks[26], width, height, isMirrored, videoWidth, videoHeight);

          ctx.save();
          ctx.strokeStyle = 'rgba(34, 197, 94, 0.9)';
          ctx.lineWidth = 3;
          ctx.setLineDash([6, 4]);
          ctx.beginPath();
          ctx.moveTo(leftKnee.x, leftKnee.y);
          ctx.lineTo(rightKnee.x, rightKnee.y);
          ctx.stroke();

          // Badge
          const midX = (leftKnee.x + rightKnee.x) / 2;
          const midY = (leftKnee.y + rightKnee.y) / 2 - 12;
          ctx.fillStyle = 'rgba(22, 101, 52, 0.9)';
          ctx.beginPath();
          ctx.roundRect(midX - 50, midY - 14, 100, 22, 6);
          ctx.fill();
          ctx.fillStyle = '#ffffff';
          ctx.font = 'bold 11px sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText('Aramandi Base', midX, midY + 1);
          ctx.restore();
        }
      }
    }

    // 2. Draw Hands & Mudras
    drawHand(ctx, leftHandLandmarks, leftMudra, 'Left', width, height, isMirrored, overlayStyle, videoWidth, videoHeight);
    drawHand(ctx, rightHandLandmarks, rightMudra, 'Right', width, height, isMirrored, overlayStyle, videoWidth, videoHeight);
  }, [
    poseLandmarks,
    leftHandLandmarks,
    rightHandLandmarks,
    leftMudra,
    rightMudra,
    poseFeatures,
    trails,
    overlayStyle,
    isMirrored,
    videoWidth,
    videoHeight,
  ]);

  return (
    <canvas
      id="overlay-canvas"
      ref={canvasRef}
      width={videoWidth || 640}
      height={videoHeight || 480}
      className="absolute inset-0 w-full h-full pointer-events-none z-10"
    />
  );
};

function drawHand(
  ctx: CanvasRenderingContext2D,
  landmarks: FingerLandmark[],
  mudra: MudraObservation | null,
  handedness: 'Left' | 'Right',
  width: number,
  height: number,
  isMirrored: boolean,
  overlayStyle: string,
  videoWidth?: number,
  videoHeight?: number
) {
  if (!landmarks || landmarks.length < 21) return;

  const color = handedness === 'Left' ? '#38bdf8' : '#f43f5e';

  // Draw hand bones
  ctx.lineWidth = overlayStyle === 'subtle' ? 1.5 : 2.5;
  ctx.strokeStyle = color;
  ctx.lineCap = 'round';

  for (const [startIdx, endIdx] of HAND_CONNECTIONS) {
    const l1 = landmarks[startIdx];
    const l2 = landmarks[endIdx];
    if (!l1 || !l2 || (l1.x === 0 && l1.y === 0) || (l2.x === 0 && l2.y === 0)) continue;
    if (l1.visibility !== undefined && l1.visibility < 0.2) continue;
    if (l2.visibility !== undefined && l2.visibility < 0.2) continue;

    const p1 = normalizedToCanvas(l1, width, height, isMirrored, videoWidth, videoHeight);
    const p2 = normalizedToCanvas(l2, width, height, isMirrored, videoWidth, videoHeight);

    ctx.beginPath();
    ctx.moveTo(p1.x, p1.y);
    ctx.lineTo(p2.x, p2.y);
    ctx.stroke();
  }

  // Draw hand joint nodes
  for (let i = 0; i < landmarks.length; i++) {
    const lm = landmarks[i];
    if (!lm || (lm.x === 0 && lm.y === 0)) continue;
    if (lm.visibility !== undefined && lm.visibility < 0.2) continue;

    const p = normalizedToCanvas(lm, width, height, isMirrored, videoWidth, videoHeight);
    ctx.beginPath();
    ctx.arc(p.x, p.y, i % 4 === 0 ? 4 : 2.5, 0, 2 * Math.PI);
    ctx.fillStyle = i === 4 || i === 8 || i === 12 || i === 16 || i === 20 ? '#fbbf24' : '#ffffff';
    ctx.fill();
    ctx.strokeStyle = color;
    ctx.lineWidth = 1;
    ctx.stroke();
  }

  // Draw Mudra Tag Badge near wrist or palm
  if (mudra) {
    const wristPoint = normalizedToCanvas(landmarks[0], width, height, isMirrored, videoWidth, videoHeight);
    const tagX = Math.max(70, Math.min(width - 70, wristPoint.x));
    const tagY = Math.max(30, wristPoint.y - 25);

    ctx.save();
    if (mudra.isStable) {
      ctx.fillStyle = 'rgba(15, 23, 42, 0.88)';
      ctx.strokeStyle = color;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.roundRect(tagX - 55, tagY - 14, 110, 26, 6);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 11px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(`${mudra.name}`, tagX, tagY + 2);
    } else if (mudra.status === 'DETECTING') {
      ctx.fillStyle = 'rgba(28, 25, 23, 0.85)';
      ctx.strokeStyle = '#f59e0b';
      ctx.lineWidth = 1.2;
      ctx.setLineDash([4, 3]);
      ctx.beginPath();
      ctx.roundRect(tagX - 50, tagY - 14, 100, 24, 6);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#fbbf24';
      ctx.font = '500 10px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('Detecting...', tagX, tagY + 2);
    }
    ctx.restore();
  }
}

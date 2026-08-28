import { FilesetResolver, PoseLandmarker } from '@mediapipe/tasks-vision';
import { BodyLandmark, BodyTrackingState } from '../../types/pose';

export class PoseDetector {
  private landmarker: PoseLandmarker | null = null;
  private isInitializing: boolean = false;

  async initialize(): Promise<void> {
    if (this.landmarker || this.isInitializing) return;
    this.isInitializing = true;

    try {
      // Initialize vision fileset resolver
      const vision = await FilesetResolver.forVisionTasks(
        'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm'
      );

      this.landmarker = await PoseLandmarker.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath:
            'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task',
          delegate: 'GPU',
        },
        runningMode: 'VIDEO',
        numPoses: 1,
        minPoseDetectionConfidence: 0.5,
        minPosePresenceConfidence: 0.5,
        minTrackingConfidence: 0.5,
      });
    } catch (err) {
      console.warn('GPU delegate failed or initial CDN attempt, retrying with CPU fallback:', err);
      try {
        const vision = await FilesetResolver.forVisionTasks(
          'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm'
        );
        this.landmarker = await PoseLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath:
              'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task',
            delegate: 'CPU',
          },
          runningMode: 'VIDEO',
          numPoses: 1,
          minPoseDetectionConfidence: 0.45,
          minPosePresenceConfidence: 0.45,
          minTrackingConfidence: 0.45,
        });
      } catch (fallbackErr) {
        this.isInitializing = false;
        throw fallbackErr;
      }
    } finally {
      this.isInitializing = false;
    }
  }

  detect(
    video: HTMLVideoElement,
    timestamp: number
  ): {
    landmarks: BodyLandmark[];
    trackingState: BodyTrackingState;
  } {
    if (!this.landmarker) {
      throw new Error('Pose detector not initialized');
    }

    const result = this.landmarker.detectForVideo(video, timestamp);

    if (!result.landmarks || result.landmarks.length === 0 || !result.landmarks[0]) {
      return {
        landmarks: [],
        trackingState: 'NO_PERSON',
      };
    }

    const rawLandmarks = result.landmarks[0];
    const landmarks: BodyLandmark[] = rawLandmarks.map((lm) => ({
      x: lm.x,
      y: lm.y,
      z: lm.z ?? 0,
      visibility: (lm as unknown as { visibility?: number }).visibility ?? 0.8,
    }));

    // Calculate actual tracking state from key landmark groups
    const trackingState = this.calculateTrackingState(landmarks);

    return {
      landmarks,
      trackingState,
    };
  }

  private calculateTrackingState(landmarks: BodyLandmark[]): BodyTrackingState {
    if (landmarks.length < 33) return 'NO_PERSON';

    // Key body joint indices in MediaPipe Pose:
    // Shoulders: 11, 12 | Hips: 23, 24 | Knees: 25, 26 | Ankles: 27, 28
    const leftShoulder = landmarks[11]?.visibility ?? 0;
    const rightShoulder = landmarks[12]?.visibility ?? 0;
    const leftHip = landmarks[23]?.visibility ?? 0;
    const rightHip = landmarks[24]?.visibility ?? 0;
    const leftKnee = landmarks[25]?.visibility ?? 0;
    const rightKnee = landmarks[26]?.visibility ?? 0;
    const leftAnkle = landmarks[27]?.visibility ?? 0;
    const rightAnkle = landmarks[28]?.visibility ?? 0;

    const upperBodyVis = (leftShoulder + rightShoulder + leftHip + rightHip) / 4;
    const lowerBodyVis = (leftKnee + rightKnee + leftAnkle + rightAnkle) / 4;

    if (upperBodyVis < 0.35 && lowerBodyVis < 0.35) {
      return 'NO_PERSON';
    }

    if (upperBodyVis >= 0.55 && lowerBodyVis >= 0.5) {
      return 'FULL_BODY';
    }

    if (upperBodyVis >= 0.45) {
      return 'PARTIAL_BODY';
    }

    return 'TRACKING';
  }

  dispose(): void {
    if (this.landmarker) {
      this.landmarker.close();
      this.landmarker = null;
    }
  }
}

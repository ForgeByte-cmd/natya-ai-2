import { FilesetResolver, HandLandmarker } from '@mediapipe/tasks-vision';
import { FingerLandmark } from '../../types/mudra';

export interface DetectedHand {
  handedness: 'Left' | 'Right';
  landmarks: FingerLandmark[];
  score: number;
}

export class HandDetector {
  private landmarker: HandLandmarker | null = null;
  private isInitializing: boolean = false;

  async initialize(): Promise<void> {
    if (this.landmarker || this.isInitializing) return;
    this.isInitializing = true;

    try {
      const vision = await FilesetResolver.forVisionTasks(
        'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm'
      );

      this.landmarker = await HandLandmarker.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath:
            'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task',
          delegate: 'GPU',
        },
        runningMode: 'VIDEO',
        numHands: 2,
        minHandDetectionConfidence: 0.5,
        minHandPresenceConfidence: 0.5,
        minTrackingConfidence: 0.5,
      });
    } catch (err) {
      console.warn('HandDetector GPU initialization error, using CPU fallback:', err);
      try {
        const vision = await FilesetResolver.forVisionTasks(
          'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm'
        );
        this.landmarker = await HandLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath:
              'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task',
            delegate: 'CPU',
          },
          runningMode: 'VIDEO',
          numHands: 2,
          minHandDetectionConfidence: 0.45,
          minHandPresenceConfidence: 0.45,
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
  ): DetectedHand[] {
    if (!this.landmarker) {
      throw new Error('Hand detector not initialized');
    }

    const result = this.landmarker.detectForVideo(video, timestamp);

    if (!result.landmarks || result.landmarks.length === 0) {
      return [];
    }

    const detectedHands: DetectedHand[] = [];

    for (let i = 0; i < result.landmarks.length; i++) {
      const rawLandmarks = result.landmarks[i];
      const handednessCategory = result.handedness?.[i]?.[0];
      
      // Note: In MediaPipe, selfie mirror perspective label is provided;
      // We read handedness display name or categoryName
      const handednessLabel = (handednessCategory?.categoryName === 'Left' ? 'Left' : 'Right') as 'Left' | 'Right';
      const score = handednessCategory?.score ?? 0.8;

      const landmarks: FingerLandmark[] = rawLandmarks.map((lm) => ({
        x: lm.x,
        y: lm.y,
        z: lm.z ?? 0,
      }));

      detectedHands.push({
        handedness: handednessLabel,
        landmarks,
        score,
      });
    }

    return detectedHands;
  }

  dispose(): void {
    if (this.landmarker) {
      this.landmarker.close();
      this.landmarker = null;
    }
  }
}

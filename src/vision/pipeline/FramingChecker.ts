import { BodyLandmark } from '../../types/pose';
import { FramingStatus } from '../../types/pipeline';

export class FramingChecker {
  checkFraming(landmarks: BodyLandmark[]): FramingStatus {
    if (!landmarks || landmarks.length < 33) {
      return {
        headVisible: false,
        shouldersVisible: false,
        hipsVisible: false,
        kneesVisible: false,
        feetVisible: false,
        overallVisibilityScore: 0,
        distanceStatus: 'NO_PERSON',
        guidanceMessage: 'Position yourself in the camera view to begin recognition.',
      };
    }

    // Key body landmark indices in MediaPipe Pose
    // Nose: 0, Left/Right Ear: 7, 8
    // Shoulders: 11, 12
    // Hips: 23, 24
    // Knees: 25, 26
    // Ankles: 27, 28, Feet: 29, 30, 31, 32

    const headVis = Math.max(landmarks[0]?.visibility || 0, (landmarks[7]?.visibility || 0 + (landmarks[8]?.visibility || 0)) / 2);
    const shouldersVis = ((landmarks[11]?.visibility || 0) + (landmarks[12]?.visibility || 0)) / 2;
    const hipsVis = ((landmarks[23]?.visibility || 0) + (landmarks[24]?.visibility || 0)) / 2;
    const kneesVis = ((landmarks[25]?.visibility || 0) + (landmarks[26]?.visibility || 0)) / 2;
    const feetVis = ((landmarks[27]?.visibility || 0) + (landmarks[28]?.visibility || 0) + (landmarks[31]?.visibility || 0) + (landmarks[32]?.visibility || 0)) / 4;

    const headVisible = headVis > 0.45 && landmarks[0]?.y > 0.02;
    const shouldersVisible = shouldersVis > 0.45;
    const hipsVisible = hipsVis > 0.4;
    const kneesVisible = kneesVis > 0.35;
    const feetVisible = feetVis > 0.35 && (landmarks[27]?.y < 0.98 || landmarks[28]?.y < 0.98);

    const visibleCount = [headVisible, shouldersVisible, hipsVisible, kneesVisible, feetVisible].filter(Boolean).length;
    const overallVisibilityScore = visibleCount / 5;

    // Body bounding height calculation (head Y to lowest foot Y)
    const headY = Math.min(landmarks[0]?.y || 0.5, landmarks[11]?.y || 0.5);
    const lowestFootY = Math.max(
      landmarks[27]?.y || 0.5,
      landmarks[28]?.y || 0.5,
      landmarks[31]?.y || 0.5,
      landmarks[32]?.y || 0.5
    );
    const bodyHeightFraction = Math.max(0.1, lowestFootY - headY);

    let distanceStatus: 'OPTIMAL' | 'TOO_CLOSE' | 'TOO_FAR' | 'FEET_CUT_OFF' | 'NO_PERSON' = 'OPTIMAL';
    let guidanceMessage = 'Optimal framing: full body locked for classical dance.';

    if (!headVisible && !shouldersVisible && !hipsVisible) {
      distanceStatus = 'NO_PERSON';
      guidanceMessage = 'Step into the camera frame.';
    } else if (headVisible && shouldersVisible && hipsVisible && !feetVisible) {
      distanceStatus = 'FEET_CUT_OFF';
      guidanceMessage = 'Step back: feet needed for classical stance (Aramandi/Chowka) & footwork.';
    } else if (bodyHeightFraction < 0.35) {
      distanceStatus = 'TOO_FAR';
      guidanceMessage = 'Move closer to the camera for higher landmark precision.';
    } else if (bodyHeightFraction > 0.96 || headY < 0.03) {
      distanceStatus = 'TOO_CLOSE';
      guidanceMessage = 'Step back slightly to ensure entire posture and arms fit in frame.';
    }

    return {
      headVisible,
      shouldersVisible,
      hipsVisible,
      kneesVisible,
      feetVisible,
      overallVisibilityScore,
      distanceStatus,
      guidanceMessage,
    };
  }
}

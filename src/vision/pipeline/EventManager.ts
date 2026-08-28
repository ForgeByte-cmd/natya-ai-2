import { DanceEvent, DanceEventType } from '../../types/pipeline';

export interface EventListener {
  (event: DanceEvent): void;
}

export class EventManager {
  private listeners: EventListener[] = [];
  private recentEvents: DanceEvent[] = [];
  private maxHistory: number = 20;

  // Active stable state caches to debounce
  private lastLeftMudraId: string | null = null;
  private lastRightMudraId: string | null = null;
  private lastPoseId: string | null = null;
  private lastMovementId: string | null = null;
  private lastDanceFormId: string | null = null;
  private lastFramingMessage: string | null = null;

  // Cooldown timestamps
  private lastMudraEventTime: number = 0;
  private lastPoseEventTime: number = 0;
  private lastMovementEventTime: number = 0;
  private lastDanceFormEventTime: number = 0;

  subscribe(listener: EventListener): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  getRecentEvents(): DanceEvent[] {
    return this.recentEvents;
  }

  emitEvent(type: DanceEventType, confidence: number, data: any, summary: string, timestamp: number = performance.now()): void {
    const event: DanceEvent = {
      timestamp,
      type,
      confidence,
      data,
      summary,
    };

    this.recentEvents.push(event);
    if (this.recentEvents.length > this.maxHistory) {
      this.recentEvents.shift();
    }

    for (const listener of this.listeners) {
      try {
        listener(event);
      } catch (err) {
        console.warn('Event listener error:', err);
      }
    }
  }

  /**
   * Evaluates if a stable Mudra change should trigger an event (debounced)
   */
  checkMudraChange(
    handedness: 'Left' | 'Right',
    mudraId: string | null,
    mudraName: string,
    sanskritName: string | undefined,
    confidence: number,
    isStable: boolean,
    timestamp: number
  ): void {
    if (!isStable || !mudraId || mudraId === 'detecting' || confidence < 0.6) return;

    const isLeft = handedness === 'Left';
    const lastId = isLeft ? this.lastLeftMudraId : this.lastRightMudraId;

    // Minimum cooldown between distinct mudra events: 600ms
    if (mudraId !== lastId && timestamp - this.lastMudraEventTime > 600) {
      if (isLeft) this.lastLeftMudraId = mudraId;
      else this.lastRightMudraId = mudraId;
      this.lastMudraEventTime = timestamp;

      this.emitEvent(
        'MUDRA_CONFIRMED',
        confidence,
        { handedness, mudraId, mudraName, sanskritName },
        `Confirmed ${handedness} Hand Mudra: ${mudraName} (${sanskritName || ''})`,
        timestamp
      );
    }
  }

  /**
   * Evaluates if a stable Pose change should trigger an event (debounced)
   */
  checkPoseChange(
    poseId: string | null,
    poseName: string,
    sanskritName: string | undefined,
    confidence: number,
    timestamp: number
  ): void {
    if (!poseId || confidence < 0.65) return;

    if (poseId !== this.lastPoseId && timestamp - this.lastPoseEventTime > 800) {
      this.lastPoseId = poseId;
      this.lastPoseEventTime = timestamp;

      this.emitEvent(
        'POSE_CONFIRMED',
        confidence,
        { poseId, poseName, sanskritName },
        `Confirmed Posture: ${poseName}`,
        timestamp
      );
    }
  }

  /**
   * Evaluates if a Movement change should trigger an event (debounced)
   */
  checkMovementChange(
    movementId: string | null,
    movementName: string,
    confidence: number,
    timestamp: number
  ): void {
    if (!movementId || confidence < 0.65) return;

    if (movementId !== this.lastMovementId && timestamp - this.lastMovementEventTime > 1200) {
      this.lastMovementId = movementId;
      this.lastMovementEventTime = timestamp;

      this.emitEvent(
        'MOVEMENT_CONFIRMED',
        confidence,
        { movementId, movementName },
        `Confirmed Movement: ${movementName}`,
        timestamp
      );
    }
  }

  /**
   * Evaluates if a Dance Form change should trigger an event (debounced)
   */
  checkDanceFormChange(
    formId: string | null,
    formName: string,
    confidence: number,
    isConfirmed: boolean,
    timestamp: number
  ): void {
    if (!formId || !isConfirmed || confidence < 0.7) return;

    if (formId !== this.lastDanceFormId && timestamp - this.lastDanceFormEventTime > 2000) {
      this.lastDanceFormId = formId;
      this.lastDanceFormEventTime = timestamp;

      this.emitEvent(
        'DANCE_FORM_CONFIRMED',
        confidence,
        { formId, formName },
        `Confirmed Dance Tradition: ${formName}`,
        timestamp
      );
    }
  }

  /**
   * Emits high-speed movement events when rapid dance transitions occur
   */
  private lastHighSpeedEventTime: number = 0;
  checkHighSpeedMovement(
    highSpeedEvent: any,
    timestamp: number
  ): void {
    if (!highSpeedEvent) return;

    // Minimum cooldown between rapid high-speed event emissions (750ms)
    if (timestamp - this.lastHighSpeedEventTime > 750) {
      this.lastHighSpeedEventTime = timestamp;
      const jointsStr = highSpeedEvent.affectedJoints?.join(', ') || 'body';
      this.emitEvent(
        'HIGH_SPEED_MOVEMENT',
        highSpeedEvent.trackingConfidence ?? 0.9,
        highSpeedEvent,
        `High-Speed Movement (${highSpeedEvent.motionLevel}): Speed ${highSpeedEvent.speed}x on [${jointsStr}]`,
        timestamp
      );
    }
  }

  /**
   * Emits alerts when motion blur or rapid motion confidence drops/restores
   */
  private lastBlurStatus: string = 'OPTIMAL';
  private lastBlurAlertTime: number = 0;
  checkMotionBlurStatus(
    blurStatus: string | undefined,
    blurMessage: string | undefined,
    timestamp: number
  ): void {
    if (!blurStatus || blurStatus === 'OPTIMAL') {
      this.lastBlurStatus = 'OPTIMAL';
      return;
    }

    if (blurStatus !== this.lastBlurStatus && timestamp - this.lastBlurAlertTime > 1500) {
      this.lastBlurStatus = blurStatus;
      this.lastBlurAlertTime = timestamp;

      this.emitEvent(
        'MOTION_BLUR_ALERT',
        0.85,
        { blurStatus, blurMessage },
        blurMessage || 'Motion tracking state update',
        timestamp
      );
    }
  }

  reset(): void {
    this.lastLeftMudraId = null;
    this.lastRightMudraId = null;
    this.lastPoseId = null;
    this.lastMovementId = null;
    this.lastDanceFormId = null;
    this.lastFramingMessage = null;
    this.lastHighSpeedEventTime = 0;
    this.lastBlurAlertTime = 0;
    this.lastBlurStatus = 'OPTIMAL';
    this.recentEvents = [];
  }
}

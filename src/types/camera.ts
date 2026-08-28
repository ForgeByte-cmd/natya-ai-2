export type CameraFacingMode = 'user' | 'environment';

export interface CameraDimensions {
  width: number;
  height: number;
  aspectRatio: number;
  dpr: number;
}

export interface CameraState {
  isActive: boolean;
  isLoading: boolean;
  facingMode: CameraFacingMode;
  error: string | null;
  dimensions: CameraDimensions;
  deviceId?: string;
}

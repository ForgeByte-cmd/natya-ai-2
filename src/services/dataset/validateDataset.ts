import { DatasetMediaType, PerformanceMetadata } from '../../types/dataset';

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  fileMetadata?: {
    sizeMB: number;
    mimeType: string;
    fileExtension: string;
    width?: number;
    height?: number;
    durationSeconds?: number;
  };
}

const ACCEPTED_VIDEO_TYPES = ['video/mp4', 'video/webm', 'video/quicktime', 'video/x-matroska'];
const ACCEPTED_VIDEO_EXTENSIONS = ['.mp4', '.webm', '.mov'];

const ACCEPTED_PHOTO_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'];
const ACCEPTED_PHOTO_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp'];

const MAX_VIDEO_SIZE_BYTES = 300 * 1024 * 1024; // 300MB
const MAX_PHOTO_SIZE_BYTES = 30 * 1024 * 1024; // 30MB

export function getAcceptedFileExtensions(mediaType: DatasetMediaType): string[] {
  switch (mediaType) {
    case 'PERFORMANCE_VIDEO':
    case 'MOVEMENT_VIDEO':
      return ACCEPTED_VIDEO_EXTENSIONS;
    case 'PERFORMANCE_PHOTO':
    case 'MUDRA_PHOTO':
    case 'POSE_PHOTO':
      return ACCEPTED_PHOTO_EXTENSIONS;
    case 'TRAINING_SEQUENCE':
      return ['.json', ...ACCEPTED_VIDEO_EXTENSIONS];
    default:
      return [...ACCEPTED_VIDEO_EXTENSIONS, ...ACCEPTED_PHOTO_EXTENSIONS];
  }
}

export function isVideoMediaType(mediaType: DatasetMediaType): boolean {
  return mediaType === 'PERFORMANCE_VIDEO' || mediaType === 'MOVEMENT_VIDEO';
}

export function isPhotoMediaType(mediaType: DatasetMediaType): boolean {
  return (
    mediaType === 'PERFORMANCE_PHOTO' ||
    mediaType === 'MUDRA_PHOTO' ||
    mediaType === 'POSE_PHOTO'
  );
}

export async function validateMediaFile(
  file: File,
  mediaType: DatasetMediaType
): Promise<ValidationResult> {
  const errors: string[] = [];
  const warnings: string[] = [];

  const fileExtension = '.' + (file.name.split('.').pop() || '').toLowerCase();
  const mimeType = file.type || '';
  const sizeMB = file.size / (1024 * 1024);

  const isVideo = isVideoMediaType(mediaType);
  const isPhoto = isPhotoMediaType(mediaType);

  // Validate Video
  if (isVideo) {
    const isExtensionValid = ACCEPTED_VIDEO_EXTENSIONS.includes(fileExtension);
    const isMimeValid = ACCEPTED_VIDEO_TYPES.some((t) => mimeType.includes(t.replace('video/', '')));

    if (!isExtensionValid && !isMimeValid) {
      errors.push(
        `Invalid video file format (${fileExtension || mimeType}). Supported formats: MP4, WebM, MOV.`
      );
    }

    if (file.size > MAX_VIDEO_SIZE_BYTES) {
      errors.push(
        `Video size (${sizeMB.toFixed(1)}MB) exceeds the maximum allowed limit of 300MB.`
      );
    }

    // Inspect video dimensions and duration via HTMLVideoElement
    try {
      const videoDimensions = await inspectVideoFile(file);
      if (videoDimensions.durationSeconds && videoDimensions.durationSeconds > 600) {
        warnings.push(
          `Video is longer than 10 minutes (${Math.round(videoDimensions.durationSeconds / 60)} min). Processing may take slightly longer.`
        );
      }
      if (videoDimensions.durationSeconds && videoDimensions.durationSeconds < 1) {
        errors.push('Video duration is too short (under 1 second). Please upload a usable dance recording.');
      }
      if (videoDimensions.width && videoDimensions.width < 320) {
        warnings.push('Video resolution is lower than 360p. Computer-vision landmark detection may have reduced accuracy.');
      }
      return {
        isValid: errors.length === 0,
        errors,
        warnings,
        fileMetadata: {
          sizeMB,
          mimeType,
          fileExtension,
          width: videoDimensions.width,
          height: videoDimensions.height,
          durationSeconds: videoDimensions.durationSeconds,
        },
      };
    } catch {
      warnings.push('Could not verify video headers ahead of time; proceeding with validation.');
    }
  }

  // Validate Photo
  if (isPhoto) {
    const isExtensionValid = ACCEPTED_PHOTO_EXTENSIONS.includes(fileExtension);
    const isMimeValid = ACCEPTED_PHOTO_TYPES.some((t) => mimeType.includes(t.replace('image/', '')));

    if (!isExtensionValid && !isMimeValid) {
      errors.push(
        `Invalid photo file format (${fileExtension || mimeType}). Supported formats: JPG, JPEG, PNG, WEBP.`
      );
    }

    if (file.size > MAX_PHOTO_SIZE_BYTES) {
      errors.push(
        `Image size (${sizeMB.toFixed(1)}MB) exceeds maximum allowed limit of 30MB.`
      );
    }

    try {
      const imgDimensions = await inspectImageFile(file);
      if (imgDimensions.width && imgDimensions.width < 200) {
        warnings.push('Image resolution is very low. Hand or pose landmarks may not be detected reliably.');
      }
      return {
        isValid: errors.length === 0,
        errors,
        warnings,
        fileMetadata: {
          sizeMB,
          mimeType,
          fileExtension,
          width: imgDimensions.width,
          height: imgDimensions.height,
        },
      };
    } catch {
      // Proceed
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    fileMetadata: {
      sizeMB,
      mimeType,
      fileExtension,
    },
  };
}

export function validatePerformanceMetadata(
  metadata: PerformanceMetadata,
  mediaType: DatasetMediaType
): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!metadata.danceFormId) {
    errors.push('Dance form must be selected from the verified database.');
  }

  if (!metadata.performerConsent) {
    errors.push('Performer consent is required to process and archive performance media.');
  }

  if (!metadata.uploaderAuthorization) {
    errors.push('Uploader authorization and usage rights confirmation is mandatory.');
  }

  if (mediaType === 'MUDRA_PHOTO' && !metadata.mudraId) {
    errors.push('A specific mudra from the Natyashastra collection must be selected for mudra photo samples.');
  }

  if (mediaType === 'POSE_PHOTO' && !metadata.poseId) {
    errors.push('A specific stance/pose from the verified poses collection must be selected.');
  }

  if (mediaType === 'MOVEMENT_VIDEO' && !metadata.movementId) {
    errors.push('A specific codified movement must be selected for movement video samples.');
  }

  if (!metadata.source || !metadata.source.title) {
    errors.push('Source attribution (e.g. Guru/Institution/Tradition) must be provided.');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

function inspectVideoFile(file: File): Promise<{ width: number; height: number; durationSeconds: number }> {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    video.preload = 'metadata';
    const objectUrl = URL.createObjectURL(file);
    video.src = objectUrl;

    video.onloadedmetadata = () => {
      URL.revokeObjectURL(objectUrl);
      resolve({
        width: video.videoWidth,
        height: video.videoHeight,
        durationSeconds: video.duration,
      });
    };

    video.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('Video metadata extraction failed'));
    };
  });
}

function inspectImageFile(file: File): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);
    img.src = objectUrl;

    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      resolve({
        width: img.naturalWidth,
        height: img.naturalHeight,
      });
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('Image loading failed'));
    };
  });
}

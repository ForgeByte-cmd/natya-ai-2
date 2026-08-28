import { DatasetFrame } from '../../types/dataset';

export interface FrameExtractionOptions {
  intervalSeconds?: number;
  maxFrames?: number;
  targetWidth?: number;
  targetHeight?: number;
  onProgress?: (progress: number, currentFrame: number, totalExpected: number) => void;
}

export async function extractFramesFromVideo(
  videoFileOrUrl: File | string,
  options: FrameExtractionOptions = {}
): Promise<{ frames: DatasetFrame[]; duration: number; thumbnailUrl: string }> {
  const {
    intervalSeconds = 1.0,
    maxFrames = 30,
    targetWidth = 640,
    targetHeight = 480,
    onProgress,
  } = options;

  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    video.crossOrigin = 'anonymous';
    video.muted = true;
    video.playsInline = true;

    let srcUrl = '';
    if (typeof videoFileOrUrl === 'string') {
      srcUrl = videoFileOrUrl;
    } else {
      srcUrl = URL.createObjectURL(videoFileOrUrl);
    }
    video.src = srcUrl;

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d', { willReadFrequently: true });

    if (!ctx) {
      reject(new Error('Canvas 2D context creation failed'));
      return;
    }

    video.onloadedmetadata = async () => {
      const duration = video.duration || 1;
      
      // Calculate timestamps to extract
      const step = Math.max(intervalSeconds, duration / maxFrames);
      const timestamps: number[] = [];
      for (let t = 0; t < duration; t += step) {
        timestamps.push(t);
        if (timestamps.length >= maxFrames) break;
      }
      if (timestamps.length === 0) timestamps.push(0);

      // Determine aspect ratio scaling
      const aspect = video.videoWidth / (video.videoHeight || 1);
      const width = targetWidth;
      const height = Math.round(targetWidth / (aspect || 1.33));
      canvas.width = width;
      canvas.height = height;

      const extractedFrames: DatasetFrame[] = [];
      let firstThumbnailUrl = '';

      try {
        for (let i = 0; i < timestamps.length; i++) {
          const timestamp = timestamps[i];
          
          await seekVideo(video, timestamp);
          
          ctx.drawImage(video, 0, 0, width, height);
          const dataUrl = canvas.toDataURL('image/jpeg', 0.85);

          if (i === 0) {
            firstThumbnailUrl = dataUrl;
          }

          extractedFrames.push({
            frameIndex: i,
            timestamp: Number(timestamp.toFixed(2)),
            imageUrl: dataUrl,
          });

          if (onProgress) {
            const progress = Math.round(((i + 1) / timestamps.length) * 100);
            onProgress(progress, i + 1, timestamps.length);
          }
        }

        if (typeof videoFileOrUrl !== 'string') {
          URL.revokeObjectURL(srcUrl);
        }

        resolve({
          frames: extractedFrames,
          duration,
          thumbnailUrl: firstThumbnailUrl || extractedFrames[0]?.imageUrl || '',
        });
      } catch (err) {
        if (typeof videoFileOrUrl !== 'string') {
          URL.revokeObjectURL(srcUrl);
        }
        reject(err);
      }
    };

    video.onerror = (e) => {
      if (typeof videoFileOrUrl !== 'string') {
        URL.revokeObjectURL(srcUrl);
      }
      reject(new Error('Failed to load video for frame extraction'));
    };
  });
}

function seekVideo(video: HTMLVideoElement, time: number): Promise<void> {
  return new Promise((resolve) => {
    const onSeeked = () => {
      video.removeEventListener('seeked', onSeeked);
      // Give browser a microtask to render the decoded frame to canvas
      setTimeout(() => resolve(), 30);
    };
    video.addEventListener('seeked', onSeeked);
    video.currentTime = Math.min(time, Math.max(0, video.duration - 0.05));
  });
}

export function generatePhotoThumbnail(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.src = url;

    img.onload = () => {
      const canvas = document.createElement('canvas');
      const maxDim = 480;
      let width = img.naturalWidth;
      let height = img.naturalHeight;

      if (width > height) {
        if (width > maxDim) {
          height = Math.round((height * maxDim) / width);
          width = maxDim;
        }
      } else {
        if (height > maxDim) {
          width = Math.round((width * maxDim) / height);
          height = maxDim;
        }
      }

      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(img, 0, 0, width, height);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.88);
        URL.revokeObjectURL(url);
        resolve(dataUrl);
      } else {
        URL.revokeObjectURL(url);
        resolve(url);
      }
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Failed to create thumbnail from image'));
    };
  });
}

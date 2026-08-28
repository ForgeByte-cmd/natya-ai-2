import {
  DatasetSample,
  DatasetUploadItem,
  PerformanceAnalysisReport,
} from '../../types/dataset';
import { validateMediaFile, validatePerformanceMetadata } from './validateDataset';
import { processPerformanceMedia } from './processVideo';
import { saveDatasetSample } from './createDatasetRecord';
import { analyzePerformanceMedia } from './analyzePerformance';
import { DANCE_FORMS } from '../../data/dances/danceForms';
import { ASAMYUTA_MUDRAS } from '../../data/mudras/asamyuta';
import { SAMYUTA_MUDRAS } from '../../data/mudras/samyuta';
import { DANCE_POSES } from '../../data/poses/dancePoses';
import { DANCE_MOVEMENTS } from '../../data/movements/danceMovements';

export async function uploadSingleDatasetItem(
  item: DatasetUploadItem,
  onUpdate: (updatedItem: DatasetUploadItem) => void
): Promise<{ sample: DatasetSample; report: PerformanceAnalysisReport }> {
  try {
    // 1. Initial State: Validating
    onUpdate({
      ...item,
      status: 'UPLOADING',
      progress: 10,
      stageMessage: 'Validating media format, resolution & metadata...',
    });

    const fileValidation = await validateMediaFile(item.file, item.mediaType);
    if (!fileValidation.isValid) {
      throw new Error(fileValidation.errors.join(' '));
    }

    const metadataValidation = validatePerformanceMetadata(item.metadata, item.mediaType);
    if (!metadataValidation.isValid) {
      throw new Error(metadataValidation.errors.join(' '));
    }

    // 2. Uploading Stage
    onUpdate({
      ...item,
      status: 'UPLOADING',
      progress: 35,
      stageMessage: 'Uploading media to secure storage...',
    });

    await simulateNetworkDelay(400);

    const sampleId = `sample_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const objectUrl = URL.createObjectURL(item.file);

    // 3. Processing Media & Frame/Landmark Extraction
    onUpdate({
      ...item,
      status: 'PROCESSING',
      progress: 50,
      stageMessage: 'Processing... Extracting frames...',
    });

    const processed = await processPerformanceMedia(
      item.file,
      item.mediaType,
      item.metadata,
      sampleId,
      (p) => {
        onUpdate({
          ...item,
          status: 'PROCESSING',
          progress: 50 + Math.round(p.progress * 0.35),
          stageMessage: p.message,
        });
      }
    );

    // 4. Resolve human-readable names
    const df = DANCE_FORMS.find((d) => d.id === item.metadata.danceFormId);
    const mudra = [...ASAMYUTA_MUDRAS, ...SAMYUTA_MUDRAS].find((m) => m.id === item.metadata.mudraId);
    const pose = DANCE_POSES.find((p) => p.id === item.metadata.poseId);
    const mov = DANCE_MOVEMENTS.find((m) => m.id === item.metadata.movementId);

    const sampleTitle =
      item.metadata.description?.slice(0, 50) ||
      `${df?.name || 'Dance'} - ${mudra?.name || pose?.name || 'Performance Sample'}`;

    // 5. Create Dataset Record
    onUpdate({
      ...item,
      status: 'PROCESSING',
      progress: 90,
      stageMessage: 'Creating dataset record & generating shastric report...',
    });

    const datasetSample: DatasetSample = {
      id: sampleId,
      title: sampleTitle,
      mediaType: item.mediaType,
      mediaUrl: objectUrl,
      thumbnailUrl: processed.thumbnailUrl,
      danceFormId: item.metadata.danceFormId,
      danceFormName: df?.name || item.metadata.danceFormId,
      mudraId: item.metadata.mudraId,
      mudraName: mudra?.name,
      poseId: item.metadata.poseId,
      poseName: pose?.name,
      movementId: item.metadata.movementId,
      movementName: mov?.name,
      metadata: item.metadata,
      status: 'UNVERIFIED',
      uploadedBy: 'researcher_upload@natyai.org',
      createdAt: new Date().toISOString(),
      qualityMetrics: processed.qualityMetrics,
      duration: processed.duration,
      frameCount: processed.frames.length,
      extractedFrames: processed.frames,
      trainingSequence: processed.trainingSequence,
    };

    saveDatasetSample(datasetSample);

    // 6. Automatically generate AI Performance Analysis & Shastric Meaning Report
    const report = await analyzePerformanceMedia({
      sampleId,
      title: sampleTitle,
      mediaType: item.mediaType,
      mediaUrl: objectUrl,
      thumbnailUrl: processed.thumbnailUrl,
      metadata: item.metadata,
      frames: processed.frames,
      duration: processed.duration,
    });

    // 7. Completed
    onUpdate({
      ...item,
      status: 'COMPLETED',
      progress: 100,
      stageMessage: 'Completed successfully! Sample added to verification queue.',
      sampleId,
    });

    return { sample: datasetSample, report };
  } catch (err: any) {
    const errorMsg = err?.message || 'Failed to process and upload dataset sample.';
    onUpdate({
      ...item,
      status: 'FAILED',
      progress: 0,
      error: errorMsg,
      stageMessage: `Failed: ${errorMsg}`,
    });
    throw err;
  }
}

function simulateNetworkDelay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

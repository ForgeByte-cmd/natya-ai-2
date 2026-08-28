import React, { useState, useRef } from 'react';
import { Upload, Film, Image as ImageIcon, Sparkles, CheckCircle, AlertCircle, Loader2, ArrowRight } from 'lucide-react';
import { DatasetMediaType, DatasetUploadItem, PerformanceMetadata, DatasetSample } from '../../types/dataset';
import { getAcceptedFileExtensions, isVideoMediaType, validateMediaFile } from '../../services/dataset/validateDataset';
import { uploadSingleDatasetItem } from '../../services/dataset/uploadDataset';
import { DatasetPreview } from './DatasetPreview';
import { DatasetProgress } from './DatasetProgress';

interface DatasetUploaderProps {
  mediaType: DatasetMediaType;
  metadata: PerformanceMetadata;
  onSampleCreated?: (sample: DatasetSample) => void;
  onNavigateToPerformance?: (performanceId: string) => void;
}

export function DatasetUploader({
  mediaType,
  metadata,
  onSampleCreated,
  onNavigateToPerformance,
}: DatasetUploaderProps) {
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [uploadQueue, setUploadQueue] = useState<DatasetUploadItem[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploadingGlobal, setIsUploadingGlobal] = useState(false);
  const [completedSamples, setCompletedSamples] = useState<DatasetSample[]>([]);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const acceptedExtensions = getAcceptedFileExtensions(mediaType);
  const isVideo = isVideoMediaType(mediaType);

  const handleFilesSelected = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const fileArray = Array.from(files);
    setSelectedFiles((prev) => [...prev, ...fileArray]);
  };

  const handleRemoveFile = (index: number) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files) {
      handleFilesSelected(e.dataTransfer.files);
    }
  };

  const startUploadPipeline = async () => {
    if (selectedFiles.length === 0 || isUploadingGlobal) return;

    if (!metadata.performerConsent || !metadata.uploaderAuthorization) {
      alert('Performer consent and uploader rights confirmation are mandatory before uploading.');
      return;
    }

    setIsUploadingGlobal(true);

    // Initialize items in upload queue
    const initialItems: DatasetUploadItem[] = selectedFiles.map((file) => ({
      id: `item_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      file,
      mediaType,
      metadata: { ...metadata },
      status: 'QUEUED',
      progress: 0,
      stageMessage: 'Queued for validation & processing...',
    }));

    setUploadQueue(initialItems);
    setSelectedFiles([]); // Clear selected file preview since they are now in queue

    // Process each item independently so one failure does not cancel others
    const newlyCreatedSamples: DatasetSample[] = [];

    for (let i = 0; i < initialItems.length; i++) {
      const currentItem = initialItems[i];
      try {
        const result = await uploadSingleDatasetItem(currentItem, (updatedItem) => {
          setUploadQueue((prev) =>
            prev.map((item) => (item.id === updatedItem.id ? updatedItem : item))
          );
        });

        newlyCreatedSamples.push(result.sample);
        onSampleCreated?.(result.sample);
      } catch (err) {
        console.error('Single upload failed:', err);
      }
    }

    setCompletedSamples((prev) => [...prev, ...newlyCreatedSamples]);
    setIsUploadingGlobal(false);
  };

  return (
    <div id="dataset-uploader-container" className="space-y-6">
      {/* Drag & Drop File Zone */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`relative border-2 border-dashed rounded-2xl p-8 md:p-12 text-center cursor-pointer transition-all duration-200 ${
          isDragging
            ? 'border-amber-500 bg-amber-950/30 scale-[1.01]'
            : 'border-stone-700 hover:border-amber-500/80 bg-stone-900/60 hover:bg-stone-900'
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept={acceptedExtensions.join(',')}
          onChange={(e) => handleFilesSelected(e.target.files)}
          className="hidden"
        />

        <div className="flex flex-col items-center justify-center space-y-3">
          <div className="w-14 h-14 rounded-2xl bg-stone-800 border border-stone-700 flex items-center justify-center text-amber-400 group-hover:scale-110 transition shadow-inner">
            {isVideo ? <Film className="w-7 h-7" /> : <ImageIcon className="w-7 h-7" />}
          </div>

          <div>
            <h3 className="text-base md:text-lg font-bold text-white">
              Drag & drop performance {isVideo ? 'video recordings' : 'photographs'} here
            </h3>
            <p className="text-xs text-stone-400 mt-1">
              or click to browse from local device (Multiple files supported)
            </p>
          </div>

          <div className="flex items-center space-x-2 pt-2 text-[11px] text-stone-400">
            <span className="px-2 py-0.5 rounded bg-stone-800 font-mono">
              Accepted: {acceptedExtensions.join(', ').toUpperCase()}
            </span>
            <span>•</span>
            <span>Max Size: {isVideo ? '300 MB' : '30 MB'}</span>
          </div>
        </div>
      </div>

      {/* Previews for Selected Files */}
      {selectedFiles.length > 0 && (
        <div className="space-y-4">
          <DatasetPreview
            files={selectedFiles}
            mediaType={mediaType}
            onRemoveFile={handleRemoveFile}
          />

          {/* Action button to initiate upload pipeline */}
          <div className="flex items-center justify-end space-x-3 pt-2">
            <button
              onClick={() => setSelectedFiles([])}
              className="px-4 py-2 bg-stone-800 hover:bg-stone-700 text-stone-300 rounded-xl text-xs font-semibold transition"
            >
              Clear Selection
            </button>

            <button
              id="btn-start-upload"
              onClick={startUploadPipeline}
              disabled={isUploadingGlobal || !metadata.performerConsent}
              className={`flex items-center space-x-2 px-6 py-2.5 rounded-xl text-xs font-bold text-white transition shadow-lg ${
                isUploadingGlobal || !metadata.performerConsent
                  ? 'bg-stone-700 text-stone-400 cursor-not-allowed'
                  : 'bg-gradient-to-r from-amber-600 to-rose-600 hover:from-amber-500 hover:to-rose-500 shadow-amber-950/50'
              }`}
            >
              {isUploadingGlobal ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Processing Uploads...</span>
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4" />
                  <span>Upload & Analyze {selectedFiles.length} File{selectedFiles.length > 1 ? 's' : ''}</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Active Upload Queue with Progress */}
      {uploadQueue.length > 0 && (
        <DatasetProgress
          items={uploadQueue}
          onRemoveItem={(id) => setUploadQueue((prev) => prev.filter((i) => i.id !== id))}
        />
      )}

      {/* Successfully Processed Samples Quick Jump */}
      {completedSamples.length > 0 && (
        <div className="p-4 rounded-xl bg-emerald-950/30 border border-emerald-800/50 space-y-3">
          <div className="flex items-center space-x-2 text-emerald-300 text-xs font-bold">
            <CheckCircle className="w-4 h-4 text-emerald-400" />
            <span>Successfully Processed & Analyzed ({completedSamples.length})</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {completedSamples.map((sample) => (
              <div
                key={sample.id}
                className="flex items-center justify-between p-3 bg-stone-900/90 border border-stone-800 rounded-xl"
              >
                <div className="flex items-center space-x-2.5 min-w-0">
                  <div className="w-10 h-10 rounded-lg bg-stone-950 overflow-hidden shrink-0 border border-stone-800">
                    <img
                      src={sample.thumbnailUrl || sample.mediaUrl}
                      alt={sample.title}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="min-w-0">
                    <h5 className="text-xs font-semibold text-white truncate max-w-[160px]">
                      {sample.title}
                    </h5>
                    <p className="text-[10px] text-amber-400">
                      {sample.danceFormName} • {sample.status}
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => onNavigateToPerformance?.(sample.id)}
                  className="flex items-center space-x-1 px-2.5 py-1.5 bg-amber-600 hover:bg-amber-500 text-white rounded-lg text-[11px] font-bold transition shrink-0 ml-2"
                >
                  <span>View Analysis</span>
                  <ArrowRight className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

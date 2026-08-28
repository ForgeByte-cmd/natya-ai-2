import React from 'react';
import { Film, Image as ImageIcon, Sparkles, X, RefreshCw } from 'lucide-react';
import { DatasetMediaType } from '../../types/dataset';

interface DatasetPreviewProps {
  files: File[];
  mediaType: DatasetMediaType;
  onRemoveFile: (index: number) => void;
  onReplaceFile?: (index: number) => void;
}

export function DatasetPreview({
  files,
  mediaType,
  onRemoveFile,
  onReplaceFile,
}: DatasetPreviewProps) {
  if (files.length === 0) return null;

  const isVideo = mediaType === 'PERFORMANCE_VIDEO' || mediaType === 'MOVEMENT_VIDEO';

  return (
    <div id="dataset-preview-grid" className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-xs font-bold uppercase tracking-wider text-stone-400">
          Selected Media Previews ({files.length})
        </h4>
        <span className="text-[11px] text-amber-400 font-mono">
          Ready for processing & landmark extraction
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {files.map((file, idx) => {
          const previewUrl = URL.createObjectURL(file);
          const sizeMB = (file.size / (1024 * 1024)).toFixed(1);

          return (
            <div
              key={`${file.name}_${idx}`}
              className="relative group bg-stone-900 border border-stone-800 rounded-xl overflow-hidden p-2.5 flex flex-col justify-between"
            >
              {/* Media Preview Box */}
              <div className="relative aspect-video bg-stone-950 rounded-lg overflow-hidden flex items-center justify-center border border-stone-800/80 mb-2">
                {isVideo ? (
                  <video
                    src={previewUrl}
                    className="w-full h-full object-cover"
                    muted
                    playsInline
                    onLoadedMetadata={(e) => URL.revokeObjectURL(previewUrl)}
                  />
                ) : (
                  <img
                    src={previewUrl}
                    alt={file.name}
                    className="w-full h-full object-cover"
                    onLoad={() => URL.revokeObjectURL(previewUrl)}
                  />
                )}

                <div className="absolute top-1.5 left-1.5 px-2 py-0.5 rounded-md bg-stone-950/80 backdrop-blur-sm border border-stone-700/80 text-[10px] font-semibold text-stone-200 flex items-center space-x-1">
                  {isVideo ? <Film className="w-3 h-3 text-rose-400" /> : <ImageIcon className="w-3 h-3 text-amber-400" />}
                  <span>{isVideo ? 'Video' : 'Photo'}</span>
                </div>

                <button
                  onClick={() => onRemoveFile(idx)}
                  className="absolute top-1.5 right-1.5 p-1 rounded-md bg-stone-900/90 hover:bg-rose-900 text-stone-300 hover:text-white border border-stone-700/80 transition"
                  title="Remove file"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Info footer */}
              <div className="flex items-center justify-between text-[11px] text-stone-400">
                <span className="truncate max-w-[140px]" title={file.name}>
                  {file.name}
                </span>
                <span className="font-mono text-stone-300">{sizeMB} MB</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

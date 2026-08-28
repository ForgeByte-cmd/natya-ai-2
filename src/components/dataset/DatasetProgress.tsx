import React from 'react';
import { CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { DatasetUploadItem } from '../../types/dataset';

interface DatasetProgressProps {
  items: DatasetUploadItem[];
  onRemoveItem?: (id: string) => void;
  onRetryItem?: (item: DatasetUploadItem) => void;
}

export function DatasetProgress({ items, onRemoveItem, onRetryItem }: DatasetProgressProps) {
  if (items.length === 0) return null;

  return (
    <div id="dataset-upload-progress-container" className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-xs font-bold uppercase tracking-wider text-stone-400">
          Upload Queue ({items.length} file{items.length > 1 ? 's' : ''})
        </h4>
        <span className="text-[11px] text-stone-400">
          {items.filter((i) => i.status === 'COMPLETED').length} / {items.length} Completed
        </span>
      </div>

      <div className="space-y-2.5">
        {items.map((item) => {
          const isUploading = item.status === 'UPLOADING';
          const isProcessing = item.status === 'PROCESSING';
          const isCompleted = item.status === 'COMPLETED';
          const isFailed = item.status === 'FAILED';

          return (
            <div
              key={item.id}
              className={`p-3.5 rounded-xl border transition-all ${
                isCompleted
                  ? 'bg-emerald-950/20 border-emerald-800/40 text-emerald-100'
                  : isFailed
                  ? 'bg-rose-950/20 border-rose-800/40 text-rose-100'
                  : 'bg-stone-900/90 border-stone-800 text-stone-200'
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-2">
                    <span className="text-xs font-semibold truncate max-w-[220px] sm:max-w-md">
                      {item.file.name}
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-stone-800 text-stone-300 font-mono">
                      {(item.file.size / (1024 * 1024)).toFixed(1)} MB
                    </span>
                  </div>

                  <p className="text-[11px] mt-1 text-stone-400 flex items-center space-x-1.5">
                    {isUploading && <Loader2 className="w-3 h-3 animate-spin text-amber-400" />}
                    {isProcessing && <Loader2 className="w-3 h-3 animate-spin text-rose-400" />}
                    {isCompleted && <CheckCircle2 className="w-3 h-3 text-emerald-400" />}
                    {isFailed && <AlertCircle className="w-3 h-3 text-rose-400" />}
                    <span>{item.stageMessage || item.status}</span>
                  </p>
                </div>

                <div className="flex items-center space-x-2 text-right">
                  <span className="text-xs font-mono font-bold text-amber-400">
                    {item.progress}%
                  </span>
                  {onRemoveItem && !isUploading && !isProcessing && (
                    <button
                      onClick={() => onRemoveItem(item.id)}
                      className="text-stone-400 hover:text-rose-400 text-xs px-1.5 py-0.5 rounded hover:bg-stone-800 transition"
                    >
                      ✕
                    </button>
                  )}
                </div>
              </div>

              {/* Progress bar */}
              <div className="w-full h-1.5 bg-stone-800 rounded-full overflow-hidden mt-2.5">
                <div
                  className={`h-full transition-all duration-300 ${
                    isCompleted
                      ? 'bg-emerald-500'
                      : isFailed
                      ? 'bg-rose-500'
                      : 'bg-gradient-to-r from-amber-500 to-rose-500'
                  }`}
                  style={{ width: `${item.progress}%` }}
                />
              </div>

              {isFailed && item.error && (
                <div className="mt-2 text-[11px] text-rose-300 bg-rose-950/60 p-2 rounded-lg border border-rose-800/40">
                  <strong>Error:</strong> {item.error}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

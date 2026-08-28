import React, { useState } from 'react';
import {
  Film,
  Image as ImageIcon,
  CheckCircle2,
  Clock,
  XCircle,
  Eye,
  Trash2,
  Award,
  Sparkles,
  ExternalLink,
  ChevronRight,
} from 'lucide-react';
import { DatasetSample } from '../../types/dataset';

interface DatasetTableProps {
  samples: DatasetSample[];
  onReviewSample: (sample: DatasetSample) => void;
  onViewPerformance: (performanceId: string) => void;
  onDeleteSample: (sampleId: string) => void;
}

export function DatasetTable({
  samples,
  onReviewSample,
  onViewPerformance,
  onDeleteSample,
}: DatasetTableProps) {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const selectAll = () => {
    if (selectedIds.length === samples.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(samples.map((s) => s.id));
    }
  };

  if (samples.length === 0) {
    return (
      <div className="text-center py-12 bg-stone-900/60 border border-stone-800 rounded-2xl p-6">
        <Sparkles className="w-8 h-8 text-stone-500 mx-auto mb-2" />
        <h4 className="text-sm font-bold text-stone-300">No Dataset Samples Found</h4>
        <p className="text-xs text-stone-500 mt-1 max-w-sm mx-auto">
          No records match your active search filters. Try clearing search filters or uploading new performance media.
        </p>
      </div>
    );
  }

  return (
    <div id="dataset-samples-table-wrapper" className="space-y-3">
      {/* Table header / actions bar */}
      <div className="flex items-center justify-between px-2">
        <span className="text-xs text-stone-400 font-mono">
          Showing {samples.length} sample{samples.length > 1 ? 's' : ''}
        </span>
      </div>

      {/* Responsive Table Container */}
      <div className="bg-stone-900 border border-stone-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-stone-300">
            <thead className="bg-stone-950/80 border-b border-stone-800 text-[11px] font-bold text-stone-400 uppercase tracking-wider">
              <tr>
                <th className="p-3.5 pl-4 w-10">
                  <input
                    type="checkbox"
                    checked={selectedIds.length > 0 && selectedIds.length === samples.length}
                    onChange={selectAll}
                    className="rounded border-stone-700 text-amber-600 focus:ring-amber-500 bg-stone-900"
                  />
                </th>
                <th className="p-3.5">Sample / Media</th>
                <th className="p-3.5">Dance Tradition</th>
                <th className="p-3.5">Shastric Labels</th>
                <th className="p-3.5">Quality</th>
                <th className="p-3.5">Status</th>
                <th className="p-3.5 text-right pr-4">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-800/80">
              {samples.map((sample) => {
                const isVideo = sample.mediaType.includes('VIDEO');
                const isSelected = selectedIds.includes(sample.id);

                return (
                  <tr
                    key={sample.id}
                    className={`hover:bg-stone-850/60 transition ${
                      isSelected ? 'bg-amber-950/20' : ''
                    }`}
                  >
                    {/* Checkbox */}
                    <td className="p-3.5 pl-4">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleSelect(sample.id)}
                        className="rounded border-stone-700 text-amber-600 focus:ring-amber-500 bg-stone-900"
                      />
                    </td>

                    {/* Media Thumbnail & Title */}
                    <td className="p-3.5">
                      <div className="flex items-center space-x-3 min-w-[200px] max-w-xs">
                        <div className="relative w-14 h-10 rounded-lg bg-stone-950 border border-stone-800 overflow-hidden shrink-0">
                          <img
                            src={sample.thumbnailUrl || sample.mediaUrl}
                            alt={sample.title}
                            className="w-full h-full object-cover"
                          />
                          <div className="absolute bottom-0.5 right-0.5 p-0.5 bg-stone-950/80 rounded text-[9px] text-stone-300">
                            {isVideo ? <Film className="w-2.5 h-2.5 text-rose-400" /> : <ImageIcon className="w-2.5 h-2.5 text-amber-400" />}
                          </div>
                        </div>

                        <div className="min-w-0">
                          <div
                            onClick={() => onViewPerformance(sample.id)}
                            className="font-bold text-stone-100 hover:text-amber-400 cursor-pointer truncate max-w-[180px]"
                            title={sample.title}
                          >
                            {sample.title}
                          </div>
                          <div className="text-[10px] text-stone-400 truncate max-w-[180px]">
                            {sample.metadata?.source?.title || 'Archive Collection'}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Dance Tradition */}
                    <td className="p-3.5 whitespace-nowrap">
                      <div className="font-semibold text-stone-200">
                        {sample.danceFormName || sample.danceFormId}
                      </div>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-stone-800 text-stone-400">
                        {sample.metadata?.category || 'CLASSICAL'}
                      </span>
                    </td>

                    {/* Shastric Labels */}
                    <td className="p-3.5">
                      <div className="flex flex-wrap gap-1 max-w-[200px]">
                        {sample.mudraName && (
                          <span className="px-1.5 py-0.5 rounded bg-amber-950/60 border border-amber-800/40 text-amber-300 text-[10px] font-mono">
                            ✋ {sample.mudraName.split(' ')[0]}
                          </span>
                        )}
                        {sample.poseName && (
                          <span className="px-1.5 py-0.5 rounded bg-blue-950/60 border border-blue-800/40 text-blue-300 text-[10px] font-mono">
                            🧘 {sample.poseName.split(' ')[0]}
                          </span>
                        )}
                        {sample.movementName && (
                          <span className="px-1.5 py-0.5 rounded bg-emerald-950/60 border border-emerald-800/40 text-emerald-300 text-[10px] font-mono">
                            ⚡ {sample.movementName.split(' ')[0]}
                          </span>
                        )}
                        {!sample.mudraName && !sample.poseName && !sample.movementName && (
                          <span className="text-stone-500 text-[10px]">Choreography</span>
                        )}
                      </div>
                    </td>

                    {/* Kinematic Quality Score */}
                    <td className="p-3.5 whitespace-nowrap">
                      {sample.qualityMetrics ? (
                        <div className="flex items-center space-x-1.5">
                          <div className="w-8 bg-stone-800 h-1.5 rounded-full overflow-hidden">
                            <div
                              className="bg-emerald-500 h-full"
                              style={{ width: `${Math.round(sample.qualityMetrics.frameIntegrityScore * 100)}%` }}
                            />
                          </div>
                          <span className="font-mono text-[11px] text-emerald-400">
                            {Math.round(sample.qualityMetrics.frameIntegrityScore * 100)}%
                          </span>
                        </div>
                      ) : (
                        <span className="text-stone-500 text-[10px]">N/A</span>
                      )}
                    </td>

                    {/* Status Badge */}
                    <td className="p-3.5 whitespace-nowrap">
                      {sample.status === 'APPROVED' && (
                        <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full bg-emerald-950 border border-emerald-800 text-emerald-300 text-[10px] font-bold">
                          <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                          <span>Approved</span>
                        </span>
                      )}
                      {sample.status === 'UNVERIFIED' && (
                        <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full bg-amber-950 border border-amber-800 text-amber-300 text-[10px] font-bold">
                          <Clock className="w-3 h-3 text-amber-400" />
                          <span>Pending Review</span>
                        </span>
                      )}
                      {sample.status === 'REJECTED' && (
                        <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full bg-rose-950 border border-rose-800 text-rose-300 text-[10px] font-bold">
                          <XCircle className="w-3 h-3 text-rose-400" />
                          <span>Rejected</span>
                        </span>
                      )}
                    </td>

                    {/* Action buttons */}
                    <td className="p-3.5 text-right pr-4 whitespace-nowrap">
                      <div className="flex items-center justify-end space-x-1.5">
                        <button
                          onClick={() => onReviewSample(sample)}
                          className="px-2.5 py-1 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-200 hover:text-white text-[11px] font-semibold transition"
                          title="Review, inspect landmarks and validate"
                        >
                          Review
                        </button>

                        <button
                          onClick={() => onViewPerformance(sample.id)}
                          className="px-2.5 py-1 rounded-lg bg-amber-950/80 hover:bg-amber-900 border border-amber-800/60 text-amber-300 text-[11px] font-semibold transition"
                          title="View Full AI Analysis Report"
                        >
                          Analysis
                        </button>

                        <button
                          onClick={() => {
                            if (confirm(`Are you sure you want to delete "${sample.title}"?`)) {
                              onDeleteSample(sample.id);
                            }
                          }}
                          className="p-1 text-stone-500 hover:text-rose-400 rounded hover:bg-stone-800 transition"
                          title="Delete sample"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

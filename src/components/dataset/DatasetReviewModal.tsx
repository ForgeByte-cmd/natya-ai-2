import React, { useState } from 'react';
import {
  X,
  CheckCircle,
  XCircle,
  Eye,
  Sparkles,
  ShieldCheck,
  Film,
  Image as ImageIcon,
  Layers,
  Award,
} from 'lucide-react';
import { DatasetSample, DatasetStatus } from '../../types/dataset';
import { DANCE_FORMS } from '../../data/dances/danceForms';
import { ASAMYUTA_MUDRAS } from '../../data/mudras/asamyuta';
import { SAMYUTA_MUDRAS } from '../../data/mudras/samyuta';
import { DANCE_POSES } from '../../data/poses/dancePoses';
import { DANCE_MOVEMENTS } from '../../data/movements/danceMovements';
import { updateDatasetSampleStatus, updateDatasetSampleLabels } from '../../services/dataset/createDatasetRecord';

interface DatasetReviewModalProps {
  sample: DatasetSample;
  onClose: () => void;
  onUpdated: (updatedSample: DatasetSample) => void;
}

export function DatasetReviewModal({
  sample,
  onClose,
  onUpdated,
}: DatasetReviewModalProps) {
  const [selectedDanceForm, setSelectedDanceForm] = useState(sample.danceFormId);
  const [selectedMudra, setSelectedMudra] = useState(sample.mudraId || '');
  const [selectedPose, setSelectedPose] = useState(sample.poseId || '');
  const [selectedMovement, setSelectedMovement] = useState(sample.movementId || '');
  const [reviewNotes, setReviewNotes] = useState(sample.reviewNotes || '');
  const [reviewerName, setReviewerName] = useState(sample.reviewedBy || 'Natyashastra Senior Reviewer');
  const [showSkeletonOverlay, setShowSkeletonOverlay] = useState(true);

  const isVideo = sample.mediaType.includes('VIDEO');
  const allMudras = [...ASAMYUTA_MUDRAS, ...SAMYUTA_MUDRAS];

  const handleApprove = () => {
    // 1. Save label edits
    updateDatasetSampleLabels(sample.id, {
      danceFormId: selectedDanceForm,
      mudraId: selectedMudra || undefined,
      poseId: selectedPose || undefined,
      movementId: selectedMovement || undefined,
      notes: reviewNotes,
    });

    // 2. Approve status
    const updated = updateDatasetSampleStatus(
      sample.id,
      'APPROVED',
      reviewerName,
      reviewNotes || 'Verified against Shastric grammar and Anga-shuddhi rules.'
    );

    if (updated) {
      onUpdated(updated);
      onClose();
    }
  };

  const handleReject = () => {
    const updated = updateDatasetSampleStatus(
      sample.id,
      'REJECTED',
      reviewerName,
      reviewNotes || 'Insufficient landmark clarity or posture deviation.'
    );

    if (updated) {
      onUpdated(updated);
      onClose();
    }
  };

  const handleSaveLabelsOnly = () => {
    const updated = updateDatasetSampleLabels(sample.id, {
      danceFormId: selectedDanceForm,
      mudraId: selectedMudra || undefined,
      poseId: selectedPose || undefined,
      movementId: selectedMovement || undefined,
      notes: reviewNotes,
    });

    if (updated) {
      onUpdated(updated);
      alert('Labels and annotations saved successfully.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-950/80 backdrop-blur-md overflow-y-auto">
      <div className="relative w-full max-w-4xl bg-stone-900 border border-stone-800 rounded-2xl shadow-2xl overflow-hidden max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 md:p-5 border-b border-stone-800 bg-stone-950/60 shrink-0">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-xl bg-amber-950/50 border border-amber-800/40 text-amber-400">
              <Award className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">
                Human Review & Shastric Validation
              </h3>
              <p className="text-xs text-stone-400">
                Sample ID: <span className="font-mono text-stone-300">{sample.id}</span>
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-stone-400 hover:text-white rounded-xl hover:bg-stone-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="p-5 md:p-6 overflow-y-auto space-y-6 flex-1">
          {/* Main Grid: Media Viewer on Left, Annotation Form on Right */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left: Media Player + Skeleton Toggle */}
            <div className="space-y-3">
              <div className="relative aspect-video bg-stone-950 rounded-xl overflow-hidden border border-stone-800 flex items-center justify-center">
                {isVideo ? (
                  <video
                    src={sample.mediaUrl}
                    controls
                    className="w-full h-full object-contain"
                    poster={sample.thumbnailUrl}
                  />
                ) : (
                  <img
                    src={sample.mediaUrl || sample.thumbnailUrl}
                    alt={sample.title}
                    className="w-full h-full object-contain"
                  />
                )}

                {/* Simulated Skeleton Overlay indicator */}
                {showSkeletonOverlay && (
                  <div className="absolute top-3 right-3 px-2.5 py-1 bg-stone-950/85 backdrop-blur-sm border border-emerald-500/60 rounded-lg text-[10px] font-mono text-emerald-400 flex items-center space-x-1.5 pointer-events-none">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    <span>33-Pt Pose & Hand Mesh Active</span>
                  </div>
                )}
              </div>

              {/* Overlay Toggle & Media Type */}
              <div className="flex items-center justify-between px-1">
                <div className="flex items-center space-x-2 text-xs text-stone-400">
                  {isVideo ? <Film className="w-3.5 h-3.5 text-rose-400" /> : <ImageIcon className="w-3.5 h-3.5 text-amber-400" />}
                  <span>{sample.mediaType}</span>
                  {sample.duration ? <span>• {sample.duration.toFixed(1)}s</span> : null}
                </div>

                <button
                  onClick={() => setShowSkeletonOverlay(!showSkeletonOverlay)}
                  className={`flex items-center space-x-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold border transition ${
                    showSkeletonOverlay
                      ? 'bg-emerald-950/50 border-emerald-700 text-emerald-300'
                      : 'bg-stone-800 border-stone-700 text-stone-400'
                  }`}
                >
                  <Layers className="w-3.5 h-3.5" />
                  <span>{showSkeletonOverlay ? 'Hide CV Landmarks' : 'Show CV Landmarks'}</span>
                </button>
              </div>

              {/* Quality Metrics Box */}
              {sample.qualityMetrics && (
                <div className="p-3.5 bg-stone-950 rounded-xl border border-stone-800 space-y-2">
                  <h5 className="text-[11px] font-bold uppercase tracking-wider text-stone-400">
                    Kinematic Quality Metrics
                  </h5>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="flex justify-between">
                      <span className="text-stone-400">Body Visibility:</span>
                      <span className="font-mono text-emerald-400">
                        {Math.round(sample.qualityMetrics.bodyVisibilityScore * 100)}%
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-stone-400">Hand Clarity:</span>
                      <span className="font-mono text-emerald-400">
                        {Math.round(sample.qualityMetrics.handVisibilityScore * 100)}%
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-stone-400">Frame Integrity:</span>
                      <span className="font-mono text-emerald-400">
                        {Math.round(sample.qualityMetrics.frameIntegrityScore * 100)}%
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-stone-400">Lighting Score:</span>
                      <span className="font-mono text-emerald-400">
                        {Math.round(sample.qualityMetrics.lightingScore * 100)}%
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Right: Shastric Annotation & Label Adjustment Form */}
            <div className="space-y-4">
              <h4 className="text-xs font-bold uppercase tracking-wider text-amber-400 flex items-center space-x-1.5">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Adjust Shastric Annotations</span>
              </h4>

              {/* Dance Form Selector */}
              <div>
                <label className="block text-xs font-semibold text-stone-300 mb-1">
                  Dance Tradition
                </label>
                <select
                  value={selectedDanceForm}
                  onChange={(e) => setSelectedDanceForm(e.target.value)}
                  className="w-full px-3 py-2 bg-stone-950 border border-stone-700 rounded-xl text-xs text-stone-100 focus:outline-none focus:border-amber-500"
                >
                  {DANCE_FORMS.map((df) => (
                    <option key={df.id} value={df.id}>
                      {df.name} ({df.category})
                    </option>
                  ))}
                </select>
              </div>

              {/* Mudra Selector */}
              <div>
                <label className="block text-xs font-semibold text-stone-300 mb-1">
                  Mudra / Hasta Label
                </label>
                <select
                  value={selectedMudra}
                  onChange={(e) => setSelectedMudra(e.target.value)}
                  className="w-full px-3 py-2 bg-stone-950 border border-stone-700 rounded-xl text-xs text-stone-100 focus:outline-none focus:border-amber-500"
                >
                  <option value="">None / General Movement</option>
                  {allMudras.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name} ({m.sanskritName})
                    </option>
                  ))}
                </select>
              </div>

              {/* Pose Selector */}
              <div>
                <label className="block text-xs font-semibold text-stone-300 mb-1">
                  Stance / Sthana Pose
                </label>
                <select
                  value={selectedPose}
                  onChange={(e) => setSelectedPose(e.target.value)}
                  className="w-full px-3 py-2 bg-stone-950 border border-stone-700 rounded-xl text-xs text-stone-100 focus:outline-none focus:border-amber-500"
                >
                  <option value="">None / Dynamic Transition</option>
                  {DANCE_POSES.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Movement Selector */}
              <div>
                <label className="block text-xs font-semibold text-stone-300 mb-1">
                  Codified Movement / Chari / Adavu
                </label>
                <select
                  value={selectedMovement}
                  onChange={(e) => setSelectedMovement(e.target.value)}
                  className="w-full px-3 py-2 bg-stone-950 border border-stone-700 rounded-xl text-xs text-stone-100 focus:outline-none focus:border-amber-500"
                >
                  <option value="">None / Static</option>
                  {DANCE_MOVEMENTS.map((mov) => (
                    <option key={mov.id} value={mov.id}>
                      {mov.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Reviewer Name */}
              <div>
                <label className="block text-xs font-semibold text-stone-300 mb-1">
                  Reviewer Name / Title
                </label>
                <input
                  type="text"
                  value={reviewerName}
                  onChange={(e) => setReviewerName(e.target.value)}
                  className="w-full px-3 py-2 bg-stone-950 border border-stone-700 rounded-xl text-xs text-stone-200 focus:outline-none focus:border-amber-500"
                />
              </div>

              {/* Reviewer Feedback Notes */}
              <div>
                <label className="block text-xs font-semibold text-stone-300 mb-1">
                  Shastric Review Feedback & Quality Notes
                </label>
                <textarea
                  rows={2}
                  value={reviewNotes}
                  onChange={(e) => setReviewNotes(e.target.value)}
                  placeholder="e.g. Verified Anga-shuddhi, crisp hand alignment, conforms to Abhinaya Darpana..."
                  className="w-full px-3 py-2 bg-stone-950 border border-stone-700 rounded-xl text-xs text-stone-200 focus:outline-none focus:border-amber-500"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Modal Action Footer */}
        <div className="flex flex-col sm:flex-row items-center justify-between p-4 md:p-5 border-t border-stone-800 bg-stone-950/80 shrink-0 gap-3">
          <div className="flex items-center space-x-2 text-xs">
            <span className="text-stone-400">Current Status:</span>
            <span
              className={`px-2.5 py-0.5 rounded-full font-bold uppercase ${
                sample.status === 'APPROVED'
                  ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                  : sample.status === 'REJECTED'
                  ? 'bg-rose-950 text-rose-400 border border-rose-800'
                  : 'bg-amber-950 text-amber-400 border border-amber-800'
              }`}
            >
              {sample.status}
            </span>
          </div>

          <div className="flex items-center space-x-2.5 w-full sm:w-auto justify-end">
            <button
              onClick={handleSaveLabelsOnly}
              className="px-3.5 py-2 bg-stone-800 hover:bg-stone-700 text-stone-300 rounded-xl text-xs font-semibold transition"
            >
              Save Labels
            </button>

            <button
              onClick={handleReject}
              className="flex items-center space-x-1.5 px-4 py-2 bg-rose-950 hover:bg-rose-900 border border-rose-800 text-rose-200 rounded-xl text-xs font-bold transition"
            >
              <XCircle className="w-4 h-4" />
              <span>Reject Sample</span>
            </button>

            <button
              onClick={handleApprove}
              className="flex items-center space-x-1.5 px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition shadow-lg shadow-emerald-950/50"
            >
              <CheckCircle className="w-4 h-4" />
              <span>Approve for Model Training</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

import React, { useState } from 'react';
import {
  Sparkles,
  BookOpen,
  Film,
  Image as ImageIcon,
  Clock,
  CheckCircle2,
  Share2,
  Download,
  ArrowLeft,
  Layers,
  ChevronRight,
  Info,
  Award,
} from 'lucide-react';
import { PerformanceAnalysisReport } from '../../types/dataset';

interface PerformanceResultViewProps {
  report: PerformanceAnalysisReport;
  onBack: () => void;
}

export function PerformanceResultView({ report, onBack }: PerformanceResultViewProps) {
  const [activeSegmentIndex, setActiveSegmentIndex] = useState(0);
  const [showLandmarkOverlay, setShowLandmarkOverlay] = useState(true);

  const isVideo = report.mediaType.includes('VIDEO');
  const activeSegment = report.timeline[activeSegmentIndex] || report.timeline[0];

  const handleExportJSON = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(report, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `performance_analysis_${report.performanceId}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  return (
    <div id="performance-analysis-result-view" className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Top Navigation Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-stone-800 pb-4">
        <div className="flex items-center space-x-3">
          <button
            onClick={onBack}
            className="p-2 rounded-xl bg-stone-900 border border-stone-800 text-stone-300 hover:text-white hover:bg-stone-800 transition"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-[11px] px-2 py-0.5 rounded-full bg-amber-950/80 border border-amber-800/60 text-amber-300 font-mono">
                {report.detectedDanceForms[0]?.name || 'Classical Dance'}
              </span>
              <span className="text-xs text-stone-400 font-mono">
                ID: {report.performanceId}
              </span>
            </div>
            <h1 className="text-lg md:text-xl font-bold text-white mt-0.5">
              {report.title}
            </h1>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center space-x-2 self-end sm:self-auto">
          <button
            onClick={handleExportJSON}
            className="flex items-center space-x-1.5 px-3 py-1.5 bg-stone-900 hover:bg-stone-800 border border-stone-700 text-stone-200 rounded-xl text-xs font-semibold transition"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export Report</span>
          </button>
        </div>
      </div>

      {/* Main Grid: Media Player & Interactive Timeline on Left, Deep Shastric Meaning on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column (7 cols): Media & Timeline */}
        <div className="lg:col-span-7 space-y-6">
          {/* Media Player */}
          <div className="bg-stone-900 border border-stone-800 rounded-2xl overflow-hidden shadow-xl p-3">
            <div className="relative aspect-video bg-stone-950 rounded-xl overflow-hidden flex items-center justify-center border border-stone-800">
              {isVideo ? (
                <video
                  src={report.mediaUrl}
                  controls
                  className="w-full h-full object-contain"
                  poster={report.thumbnailUrl}
                />
              ) : (
                <img
                  src={report.mediaUrl || report.thumbnailUrl}
                  alt={report.title}
                  className="w-full h-full object-contain"
                />
              )}

              {/* Landmark overlay tag */}
              {showLandmarkOverlay && (
                <div className="absolute top-3 right-3 px-2.5 py-1 bg-stone-950/85 backdrop-blur-sm border border-emerald-500/60 rounded-lg text-[10px] font-mono text-emerald-400 flex items-center space-x-1.5 pointer-events-none">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span>MediaPipe 33-Pt Pose & Hand Tracking Active</span>
                </div>
              )}
            </div>

            <div className="flex items-center justify-between pt-3 px-1">
              <div className="flex items-center space-x-2 text-xs text-stone-400">
                {isVideo ? <Film className="w-3.5 h-3.5 text-rose-400" /> : <ImageIcon className="w-3.5 h-3.5 text-amber-400" />}
                <span>{isVideo ? 'Temporal Video Sequence' : 'Static Performance Photograph'}</span>
              </div>

              <button
                onClick={() => setShowLandmarkOverlay(!showLandmarkOverlay)}
                className="text-xs text-amber-400 hover:text-amber-300 font-semibold transition"
              >
                {showLandmarkOverlay ? 'Disable Landmark Overlay' : 'Enable Landmark Overlay'}
              </button>
            </div>
          </div>

          {/* Interactive Performance Timeline */}
          <div className="bg-stone-900 border border-stone-800 rounded-2xl p-5 shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-white flex items-center space-x-2">
                <Clock className="w-4 h-4 text-amber-400" />
                <span>Kinematic & Narrative Timeline</span>
              </h3>
              <span className="text-[11px] text-stone-400">
                {report.timeline.length} milestone segment{report.timeline.length > 1 ? 's' : ''}
              </span>
            </div>

            {/* Timeline Segment Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
              {report.timeline.map((seg, idx) => {
                const isActive = activeSegmentIndex === idx;

                return (
                  <div
                    key={idx}
                    onClick={() => setActiveSegmentIndex(idx)}
                    className={`p-3 rounded-xl border cursor-pointer transition ${
                      isActive
                        ? 'bg-amber-950/40 border-amber-500 shadow-md ring-1 ring-amber-500/50'
                        : 'bg-stone-950/70 border-stone-800 hover:border-stone-700'
                    }`}
                  >
                    <div className="flex items-center justify-between text-[11px] mb-1">
                      <span className="font-mono text-amber-400 font-bold">
                        {seg.timestampFormatted}
                      </span>
                      <span className="text-[9px] px-1.5 py-0.5 rounded bg-stone-800 text-stone-300 uppercase font-mono">
                        {seg.eventType}
                      </span>
                    </div>

                    <p className="text-xs text-stone-200 font-medium line-clamp-2">
                      {seg.shastricDescription}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right Column (5 cols): Shastric Meaning, Viniyoga, Story & Evidence */}
        <div className="lg:col-span-5 space-y-6">
          {/* Shastric Summary Card */}
          <div className="bg-stone-900 border border-stone-800 rounded-2xl p-5 shadow-xl space-y-3.5">
            <div className="flex items-center space-x-2 text-amber-400">
              <Award className="w-4 h-4" />
              <h3 className="text-sm font-bold uppercase tracking-wider">
                Natyashastra Synthesis
              </h3>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-3 bg-stone-950 rounded-xl border border-stone-800/80">
                <span className="text-stone-400 text-[11px] block">Rasa & Bhava</span>
                <span className="font-bold text-amber-300 text-sm mt-0.5 block">
                  {report.shastricSummary.rasaBhava}
                </span>
              </div>

              <div className="p-3 bg-stone-950 rounded-xl border border-stone-800/80">
                <span className="text-stone-400 text-[11px] block">Anga-Shuddhi</span>
                <span className="font-bold text-emerald-400 text-sm mt-0.5 block font-mono">
                  {Math.round(report.shastricSummary.angaShuddhiScore * 100)}%
                </span>
              </div>
            </div>

            <div className="p-3 bg-stone-950 rounded-xl border border-stone-800/80 text-xs">
              <span className="text-stone-400 text-[11px] block">Primary Viniyoga (Usage)</span>
              <p className="text-stone-200 mt-1 font-medium">
                {report.shastricSummary.primaryViniyoga}
              </p>
            </div>

            <div className="p-3 bg-stone-950 rounded-xl border border-stone-800/80 text-xs">
              <span className="text-stone-400 text-[11px] block">Scriptural Authority</span>
              <p className="text-stone-300 mt-1 font-mono text-[11px]">
                {report.shastricSummary.scripturalRef}
              </p>
            </div>
          </div>

          {/* Mudra Meaning & Contextual Disambiguation ("Why" Evidence) */}
          <div className="bg-stone-900 border border-stone-800 rounded-2xl p-5 shadow-xl space-y-4">
            <h3 className="text-sm font-bold text-white flex items-center space-x-2">
              <Sparkles className="w-4 h-4 text-amber-400" />
              <span>Mudra Contextual Disambiguation</span>
            </h3>

            {report.mudraAnalysis.map((mudra) => (
              <div key={mudra.mudraId} className="space-y-3">
                <div className="flex items-center justify-between border-b border-stone-800 pb-2">
                  <div>
                    <h4 className="text-sm font-bold text-amber-300">
                      {mudra.mudraName} ({mudra.sanskritName})
                    </h4>
                    <span className="text-[11px] text-stone-400">
                      Handedness: {mudra.handedness} • {Math.round(mudra.detectedConfidence * 100)}% Confidence
                    </span>
                  </div>
                </div>

                {/* Contextual Meaning (Highlighted) */}
                <div className="p-3.5 bg-amber-950/30 border border-amber-700/60 rounded-xl">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-amber-400">
                    Most Contextually Likely Meaning
                  </div>
                  <div className="text-sm font-bold text-white mt-1">
                    "{mudra.contextualMeaning}"
                  </div>
                </div>

                {/* Clear "Why" Evidence */}
                <div className="space-y-1.5 bg-stone-950 p-3.5 rounded-xl border border-stone-800">
                  <div className="text-[11px] font-bold text-stone-300 flex items-center space-x-1.5">
                    <Info className="w-3.5 h-3.5 text-blue-400" />
                    <span>Evidence for this interpretation:</span>
                  </div>
                  <ul className="space-y-1 pl-4 list-disc text-xs text-stone-400">
                    {mudra.contextEvidence.map((ev, i) => (
                      <li key={i}>{ev}</li>
                    ))}
                  </ul>
                </div>

                {/* Multi-Meanings List from Shastras */}
                <div className="space-y-1.5">
                  <div className="text-[11px] font-bold text-stone-400">
                    Other Codified Meanings (Viniyogas in Abhinaya Darpana):
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {mudra.possibleMeanings.slice(0, 5).map((m, i) => (
                      <span
                        key={i}
                        className="px-2 py-0.5 rounded-lg bg-stone-950 border border-stone-800 text-[11px] text-stone-300"
                      >
                        {m.meaning}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Progressive Story Reconstruction */}
          <div className="bg-stone-900 border border-stone-800 rounded-2xl p-5 shadow-xl space-y-3">
            <h3 className="text-sm font-bold text-white flex items-center space-x-2">
              <BookOpen className="w-4 h-4 text-amber-400" />
              <span>Progressive Narrative Story State</span>
            </h3>

            <div className="p-3 bg-stone-950 rounded-xl border border-stone-800 space-y-2">
              <div className="text-xs font-bold text-amber-400">
                {report.story.currentScene}
              </div>
              <p className="text-xs text-stone-300 leading-relaxed">
                {report.story.currentNarrativeState}
              </p>
            </div>

            <div className="space-y-1">
              <span className="text-[11px] font-semibold text-stone-400">Choreographic Progression:</span>
              <div className="space-y-1.5">
                {report.story.narrativeEvents.map((evt, idx) => (
                  <div key={idx} className="flex items-center space-x-2 text-xs text-stone-300">
                    <span className="w-4 h-4 rounded-full bg-stone-800 text-stone-400 flex items-center justify-center text-[9px] font-mono shrink-0">
                      {idx + 1}
                    </span>
                    <span>{evt}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Movement Analysis Notice if Photo */}
          {!report.movementAnalysisAvailable && (
            <div className="p-3.5 bg-stone-950 border border-stone-800/80 rounded-xl flex items-start space-x-2 text-xs text-stone-400">
              <Info className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <span>
                <strong>Static Image Note:</strong> Temporal movement analysis, velocity, and footwork transitions are unavailable for photographs. Full movement kinetics are computed for video uploads.
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

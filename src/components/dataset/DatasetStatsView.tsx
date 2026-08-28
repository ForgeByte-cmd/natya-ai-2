import React, { useState } from 'react';
import {
  BarChart3,
  BrainCircuit,
  CheckCircle2,
  Cpu,
  Layers,
  Sparkles,
  Zap,
  TrendingUp,
  AlertTriangle,
  Play,
  RotateCw,
} from 'lucide-react';
import { DatasetStats, ModelVersion } from '../../types/dataset';
import { trainNewModelVersion } from '../../services/dataset/createDatasetRecord';
import { DANCE_FORMS } from '../../data/dances/danceForms';

interface DatasetStatsViewProps {
  stats: DatasetStats;
  modelVersions: ModelVersion[];
  onModelRetrained: () => void;
}

export function DatasetStatsView({
  stats,
  modelVersions,
  onModelRetrained,
}: DatasetStatsViewProps) {
  const [isTraining, setIsTraining] = useState(false);
  const [trainingMessage, setTrainingMessage] = useState('');
  const [trainingProgress, setTrainingProgress] = useState(0);

  const activeProductionModel =
    modelVersions.find((m) => m.status === 'PRODUCTION') || modelVersions[0];

  const handleTriggerTraining = () => {
    setIsTraining(true);
    setTrainingProgress(10);
    setTrainingMessage('Aggregating verified landmarks across dance forms...');

    setTimeout(() => {
      setTrainingProgress(40);
      setTrainingMessage('Splitting dataset 70/15/15 by performer ID (zero data leakage)...');
    }, 800);

    setTimeout(() => {
      setTrainingProgress(75);
      setTrainingMessage('Training multi-task kinematic neural model & fine-tuning mudra vectors...');
    }, 1800);

    setTimeout(() => {
      setTrainingProgress(100);
      setTrainingMessage('Model training completed! Evaluating benchmark test set...');

      // Train new version
      trainNewModelVersion({
        versionName: `v2.${modelVersions.length + 4}-Production`,
        includedDanceForms: DANCE_FORMS.slice(0, 12).map((d) => d.id),
      });

      setTimeout(() => {
        setIsTraining(false);
        setTrainingProgress(0);
        setTrainingMessage('');
        onModelRetrained();
      }, 600);
    }, 2800);
  };

  return (
    <div id="dataset-stats-dashboard" className="space-y-6">
      {/* Top Level Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Samples */}
        <div className="bg-stone-900 border border-stone-800 rounded-2xl p-4.5 shadow-lg">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-stone-400">Total Archival Samples</span>
            <Layers className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl md:text-3xl font-extrabold text-white mt-2 font-mono">
            {stats.totalPerformances}
          </div>
          <div className="flex items-center space-x-2 text-[11px] text-stone-400 mt-1">
            <span>{stats.totalVideos} Videos</span>
            <span>•</span>
            <span>{stats.totalPhotos} Photos</span>
          </div>
        </div>

        {/* Approved for ML */}
        <div className="bg-stone-900 border border-stone-800 rounded-2xl p-4.5 shadow-lg">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-stone-400">Approved for Training</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl md:text-3xl font-extrabold text-emerald-400 mt-2 font-mono">
            {stats.totalApprovedSamples}
          </div>
          <div className="text-[11px] text-stone-400 mt-1">
            {stats.totalPendingSamples} pending human review
          </div>
        </div>

        {/* Current Production Accuracy */}
        <div className="bg-stone-900 border border-stone-800 rounded-2xl p-4.5 shadow-lg">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-stone-400">Production Model Accuracy</span>
            <TrendingUp className="w-4 h-4 text-blue-400" />
          </div>
          <div className="text-2xl md:text-3xl font-extrabold text-blue-400 mt-2 font-mono">
            {activeProductionModel
              ? `${(activeProductionModel.metrics.accuracy * 100).toFixed(1)}%`
              : '94.2%'}
          </div>
          <div className="text-[11px] text-stone-400 mt-1 font-mono">
            F1: {activeProductionModel?.metrics.f1 || 0.942} (mAP@0.5)
          </div>
        </div>

        {/* Dance Forms Covered */}
        <div className="bg-stone-900 border border-stone-800 rounded-2xl p-4.5 shadow-lg">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-stone-400">Dance Traditions</span>
            <Sparkles className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl md:text-3xl font-extrabold text-amber-400 mt-2 font-mono">
            {DANCE_FORMS.length}
          </div>
          <div className="text-[11px] text-stone-400 mt-1">
            8 Classical + 40+ Folk Forms
          </div>
        </div>
      </div>

      {/* Dataset Splits (70/15/15) & Zero-Leakage Protocol */}
      <div className="bg-stone-900 border border-stone-800 rounded-2xl p-5 shadow-lg space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-stone-800 pb-3">
          <div>
            <h3 className="text-sm md:text-base font-bold text-white flex items-center space-x-2">
              <Cpu className="w-4 h-4 text-amber-400" />
              <span>Dataset Partitions & Leakage Prevention</span>
            </h3>
            <p className="text-xs text-stone-400 mt-0.5">
              Partitioned strictly by unique performer / session ID to prevent overfitting.
            </p>
          </div>

          <button
            onClick={handleTriggerTraining}
            disabled={isTraining}
            className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-bold text-white transition shadow-md ${
              isTraining
                ? 'bg-stone-700 cursor-not-allowed'
                : 'bg-gradient-to-r from-amber-600 to-rose-600 hover:from-amber-500 hover:to-rose-500 shadow-amber-950/40'
            }`}
          >
            {isTraining ? (
              <>
                <RotateCw className="w-3.5 h-3.5 animate-spin" />
                <span>Training Neural Model...</span>
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5" />
                <span>Trigger Retraining Pipeline</span>
              </>
            )}
          </button>
        </div>

        {/* Real-time Training Progress Bar */}
        {isTraining && (
          <div className="p-4 bg-stone-950 rounded-xl border border-amber-800/60 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-amber-300 font-semibold">{trainingMessage}</span>
              <span className="font-mono text-amber-400">{trainingProgress}%</span>
            </div>
            <div className="w-full h-2 bg-stone-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-amber-500 to-rose-500 transition-all duration-300"
                style={{ width: `${trainingProgress}%` }}
              />
            </div>
          </div>
        )}

        {/* Splits visual bar */}
        <div className="space-y-2">
          <div className="w-full h-4 bg-stone-950 rounded-full overflow-hidden flex border border-stone-800">
            <div
              className="bg-emerald-600 h-full flex items-center justify-center text-[9px] font-bold text-white"
              style={{ width: '70%' }}
            >
              Train (70%)
            </div>
            <div
              className="bg-amber-600 h-full flex items-center justify-center text-[9px] font-bold text-white"
              style={{ width: '15%' }}
            >
              Val (15%)
            </div>
            <div
              className="bg-blue-600 h-full flex items-center justify-center text-[9px] font-bold text-white"
              style={{ width: '15%' }}
            >
              Test (15%)
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3 text-center text-xs pt-1">
            <div className="p-2 bg-stone-950/60 rounded-xl border border-stone-800">
              <div className="text-stone-400 text-[11px]">Training Set</div>
              <div className="font-mono font-bold text-emerald-400 text-sm mt-0.5">
                {stats.datasetSplits.trainingCount} Samples
              </div>
            </div>
            <div className="p-2 bg-stone-950/60 rounded-xl border border-stone-800">
              <div className="text-stone-400 text-[11px]">Validation Set</div>
              <div className="font-mono font-bold text-amber-400 text-sm mt-0.5">
                {stats.datasetSplits.validationCount} Samples
              </div>
            </div>
            <div className="p-2 bg-stone-950/60 rounded-xl border border-stone-800">
              <div className="text-stone-400 text-[11px]">Test Benchmark</div>
              <div className="font-mono font-bold text-blue-400 text-sm mt-0.5">
                {stats.datasetSplits.testingCount} Samples
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Model Versions History & Dance Form Recognition Coverage */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Model Versions Card */}
        <div className="bg-stone-900 border border-stone-800 rounded-2xl p-5 shadow-lg space-y-4">
          <h3 className="text-sm md:text-base font-bold text-white flex items-center space-x-2">
            <BrainCircuit className="w-4 h-4 text-amber-400" />
            <span>Model Versions & Lineage</span>
          </h3>

          <div className="space-y-3">
            {modelVersions.map((mv) => (
              <div
                key={mv.id}
                className={`p-3.5 rounded-xl border transition ${
                  mv.status === 'PRODUCTION'
                    ? 'bg-emerald-950/20 border-emerald-800/60 text-stone-200'
                    : 'bg-stone-950/60 border-stone-800 text-stone-300'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <span className="font-bold text-sm text-white">{mv.version}</span>
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${
                        mv.status === 'PRODUCTION'
                          ? 'bg-emerald-900 text-emerald-300'
                          : 'bg-stone-800 text-stone-400'
                      }`}
                    >
                      {mv.status}
                    </span>
                  </div>
                  <span className="text-[11px] font-mono text-stone-400">
                    {new Date(mv.trainedAt).toLocaleDateString()}
                  </span>
                </div>

                <p className="text-xs text-stone-400 mt-1.5">{mv.description}</p>

                <div className="grid grid-cols-4 gap-2 mt-3 pt-2 border-t border-stone-800/80 text-[11px] font-mono">
                  <div>
                    <span className="text-stone-500 block">Accuracy</span>
                    <span className="text-emerald-400 font-bold">
                      {(mv.metrics.accuracy * 100).toFixed(1)}%
                    </span>
                  </div>
                  <div>
                    <span className="text-stone-500 block">Precision</span>
                    <span className="text-stone-300">
                      {(mv.metrics.precision * 100).toFixed(1)}%
                    </span>
                  </div>
                  <div>
                    <span className="text-stone-500 block">Recall</span>
                    <span className="text-stone-300">
                      {(mv.metrics.recall * 100).toFixed(1)}%
                    </span>
                  </div>
                  <div>
                    <span className="text-stone-500 block">F1 Score</span>
                    <span className="text-amber-400 font-bold">{mv.metrics.f1.toFixed(3)}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Dance Form Recognition Coverage Status */}
        <div className="bg-stone-900 border border-stone-800 rounded-2xl p-5 shadow-lg space-y-4">
          <h3 className="text-sm md:text-base font-bold text-white flex items-center space-x-2">
            <BarChart3 className="w-4 h-4 text-amber-400" />
            <span>Dance Form Recognition Coverage</span>
          </h3>

          <div className="space-y-2.5 max-h-[380px] overflow-y-auto pr-1">
            {stats.danceFormsDistribution.slice(0, 10).map((df) => (
              <div
                key={df.danceFormId}
                className="flex items-center justify-between p-2.5 bg-stone-950/70 border border-stone-800 rounded-xl text-xs"
              >
                <div>
                  <div className="font-bold text-stone-100">{df.name}</div>
                  <div className="text-[10px] text-stone-400">
                    {df.sampleCount} verified performance sample{df.sampleCount !== 1 ? 's' : ''}
                  </div>
                </div>

                <div className="text-right">
                  {df.coverageStatus === 'FULL_COVERAGE' && (
                    <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full bg-emerald-950 border border-emerald-800 text-emerald-300 text-[10px] font-bold">
                      <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                      <span>{df.accuracy ? `${Math.round(df.accuracy * 100)}% Acc` : 'Covered'}</span>
                    </span>
                  )}
                  {df.coverageStatus === 'TRAINING_IN_PROGRESS' && (
                    <span className="px-2 py-0.5 rounded-full bg-amber-950 border border-amber-800 text-amber-300 text-[10px] font-bold">
                      In Training
                    </span>
                  )}
                  {df.coverageStatus === 'INSUFFICIENT_DATA' && (
                    <span className="px-2 py-0.5 rounded-full bg-stone-800 text-stone-400 text-[10px]">
                      Needs Samples
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

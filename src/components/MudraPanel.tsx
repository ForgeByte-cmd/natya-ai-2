import React, { useState } from 'react';
import { Sparkles, Info, Hand, Layers } from 'lucide-react';
import { MudraObservation } from '../types/mudra';
import { RecognitionResult } from '../types/pipeline';
import { MudraDetailModal } from './MudraDetailModal';

interface MudraPanelProps {
  leftMudra: MudraObservation | null;
  rightMudra: MudraObservation | null;
  samyutaMudra?: RecognitionResult | null;
  isDetectingMudra: boolean;
}

export const MudraPanel: React.FC<MudraPanelProps> = ({
  leftMudra,
  rightMudra,
  samyutaMudra,
  isDetectingMudra,
}) => {
  const [selectedMudraId, setSelectedMudraId] = useState<string | null>(null);

  return (
    <>
      <div id="mudra-panel" className="w-full bg-stone-900/90 border border-stone-800 rounded-2xl p-4 shadow-xl">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center space-x-2">
            <Hand className="w-4 h-4 text-sky-400" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-stone-300">
              Active Mudra Recognition (Hasta Viniyoga)
            </h3>
          </div>

          {isDetectingMudra && (
            <span className="text-[11px] text-amber-400/90 animate-pulse flex items-center space-x-1">
              <Sparkles className="w-3 h-3" />
              <span>Analyzing Fingers...</span>
            </span>
          )}
        </div>

        {/* Samyuta Combined Mudra Banner if Active */}
        {samyutaMudra && samyutaMudra.status === 'CONFIRMED' && (
          <div
            id="samyuta-mudra-banner"
            className="mb-3 p-3 rounded-xl bg-gradient-to-r from-amber-950/40 via-amber-900/30 to-amber-950/40 border border-amber-500/50 flex items-center justify-between shadow-lg"
          >
            <div className="flex items-center space-x-2.5">
              <div className="p-2 rounded-lg bg-amber-500/20 text-amber-300">
                <Layers className="w-4 h-4" />
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400">
                  Combined Gesture (Samyuta Hasta)
                </span>
                <h4 className="text-sm font-bold text-white">{samyutaMudra.label}</h4>
                {samyutaMudra.sanskritName && (
                  <p className="text-xs font-serif text-amber-200/90">{samyutaMudra.sanskritName}</p>
                )}
              </div>
            </div>
            <div className="text-right">
              <span className="text-[10px] text-amber-300/80 block">Confidence</span>
              <span className="text-xs font-mono font-bold text-amber-300">
                {Math.round(samyutaMudra.confidence * 100)}%
              </span>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* Left Hand Card */}
          <MudraCard
            handedness="Left"
            mudra={leftMudra}
            onInspect={(id) => setSelectedMudraId(id)}
          />

          {/* Right Hand Card */}
          <MudraCard
            handedness="Right"
            mudra={rightMudra}
            onInspect={(id) => setSelectedMudraId(id)}
          />
        </div>
      </div>

      {/* Deep Dive Modal */}
      <MudraDetailModal
        mudraId={selectedMudraId}
        onClose={() => setSelectedMudraId(null)}
      />
    </>
  );
};

interface MudraCardProps {
  handedness: 'Left' | 'Right';
  mudra: MudraObservation | null;
  onInspect: (mudraId: string) => void;
}

const MudraCard: React.FC<MudraCardProps> = ({ handedness, mudra, onInspect }) => {
  const isLeft = handedness === 'Left';
  const badgeColor = isLeft ? 'border-sky-500/40 bg-sky-950/30' : 'border-rose-500/40 bg-rose-950/30';
  const textColor = isLeft ? 'text-sky-400' : 'text-rose-400';

  if (!mudra || mudra.status === 'NO_HAND') {
    return (
      <div
        id={`card-mudra-${handedness.toLowerCase()}`}
        className="p-3.5 rounded-xl border border-stone-800/80 bg-stone-950/40 flex flex-col items-center justify-center text-center min-h-[105px]"
      >
        <span className={`text-[11px] font-bold uppercase tracking-wider ${textColor} mb-1`}>
          {handedness} Hand
        </span>
        <span className="text-xs text-stone-400">Position hand in camera view</span>
      </div>
    );
  }

  // Detecting / Unstable State
  if (mudra.status === 'DETECTING' || !mudra.isStable) {
    const progressPercent = Math.round((mudra.stabilityProgress ?? 0.5) * 100);
    return (
      <div
        id={`card-mudra-${handedness.toLowerCase()}`}
        className={`p-3.5 rounded-xl border border-amber-500/40 bg-amber-950/20 flex flex-col justify-between min-h-[105px] relative`}
      >
        <div>
          <div className="flex items-center justify-between mb-1">
            <span className={`text-[11px] font-bold uppercase tracking-wider ${textColor}`}>
              {handedness} Hand
            </span>
            <span className="text-[10px] font-bold text-amber-400/90 flex items-center space-x-1 animate-pulse">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
              <span>Analyzing...</span>
            </span>
          </div>

          <h4 className="text-sm font-bold text-stone-200">
            {mudra.provisionalName ? `Matching ${mudra.provisionalName}...` : 'Analyzing hand shape...'}
          </h4>
          <p className="text-[11px] text-stone-400 mt-0.5">
            Hold gesture steady to confirm
          </p>
        </div>

        {/* Temporal Stability Progress Bar */}
        <div className="mt-2.5 pt-2 border-t border-stone-800/60 flex items-center justify-between">
          <span className="text-[10px] text-stone-400">Stabilizing</span>
          <div className="flex items-center space-x-2">
            <div className="w-16 h-1.5 bg-stone-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-amber-400 rounded-full transition-all duration-150"
                style={{ width: `${Math.max(15, progressPercent)}%` }}
              />
            </div>
            <span className="text-[10px] font-mono text-amber-300">
              {progressPercent}%
            </span>
          </div>
        </div>
      </div>
    );
  }

  // Confirmed Stable Mudra State
  return (
    <div
      id={`card-mudra-${handedness.toLowerCase()}`}
      onClick={() => onInspect(mudra.mudraId)}
      className={`p-3.5 rounded-xl border ${badgeColor} hover:border-amber-500/60 cursor-pointer transition flex flex-col justify-between relative group min-h-[105px]`}
    >
      <div>
        <div className="flex items-center justify-between mb-1">
          <span className={`text-[11px] font-bold uppercase tracking-wider ${textColor}`}>
            {handedness} Hand
          </span>
          <span className="text-[10px] font-medium text-stone-400 flex items-center space-x-1 group-hover:text-amber-400">
            <span>Shastric Details</span>
            <Info className="w-3 h-3" />
          </span>
        </div>

        <h4 className="text-base font-bold text-white group-hover:text-amber-300 transition">
          {mudra.name}
        </h4>
        <p className="text-xs font-serif text-amber-200/80 mt-0.5">{mudra.sanskritName}</p>
      </div>

      {/* Confidence Bar */}
      <div className="mt-2.5 pt-2 border-t border-stone-800/60 flex items-center justify-between">
        <span className="text-[10px] text-stone-400">Confidence</span>
        <div className="flex items-center space-x-2">
          <div className="w-16 h-1.5 bg-stone-800 rounded-full overflow-hidden">
            <div
              className={`h-full ${isLeft ? 'bg-sky-400' : 'bg-rose-400'} rounded-full`}
              style={{ width: `${Math.round(mudra.confidence * 100)}%` }}
            />
          </div>
          <span className="text-[11px] font-mono font-bold text-stone-200">
            {Math.round(mudra.confidence * 100)}%
          </span>
        </div>
      </div>
    </div>
  );
};

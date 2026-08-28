import React from 'react';
import { Activity, AlertTriangle, CheckCircle2, ShieldAlert } from 'lucide-react';
import { PoseFeatures, PoseCandidate } from '../types/pose';
import { MovementObservation } from '../types/movement';

interface PracticeMetricsCardProps {
  poseFeatures: PoseFeatures | null;
  poseCandidates: PoseCandidate[];
  movement: MovementObservation | null;
}

export const PracticeMetricsCard: React.FC<PracticeMetricsCardProps> = ({
  poseFeatures,
  poseCandidates,
  movement,
}) => {
  if (!poseFeatures) {
    return (
      <div id="practice-metrics-empty" className="w-full bg-stone-900/90 border border-stone-800 rounded-2xl p-4 text-center">
        <Activity className="w-6 h-6 text-stone-400 mx-auto mb-2" />
        <p className="text-xs text-stone-400">Step back into full body view to calculate joint angles and symmetry metrics.</p>
      </div>
    );
  }

  const avgKneeAngle = Math.round((poseFeatures.leftKneeAngle + poseFeatures.rightKneeAngle) / 2);
  const aramandiTarget = 120;
  const aramandiDeviation = Math.abs(avgKneeAngle - aramandiTarget);

  // Generate real-time alignment tips
  const alignmentAlerts: string[] = [];
  if (poseFeatures.torsoInclination > 15) {
    alignmentAlerts.push('Torso leaning too far forward. Pull shoulders back and maintain vertical spine alignment.');
  }
  if (Math.abs(poseFeatures.leftKneeAngle - poseFeatures.rightKneeAngle) > 25) {
    alignmentAlerts.push('Uneven knee flexion detected. Distribute weight symmetrically across both feet.');
  }
  if (poseFeatures.isAramandiStance && aramandiDeviation > 20) {
    alignmentAlerts.push(`Deepen Aramandi: current knee angle is ${avgKneeAngle}°, target is ~115°–125°.`);
  }

  return (
    <div id="practice-metrics-card" className="w-full bg-stone-900/90 border border-stone-800 rounded-2xl p-4 shadow-xl space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Activity className="w-4 h-4 text-emerald-400" />
          <h3 className="text-xs font-bold uppercase tracking-wider text-stone-300">
            Anatomical & Shastric Metrics
          </h3>
        </div>
        {poseCandidates[0] && (
          <span className="text-xs font-semibold px-2 py-0.5 rounded bg-amber-950 text-amber-300 border border-amber-800">
            {poseCandidates[0].name}
          </span>
        )}
      </div>

      {/* Metric Gauges */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        {/* Left Knee */}
        <div className="bg-stone-950/60 p-2.5 rounded-xl border border-stone-800">
          <div className="text-[10px] text-stone-400 uppercase">Left Knee</div>
          <div className="text-base font-bold font-mono text-stone-100 mt-0.5">
            {Math.round(poseFeatures.leftKneeAngle)}°
          </div>
          <div className="text-[10px] text-stone-400">Flexion</div>
        </div>

        {/* Right Knee */}
        <div className="bg-stone-950/60 p-2.5 rounded-xl border border-stone-800">
          <div className="text-[10px] text-stone-400 uppercase">Right Knee</div>
          <div className="text-base font-bold font-mono text-stone-100 mt-0.5">
            {Math.round(poseFeatures.rightKneeAngle)}°
          </div>
          <div className="text-[10px] text-stone-400">Flexion</div>
        </div>

        {/* Torso Inclination */}
        <div className="bg-stone-950/60 p-2.5 rounded-xl border border-stone-800">
          <div className="text-[10px] text-stone-400 uppercase">Spine Tilt</div>
          <div className="text-base font-bold font-mono text-stone-100 mt-0.5">
            {Math.round(poseFeatures.torsoInclination)}°
          </div>
          <div className="text-[10px] text-emerald-400">
            {poseFeatures.torsoInclination < 10 ? 'Erect' : 'Inclined'}
          </div>
        </div>

        {/* Symmetry Score */}
        <div className="bg-stone-950/60 p-2.5 rounded-xl border border-stone-800">
          <div className="text-[10px] text-stone-400 uppercase">Symmetry</div>
          <div className="text-base font-bold font-mono text-stone-100 mt-0.5">
            {Math.round(poseFeatures.symmetryScore * 100)}%
          </div>
          <div className="text-[10px] text-stone-400">Equilibrium</div>
        </div>
      </div>

      {/* Real-Time Posture Alignment Guidance */}
      {alignmentAlerts.length > 0 ? (
        <div className="space-y-1.5 pt-1">
          {alignmentAlerts.map((alert, idx) => (
            <div
              key={idx}
              className="flex items-start space-x-2 text-xs text-amber-300 bg-amber-950/30 border border-amber-800/40 p-2 rounded-lg"
            >
              <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <span>{alert}</span>
            </div>
          ))}
        </div>
      ) : (
        <div className="flex items-center space-x-2 text-xs text-emerald-300 bg-emerald-950/30 border border-emerald-800/40 p-2 rounded-lg">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>Posture alignment is balanced and grounded according to traditional rules.</span>
        </div>
      )}

      {/* Movement Analysis if Active */}
      {movement && (
        <div className="pt-2 border-t border-stone-800 flex items-center justify-between text-xs">
          <span className="text-stone-400">Active Movement:</span>
          <span className="font-semibold text-amber-300">
            {movement.name} ({Math.round(movement.confidence * 100)}% match)
          </span>
        </div>
      )}
    </div>
  );
};

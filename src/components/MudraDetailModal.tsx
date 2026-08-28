import React from 'react';
import { X, BookOpen, ExternalLink, Sparkles, CheckCircle2 } from 'lucide-react';
import { MudraDefinition } from '../types/mudra';
import { ASAMYUTA_MUDRAS } from '../data/mudras/asamyuta';
import { SAMYUTA_MUDRAS } from '../data/mudras/samyuta';
import { TRADITION_SPECIFIC_MUDRAS } from '../data/mudras/traditions';

interface MudraDetailModalProps {
  mudraId: string | null;
  onClose: () => void;
}

export const MudraDetailModal: React.FC<MudraDetailModalProps> = ({ mudraId, onClose }) => {
  if (!mudraId) return null;

  const allMudras = [...ASAMYUTA_MUDRAS, ...SAMYUTA_MUDRAS, ...TRADITION_SPECIFIC_MUDRAS];
  const mudra = allMudras.find((m) => m.id === mudraId);

  if (!mudra) return null;

  return (
    <div
      id="mudra-detail-modal-backdrop"
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto"
      onClick={onClose}
    >
      <div
        id="mudra-detail-card"
        className="bg-stone-900 border border-stone-700/80 rounded-2xl max-w-2xl w-full p-6 shadow-2xl relative max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          id="btn-close-mudra-modal"
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-stone-400 hover:text-white rounded-full bg-stone-800 hover:bg-stone-700 transition"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header Section */}
        <div className="flex items-start space-x-3 mb-4">
          <div className="p-3 bg-amber-950/70 border border-amber-800/60 rounded-xl text-amber-400">
            <Sparkles className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h2 className="text-2xl font-bold text-white">{mudra.name}</h2>
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-stone-800 text-stone-300 border border-stone-700">
                {mudra.category}
              </span>
            </div>
            <p className="text-lg font-serif text-amber-300/90 mt-0.5">{mudra.sanskritName}</p>
          </div>
        </div>

        {/* Shloka Quote */}
        {mudra.shloka && (
          <div className="mb-5 p-4 rounded-xl bg-amber-950/30 border border-amber-800/40 text-amber-200">
            <p className="font-serif italic text-sm text-center leading-relaxed">
              "{mudra.shloka}"
            </p>
          </div>
        )}

        {/* Primary Meanings */}
        <div className="mb-5">
          <h4 className="text-xs font-bold uppercase tracking-wider text-stone-400 mb-2">
            Symbolic Meanings
          </h4>
          <div className="flex flex-wrap gap-2">
            {mudra.meanings.map((meaning, idx) => {
              const label = typeof meaning === 'string' ? meaning : meaning.englishMeaning;
              return (
                <span
                  key={idx}
                  className="px-3 py-1 bg-stone-800/80 border border-stone-700/60 rounded-lg text-xs font-medium text-stone-200"
                >
                  {label}
                </span>
              );
            })}
          </div>
        </div>

        {/* Description & Formation */}
        <div className="mb-5 space-y-3">
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-stone-400 mb-1">
              Hand Formation & Technique
            </h4>
            <p className="text-sm text-stone-300 leading-relaxed">{mudra.description}</p>
          </div>

          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-stone-400 mb-1">
              Philosophical & Cultural Significance
            </h4>
            <p className="text-sm text-stone-300 leading-relaxed">{mudra.culturalSignificance}</p>
          </div>
        </div>

        {/* Traditional Viniyoga (Usages) */}
        {mudra.viniyoga && mudra.viniyoga.length > 0 && (
          <div className="mb-5">
            <h4 className="text-xs font-bold uppercase tracking-wider text-stone-400 mb-2">
              Traditional Viniyoga Applications (Abhinaya Darpana)
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {mudra.viniyoga.map((v, i) => (
                <div
                  key={i}
                  className="flex items-start space-x-2 text-xs text-stone-300 bg-stone-950/60 p-2.5 rounded-lg border border-stone-800"
                >
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 mt-0.5 shrink-0" />
                  <span>{v}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Associated Dance Traditions */}
        <div className="mb-5">
          <h4 className="text-xs font-bold uppercase tracking-wider text-stone-400 mb-2">
            Practiced In Dance Traditions
          </h4>
          <div className="flex flex-wrap gap-2">
            {mudra.danceForms.map((df, idx) => (
              <span
                key={idx}
                className="px-2.5 py-1 bg-amber-950/40 border border-amber-800/40 rounded-md text-xs font-semibold text-amber-300 uppercase tracking-wide"
              >
                {df}
              </span>
            ))}
          </div>
        </div>

        {/* Citations & Sources */}
        <div className="pt-4 border-t border-stone-800">
          <h4 className="text-xs font-bold uppercase tracking-wider text-stone-400 mb-2 flex items-center space-x-1.5">
            <BookOpen className="w-3.5 h-3.5 text-stone-400" />
            <span>Scriptural Sources & Archives</span>
          </h4>
          <div className="space-y-1.5">
            {mudra.sources.map((src, idx) => (
              <div key={idx} className="text-xs text-stone-400 flex items-center justify-between">
                <span>{src.title} {src.organization ? `(${src.organization})` : ''}</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-stone-800 text-stone-300">
                  {src.sourceType}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

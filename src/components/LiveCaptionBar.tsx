import React from 'react';
import { Sparkles, BookOpen, Quote } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { CornerOrnament } from './RedIntricateOrnaments';

interface LiveCaptionBarProps {
  caption: string;
  culturalMeaning?: string;
  rasa?: string;
  viniyoga?: string;
  scripturalSource?: string;
  isLoadingInterpretation?: boolean;
}

export const LiveCaptionBar: React.FC<LiveCaptionBarProps> = ({
  caption,
  culturalMeaning,
  rasa,
  viniyoga,
  scripturalSource,
  isLoadingInterpretation,
}) => {
  return (
    <div
      id="live-caption-bar"
      className="w-full bg-gradient-to-br from-[#290a0e]/95 via-[#1d0608]/95 to-[#120405]/95 border border-red-900/60 rounded-2xl p-4 md:p-5 shadow-xl shadow-black/60 relative overflow-hidden font-cinzel"
    >
      {/* Corner Ornaments */}
      <CornerOrnament position="top-right" size={22} className="absolute top-1.5 right-1.5 opacity-80" />
      <CornerOrnament position="bottom-left" size={22} className="absolute bottom-1.5 left-1.5 opacity-80" />

      {/* Subtle Sandalwood Glow Accent */}
      <div className="absolute -right-10 -bottom-10 w-48 h-48 bg-red-600/15 rounded-full blur-3xl pointer-events-none" />

      {/* Header Tag */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center space-x-2">
          <Sparkles className="w-4 h-4 text-amber-400" />
          <span className="text-xs font-bold uppercase tracking-wider text-amber-300">
            Live AI Shastric Interpretation
          </span>
        </div>

        {rasa && (
          <span id="badge-rasa" className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-red-950 text-red-200 border border-red-700/80 shadow-sm">
            Rasa: {rasa}
          </span>
        )}
      </div>

      {/* Main Live Caption */}
      <AnimatePresence mode="wait">
        <motion.div
          key={caption}
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -4 }}
          transition={{ duration: 0.25 }}
          className="text-base md:text-lg font-semibold text-amber-100 leading-relaxed drop-shadow-sm"
        >
          {caption || 'Awaiting dance gesture or posture in camera feed...'}
        </motion.div>
      </AnimatePresence>

      {/* Extended Shastric / Cultural Meaning */}
      {culturalMeaning && (
        <p className="text-xs md:text-sm text-amber-200/70 mt-2.5 leading-relaxed font-sans line-clamp-2 hover:line-clamp-none transition-all duration-300">
          {culturalMeaning}
        </p>
      )}

      {/* Viniyoga Scriptural Citation */}
      {viniyoga && (
        <div className="mt-3 pt-2.5 border-t border-red-900/60 flex items-start space-x-2 text-xs text-amber-300 italic font-serif">
          <Quote className="w-3.5 h-3.5 mt-0.5 shrink-0 text-amber-400" />
          <span>{viniyoga}</span>
        </div>
      )}

      {/* Scriptural Source Footer */}
      {scripturalSource && (
        <div className="mt-2 flex items-center space-x-1.5 text-[11px] text-red-300/80">
          <BookOpen className="w-3 h-3 text-amber-400" />
          <span>Source: {scripturalSource}</span>
        </div>
      )}

      {/* Loading Indicator */}
      {isLoadingInterpretation && (
        <div className="absolute top-4 right-10 flex items-center space-x-1.5 text-xs text-amber-300">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping" />
          <span>Interpreting...</span>
        </div>
      )}
    </div>
  );
};

import React from 'react';
import {
  Sparkles,
  ArrowRight,
  Hand,
  Compass,
  BookOpen,
  ChevronRight,
  Video
} from 'lucide-react';
import { MudraLensLogo } from './MudraLensLogo';
import { CornerOrnament, IntricateDivider } from './RedIntricateOrnaments';

interface LandingPageProps {
  onEnterStudio: () => void;
  onExploreDataset?: () => void;
  onOpenTraditions?: () => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({
  onEnterStudio,
  onExploreDataset,
  onOpenTraditions,
}) => {
  return (
    <div
      id="landing-page"
      className="min-h-screen bg-[#140406] text-stone-100 flex flex-col relative overflow-hidden selection:bg-red-900 selection:text-amber-200 font-cinzel"
    >
      {/* Background Decorative Sandalwood & Intricate Filigree Mesh */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {/* Top Central Sandalwood Warm Radiance */}
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[800px] h-[550px] bg-gradient-to-b from-red-900/35 via-rose-950/25 to-transparent rounded-full blur-3xl opacity-80" />

        {/* Ambient Red & Sandalwood Glow Orbs */}
        <div className="absolute -bottom-32 left-1/4 w-[600px] h-[450px] bg-red-950/40 rounded-full blur-3xl" />
        <div className="absolute -bottom-32 right-1/4 w-[600px] h-[450px] bg-amber-950/30 rounded-full blur-3xl" />

        {/* Intricate Classical Motif Lattice Pattern */}
        <div
          className="absolute inset-0 opacity-[0.07] bg-[radial-gradient(#dc2626_1.5px,transparent_1.5px)] [background-size:28px_28px]"
          aria-hidden="true"
        />

        {/* Large Faint Sacred Mandala Background Ring */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[900px] h-[900px] border border-red-800/10 rounded-full pointer-events-none flex items-center justify-center">
          <div className="w-[700px] h-[700px] border border-amber-500/10 rounded-full border-dashed flex items-center justify-center">
            <div className="w-[500px] h-[500px] border border-red-700/10 rounded-full" />
          </div>
        </div>
      </div>

      {/* Top Header Bar */}
      <header className="relative z-10 w-full max-w-7xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between border-b border-red-900/40 bg-[#1a0608]/60 backdrop-blur-md">
        <div className="flex items-center space-x-3.5">
          <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-[#3d0f14] via-[#240a0c] to-[#140406] flex items-center justify-center border border-amber-500/50 shadow-lg shadow-red-950/80 p-1 relative">
            <MudraLensLogo size={32} variant="gold" />
          </div>
          <div className="flex items-baseline space-x-2">
            <span className="text-xl font-bold tracking-wider text-amber-100 font-cinzel-dec">
              MUDRA LENS
            </span>
            <span className="text-[10px] tracking-widest text-red-400 uppercase font-semibold border border-red-900/80 px-2 py-0.5 rounded-full bg-red-950/60 hidden sm:inline-block">
              Shastric Vision
            </span>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          {onOpenTraditions && (
            <button
              id="btn-landing-traditions"
              onClick={onOpenTraditions}
              className="hidden sm:flex items-center space-x-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold text-amber-200 hover:text-amber-100 bg-[#25090c]/80 hover:bg-[#340c11] border border-red-900/60 transition cursor-pointer"
            >
              <BookOpen className="w-3.5 h-3.5 text-amber-400" />
              <span>Traditions</span>
            </button>
          )}

          <button
            id="btn-header-enter-studio"
            onClick={onEnterStudio}
            className="flex items-center space-x-1.5 px-4 py-2 rounded-xl text-xs font-bold text-[#140406] bg-gradient-to-r from-amber-400 via-amber-500 to-amber-400 hover:from-amber-300 hover:to-amber-400 transition shadow-lg shadow-amber-950/50 border border-amber-300 cursor-pointer"
          >
            <span>ENTER STUDIO</span>
            <ChevronRight className="w-3.5 h-3.5 text-[#140406]" />
          </button>
        </div>
      </header>

      {/* Hero & Central Content */}
      <main className="relative z-10 flex-1 flex flex-col items-center justify-center px-4 sm:px-6 py-12 md:py-16 max-w-5xl mx-auto w-full text-center">
        {/* Sandalwood Cultural Pill with Red Intricate Accents */}
        <div
          id="landing-category-pill"
          className="inline-flex items-center space-x-2.5 px-4 py-1.5 rounded-full bg-gradient-to-r from-[#380e12]/90 via-[#26090c]/90 to-[#380e12]/90 border border-red-700/50 text-amber-200 text-xs font-semibold tracking-wider mb-8 shadow-xl shadow-black/60 backdrop-blur-md"
        >
          <Sparkles className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
          <span>REAL-TIME INDIAN CLASSICAL DANCE INTELLIGENCE</span>
        </div>

        {/* Centered App Logo with Red Sandalwood & Gold Highlights */}
        <div id="landing-logo-container" className="relative mb-8 group cursor-pointer" onClick={onEnterStudio}>
          {/* Concentric Gold & Vermilion Glow Rings */}
          <div className="absolute -inset-6 rounded-full bg-gradient-to-r from-red-600/30 via-amber-500/25 to-red-600/30 blur-2xl opacity-75 group-hover:opacity-100 transition duration-500" />
          <div className="absolute -inset-2 rounded-full bg-gradient-to-r from-red-500/50 via-amber-500/30 to-red-500/50 blur-md opacity-60 group-hover:opacity-90 transition duration-300" />

          {/* Main Logo Disc with Red Intricate Medallion Border */}
          <div className="relative w-40 h-40 sm:w-48 sm:h-48 rounded-full bg-gradient-to-br from-[#3b0f13] via-[#1f0608] to-[#120405] p-2.5 border-2 border-amber-500/70 shadow-2xl shadow-red-950 flex items-center justify-center backdrop-blur-md group-hover:border-amber-300 transition duration-300">
            {/* Inner Intricate Rim */}
            <div className="w-full h-full rounded-full bg-gradient-to-br from-[#24080b] via-[#160406] to-[#100304] border border-red-700/60 flex flex-col items-center justify-center p-3 relative overflow-hidden group-hover:border-amber-400/80 transition duration-300">
              {/* Nataraja / Cosmic Dancer Vector Logo */}
              <MudraLensLogo
                size={145}
                variant="gold"
                className="transform group-hover:scale-105 transition duration-300 drop-shadow-[0_0_16px_rgba(245,158,11,0.6)]"
              />
            </div>
          </div>
        </div>

        {/* Title in Cinzel Typography */}
        <h1
          id="landing-title"
          className="text-4xl sm:text-6xl md:text-7xl font-extrabold tracking-wider text-white mb-3 font-cinzel-dec"
        >
          <span className="text-amber-100 drop-shadow-[0_4px_16px_rgba(0,0,0,0.8)]">MUDRA</span>{' '}
          <span className="text-amber-400 drop-shadow-[0_2px_16px_rgba(245,158,11,0.5)]">LENS</span>
        </h1>

        {/* Intricate Classical Filigree Divider */}
        <div className="w-48 mx-auto my-2">
          <IntricateDivider />
        </div>

        {/* Primary Tagline */}
        <p
          id="landing-tagline"
          className="text-base sm:text-xl md:text-2xl text-amber-200/90 font-semibold max-w-2xl mx-auto mb-4 tracking-wide leading-relaxed"
        >
          Real-Time Classical Dance &amp; Mudra Interpretation
        </p>

        {/* Secondary Subtitle */}
        <p className="text-xs sm:text-sm text-stone-400 max-w-2xl mx-auto mb-10 leading-relaxed font-sans">
          Grounded in the sacred treatises of the <span className="text-amber-300 font-serif">Natya Shastra</span> and <span className="text-amber-300 font-serif">Abhinaya Darpana</span>. Real-time joint kinetics, hand mudra taxonomy, and mythological narrative synthesis.
        </p>

        {/* Central 'Enter Studio' Button & Actions */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 w-full max-w-md mx-auto mb-16">
          <button
            id="btn-enter-studio-primary"
            onClick={onEnterStudio}
            className="w-full sm:w-auto flex-1 group relative inline-flex items-center justify-center space-x-3 px-8 py-4 rounded-xl text-sm font-bold text-[#140406] bg-gradient-to-r from-amber-400 via-amber-500 to-amber-400 hover:from-amber-300 hover:via-amber-400 hover:to-amber-300 border-2 border-amber-300 shadow-[0_0_30px_rgba(245,158,11,0.4)] hover:shadow-[0_0_40px_rgba(245,158,11,0.7)] transition-all duration-300 transform hover:-translate-y-0.5 active:translate-y-0 cursor-pointer tracking-wider"
          >
            <Video className="w-5 h-5 text-[#140406]" />
            <span>ENTER STUDIO</span>
            <ArrowRight className="w-5 h-5 text-[#140406] group-hover:translate-x-1 transition duration-200" />
          </button>

          {onExploreDataset && (
            <button
              id="btn-explore-dataset-secondary"
              onClick={onExploreDataset}
              className="w-full sm:w-auto px-6 py-4 rounded-xl text-xs font-bold text-amber-200 hover:text-amber-100 bg-[#25090c]/90 hover:bg-[#340d12] border border-red-800/60 hover:border-amber-500/60 transition-all duration-200 shadow-xl shadow-black/60 cursor-pointer tracking-wide"
            >
              <span>DATASET &amp; AI ANALYSIS</span>
            </button>
          )}
        </div>

        {/* Core Pillars Feature Grid (Red Sandalwood cards with intricate corner ornaments) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 w-full text-left">
          {/* Card 1: Mudra Recognition */}
          <div
            id="feature-card-mudras"
            className="p-5 rounded-2xl bg-gradient-to-b from-[#280a0e]/95 to-[#160406]/95 border border-red-800/50 hover:border-amber-500/60 transition duration-300 shadow-xl shadow-black/50 group relative overflow-hidden"
          >
            <CornerOrnament position="top-right" size={20} className="absolute top-1 right-1 opacity-70 group-hover:opacity-100 transition" />
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-red-700/40 via-[#3d0f14] to-[#1a0608] flex items-center justify-center border border-red-600/50 text-amber-400 mb-3 group-hover:border-amber-400 transition">
              <Hand className="w-5 h-5" />
            </div>
            <h3 className="text-xs font-bold text-amber-200 mb-1 tracking-wider uppercase">Mudra Recognition</h3>
            <p className="text-xs text-stone-400 leading-relaxed font-sans">
              Identifies 28 Asamyuta and 24 Samyuta hand gestures with scriptural Sanskrit root meanings (Viniyoga).
            </p>
          </div>

          {/* Card 2: Posture & Geometry */}
          <div
            id="feature-card-posture"
            className="p-5 rounded-2xl bg-gradient-to-b from-[#280a0e]/95 to-[#160406]/95 border border-red-800/50 hover:border-amber-500/60 transition duration-300 shadow-xl shadow-black/50 group relative overflow-hidden"
          >
            <CornerOrnament position="top-right" size={20} className="absolute top-1 right-1 opacity-70 group-hover:opacity-100 transition" />
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-red-700/40 via-[#3d0f14] to-[#1a0608] flex items-center justify-center border border-red-600/50 text-amber-400 mb-3 group-hover:border-amber-400 transition">
              <Compass className="w-5 h-5" />
            </div>
            <h3 className="text-xs font-bold text-amber-200 mb-1 tracking-wider uppercase">Shastric Postures</h3>
            <p className="text-xs text-stone-400 leading-relaxed font-sans">
              Analyzes body geometry for foundational stances like Aramandi, Chowka, and Tribhanga.
            </p>
          </div>

          {/* Card 3: Cultural Storytelling */}
          <div
            id="feature-card-story"
            className="p-5 rounded-2xl bg-gradient-to-b from-[#280a0e]/95 to-[#160406]/95 border border-red-800/50 hover:border-amber-500/60 transition duration-300 shadow-xl shadow-black/50 group relative overflow-hidden"
          >
            <CornerOrnament position="top-right" size={20} className="absolute top-1 right-1 opacity-70 group-hover:opacity-100 transition" />
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-red-700/40 via-[#3d0f14] to-[#1a0608] flex items-center justify-center border border-red-600/50 text-amber-400 mb-3 group-hover:border-amber-400 transition">
              <Sparkles className="w-5 h-5" />
            </div>
            <h3 className="text-xs font-bold text-amber-200 mb-1 tracking-wider uppercase">Rasa &amp; Story</h3>
            <p className="text-xs text-stone-400 leading-relaxed font-sans">
              Synthesizes movement, rasa/bhava, and mythological narratives in real time via Gemini AI.
            </p>
          </div>

          {/* Card 4: Multi-Tradition Vision */}
          <div
            id="feature-card-traditions"
            className="p-5 rounded-2xl bg-gradient-to-b from-[#280a0e]/95 to-[#160406]/95 border border-red-800/50 hover:border-amber-500/60 transition duration-300 shadow-xl shadow-black/50 group relative overflow-hidden"
          >
            <CornerOrnament position="top-right" size={20} className="absolute top-1 right-1 opacity-70 group-hover:opacity-100 transition" />
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-red-700/40 via-[#3d0f14] to-[#1a0608] flex items-center justify-center border border-red-600/50 text-amber-400 mb-3 group-hover:border-amber-400 transition">
              <BookOpen className="w-5 h-5" />
            </div>
            <h3 className="text-xs font-bold text-amber-200 mb-1 tracking-wider uppercase">8 Classical Forms</h3>
            <p className="text-xs text-stone-400 leading-relaxed font-sans">
              Bharatanatyam, Kathak, Odissi, Kathakali, Kuchipudi, Manipuri, Mohiniyattam &amp; Sattriya.
            </p>
          </div>
        </div>
      </main>

      {/* Bottom Footer with Sandalwood & Gold Accent */}
      <footer className="relative z-10 w-full border-t border-red-900/40 bg-[#160406]/80 py-4 px-4 text-center">
        <p className="text-xs text-amber-200/60 tracking-wider">
          MUDRA LENS &bull; Shastric Vision &amp; Indian Classical Dance Interpretation Core &bull; Grounded in Natya Shastra &amp; Abhinaya Darpana
        </p>
      </footer>
    </div>
  );
};

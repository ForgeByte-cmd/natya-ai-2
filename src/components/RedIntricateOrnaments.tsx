import React from 'react';

interface CornerOrnamentProps {
  className?: string;
  position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
  size?: number;
  color?: string;
}

export const CornerOrnament: React.FC<CornerOrnamentProps> = ({
  className = '',
  position = 'top-left',
  size = 32,
  color = '#e11d48', // Rich crimson/red
}) => {
  const getRotation = () => {
    switch (position) {
      case 'top-right':
        return 'rotate-90';
      case 'bottom-right':
        return 'rotate-180';
      case 'bottom-left':
        return '-rotate-90';
      case 'top-left':
      default:
        return '';
    }
  };

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 40 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`pointer-events-none select-none ${getRotation()} ${className}`}
    >
      {/* Outer Corner Frame */}
      <path
        d="M 2 38 L 2 6 C 2 3.8, 3.8 2, 6 2 L 38 2"
        stroke="#dc2626"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      {/* Inner Intricate Filigree Arc */}
      <path
        d="M 6 26 C 6 15, 15 6, 26 6"
        stroke="#f59e0b"
        strokeWidth="1"
        strokeDasharray="2 2"
      />
      {/* Intricate Floral / Paisley Petal */}
      <path
        d="M 8 16 C 10 10, 16 8, 20 8 C 16 12, 14 18, 8 16 Z"
        fill="rgba(220, 38, 38, 0.4)"
        stroke="#dc2626"
        strokeWidth="1"
      />
      {/* Corner Gem / Tilak */}
      <circle cx="6" cy="6" r="2.5" fill="#f59e0b" />
      <circle cx="6" cy="6" r="1" fill="#ffffff" />
      <circle cx="16" cy="6" r="1.2" fill="#ef4444" />
      <circle cx="6" cy="16" r="1.2" fill="#ef4444" />
    </svg>
  );
};

export const IntricateDivider: React.FC<{ className?: string }> = ({ className = '' }) => {
  return (
    <div className={`flex items-center justify-center space-x-3 my-4 select-none ${className}`}>
      {/* Left Filigree Line */}
      <div className="flex-1 h-[1px] bg-gradient-to-r from-transparent via-red-800/60 to-amber-500/80" />
      
      {/* Center Sacred Mandala Motif */}
      <div className="flex items-center space-x-1.5 px-2">
        <span className="w-1.5 h-1.5 rotate-45 bg-red-600 border border-amber-400/80 inline-block" />
        <span className="w-2.5 h-2.5 rotate-45 bg-gradient-to-tr from-red-700 to-amber-500 border border-amber-300 inline-block shadow-[0_0_8px_rgba(245,158,11,0.6)]" />
        <span className="w-1.5 h-1.5 rotate-45 bg-red-600 border border-amber-400/80 inline-block" />
      </div>

      {/* Right Filigree Line */}
      <div className="flex-1 h-[1px] bg-gradient-to-l from-transparent via-red-800/60 to-amber-500/80" />
    </div>
  );
};

export const SandalwoodCard: React.FC<{
  children: React.ReactNode;
  className?: string;
  id?: string;
  hasCorners?: boolean;
}> = ({ children, className = '', id, hasCorners = true }) => {
  return (
    <div
      id={id}
      className={`relative bg-gradient-to-br from-[#24090c]/95 via-[#1a0608]/95 to-[#120405]/95 border border-red-900/50 rounded-2xl shadow-xl shadow-black/60 overflow-hidden ${className}`}
    >
      {hasCorners && (
        <>
          <div className="absolute top-1 left-1 z-10">
            <CornerOrnament position="top-left" size={24} />
          </div>
          <div className="absolute top-1 right-1 z-10">
            <CornerOrnament position="top-right" size={24} />
          </div>
          <div className="absolute bottom-1 left-1 z-10">
            <CornerOrnament position="bottom-left" size={24} />
          </div>
          <div className="absolute bottom-1 right-1 z-10">
            <CornerOrnament position="bottom-right" size={24} />
          </div>
        </>
      )}
      {children}
    </div>
  );
};

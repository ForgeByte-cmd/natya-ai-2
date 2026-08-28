import React from 'react';

interface MudraLensLogoProps {
  className?: string;
  size?: number | string;
  variant?: 'gold' | 'white' | 'amber' | 'full';
}

export const MudraLensLogo: React.FC<MudraLensLogoProps> = ({
  className = '',
  size = 48,
  variant = 'gold',
}) => {
  const getColors = () => {
    switch (variant) {
      case 'white':
        return {
          stroke: '#FFFFFF',
          fill: '#FFFFFF',
          glow: 'rgba(255,255,255,0.4)',
          accent: '#F3F4F6',
        };
      case 'amber':
        return {
          stroke: '#F59E0B',
          fill: '#F59E0B',
          glow: 'rgba(245,158,11,0.5)',
          accent: '#FDE68A',
        };
      case 'full':
      case 'gold':
      default:
        return {
          stroke: '#FBBF24',
          fill: '#FBBF24',
          glow: 'rgba(251,191,36,0.6)',
          accent: '#FDE047',
        };
    }
  };

  const c = getColors();

  return (
    <svg
      viewBox="0 0 200 200"
      width={size}
      height={size}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`select-none ${className}`}
      aria-label="Mudra Lens Logo"
    >
      <defs>
        <filter id="goldGlow" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="3" result="blur" />
          <feComposite in="SourceGraphic" in2="blur" operator="over" />
        </filter>
        <linearGradient id="goldGradient" x1="0" y1="0" x2="200" y2="200" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#FDE68A" />
          <stop offset="50%" stopColor="#F59E0B" />
          <stop offset="100%" stopColor="#D97706" />
        </linearGradient>
        <linearGradient id="silverGradient" x1="0" y1="0" x2="200" y2="200" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#FFFFFF" />
          <stop offset="100%" stopColor="#E5E7EB" />
        </linearGradient>
      </defs>

      {/* Outer Prabhavali Halo Arch with Decorative Radiating Flames / Petals */}
      <g stroke={c.stroke} fill={c.fill} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        {/* Main Circular Halo Ring */}
        <circle
          cx="100"
          cy="92"
          r="56"
          stroke="url(#goldGradient)"
          strokeWidth="3.5"
          fill="none"
          strokeDasharray="320"
          strokeDashoffset="10"
        />

        {/* Outer Radiating Flame / Floral Petals around the circle (24 petals) */}
        {[
          // Top arch flames
          { cx: 100, cy: 26, r: -90 },
          { cx: 118, cy: 28, r: -75 },
          { cx: 135, cy: 34, r: -60 },
          { cx: 150, cy: 45, r: -45 },
          { cx: 161, cy: 60, r: -30 },
          { cx: 167, cy: 78, r: -15 },
          { cx: 168, cy: 96, r: 0 },
          { cx: 163, cy: 114, r: 15 },
          { cx: 153, cy: 130, r: 30 },
          { cx: 138, cy: 143, r: 45 },
          { cx: 121, cy: 151, r: 60 },
          // Left arch flames
          { cx: 82, cy: 28, r: -105 },
          { cx: 65, cy: 34, r: -120 },
          { cx: 50, cy: 45, r: -135 },
          { cx: 39, cy: 60, r: -150 },
          { cx: 33, cy: 78, r: -165 },
          { cx: 32, cy: 96, r: 180 },
          { cx: 37, cy: 114, r: 165 },
          { cx: 47, cy: 130, r: 150 },
          { cx: 62, cy: 143, r: 135 },
          { cx: 79, cy: 151, r: 120 },
        ].map((petal, i) => (
          <path
            key={`petal-${i}`}
            d={`M ${petal.cx} ${petal.cy} C ${petal.cx + 2} ${petal.cy - 3}, ${petal.cx + 6} ${petal.cy - 1}, ${petal.cx + 4} ${petal.cy + 3} C ${petal.cx + 1} ${petal.cy + 4}, ${petal.cx - 3} ${petal.cy + 1}, ${petal.cx} ${petal.cy}`}
            fill={variant === 'white' ? '#FFFFFF' : 'url(#goldGradient)'}
            stroke="none"
            transform={`rotate(${petal.r}, ${petal.cx}, ${petal.cy}) scale(1.4)`}
          />
        ))}

        {/* Top Arch Crest Flourish */}
        <path
          d="M 94 28 C 97 22, 103 22, 106 28 C 103 30, 97 30, 94 28 Z"
          fill={variant === 'white' ? '#FFFFFF' : 'url(#goldGradient)'}
        />
        <circle cx="100" cy="22" r="1.5" fill={c.fill} />
      </g>

      {/* Dancing Divine Figure (Nataraja / Saraswati cosmic dance posture) */}
      <g
        stroke={variant === 'white' ? '#FFFFFF' : 'url(#goldGradient)'}
        fill={variant === 'white' ? '#FFFFFF' : 'url(#goldGradient)'}
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {/* Crown (Kiritamukuta) & Tilak */}
        <path
          d="M 100 48 L 96 56 L 104 56 Z"
          fill="none"
          strokeWidth="2"
        />
        <circle cx="100" cy="51" r="1.5" fill={c.fill} />

        {/* Head / Face Silhouette with serene contour */}
        <path
          d="M 95 57 C 95 65, 105 65, 105 57 C 105 52, 95 52, 95 57 Z"
          fill="none"
          strokeWidth="2"
        />

        {/* Radiating Flowing Jata / Hair locks (left & right tendrils) */}
        {/* Left hair locks */}
        <path
          d="M 95 56 C 88 53, 84 57, 78 54 C 82 58, 87 59, 94 60"
          fill="none"
          strokeWidth="1.8"
        />
        <path
          d="M 95 59 C 86 58, 80 64, 74 62 C 79 66, 86 65, 93 63"
          fill="none"
          strokeWidth="1.8"
        />
        <path
          d="M 96 54 C 91 48, 82 50, 79 46 C 83 50, 89 51, 95 53"
          fill="none"
          strokeWidth="1.8"
        />

        {/* Right hair locks */}
        <path
          d="M 105 56 C 112 53, 116 57, 122 54 C 118 58, 113 59, 106 60"
          fill="none"
          strokeWidth="1.8"
        />
        <path
          d="M 105 59 C 114 58, 120 64, 126 62 C 121 66, 114 65, 107 63"
          fill="none"
          strokeWidth="1.8"
        />
        <path
          d="M 104 54 C 109 48, 118 50, 121 46 C 117 50, 111 51, 105 53"
          fill="none"
          strokeWidth="1.8"
        />

        {/* Torso & Waist (Classic slender tribhanga curvature) */}
        <path
          d="M 96 66 C 94 74, 91 80, 94 92 C 98 97, 107 98, 113 93 C 117 84, 114 74, 104 66"
          fill="none"
          strokeWidth="2.5"
        />

        {/* Arms & Hands (4 Divine Arms holding Sacred Attributes) */}
        {/* Upper Left Arm holding Damaru Drum */}
        <path
          d="M 94 69 C 83 72, 73 78, 67 85"
          fill="none"
          strokeWidth="2.2"
        />
        {/* Damaru Icon */}
        <path
          d="M 64 82 L 70 88 L 64 88 L 70 82 Z"
          fill={c.fill}
          strokeWidth="1"
        />

        {/* Upper Right Arm holding Pothi / Scripture / Flame */}
        <path
          d="M 106 69 C 118 73, 128 78, 134 85"
          fill="none"
          strokeWidth="2.2"
        />
        {/* Scripture / Pothi symbol */}
        <path
          d="M 132 83 C 135 81, 138 83, 140 81 L 140 86 C 138 88, 135 86, 132 88 Z"
          fill={c.fill}
          strokeWidth="1"
        />

        {/* Diagonal Veena / Staff Held across Torso with Graceful Mudra Hands */}
        {/* The Veena body and neck */}
        <path
          d="M 70 106 C 72 108, 77 106, 79 101 L 131 82"
          fill="none"
          strokeWidth="3.2"
        />
        {/* Resonator gourd (Kudam) on left */}
        <ellipse cx="74" cy="103" rx="6" ry="4" fill="none" strokeWidth="2" />

        {/* Primary Left Hand playing Veena in Hamsasya mudra */}
        <path
          d="M 86 78 C 82 85, 80 94, 82 98"
          fill="none"
          strokeWidth="2.2"
        />
        <path
          d="M 80 95 C 79 97, 82 99, 84 97"
          fill="none"
          strokeWidth="1.8"
        />

        {/* Primary Right Hand plucking strings in Pataka / Suchi mudra */}
        <path
          d="M 112 78 C 118 84, 122 90, 125 93"
          fill="none"
          strokeWidth="2.2"
        />

        {/* Flowing Uttariya / Sash (Floating to the right) */}
        <path
          d="M 112 94 C 119 97, 125 106, 138 108 C 145 110, 146 114, 140 116 C 132 118, 122 108, 114 100"
          fill="none"
          strokeWidth="2.2"
        />

        {/* Legs in Tandava / Dynamic Classical Stance */}
        {/* Lifted Left Leg (Kunchita Pada crossing horizontally with pointed toe) */}
        <path
          d="M 94 92 C 85 96, 75 101, 64 109 C 61 110, 58 112, 60 114 C 62 115, 65 112, 69 110 C 78 106, 88 103, 96 100"
          fill="none"
          strokeWidth="2.6"
        />

        {/* Grounded Right Leg (Gracefully bent knee rooted down on lotus) */}
        <path
          d="M 106 97 C 104 108, 93 118, 91 132 C 90 144, 94 153, 98 160"
          fill="none"
          strokeWidth="2.8"
        />

        {/* Lotus / Ornate Foliage Base Pedestal */}
        <path
          d="M 84 172 C 90 166, 96 163, 100 161 C 104 163, 110 166, 116 172 C 108 171, 104 167, 100 168 C 96 167, 92 171, 84 172 Z"
          fill={variant === 'white' ? '#FFFFFF' : 'url(#goldGradient)'}
        />
        {/* Leaf veins flourish at bottom */}
        <path
          d="M 80 174 C 90 178, 100 178, 110 174"
          fill="none"
          strokeWidth="1.5"
        />
        <path
          d="M 86 177 C 94 182, 104 182, 114 177"
          fill="none"
          strokeWidth="1.2"
        />
      </g>
    </svg>
  );
};

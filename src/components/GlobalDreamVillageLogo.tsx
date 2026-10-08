import React from 'react';

interface GlobalDreamVillageLogoProps {
  size?: number;
  variant?: 'icon' | 'full' | 'airbnb' | 'globe';
  className?: string;
  style?: React.CSSProperties;
}

export const GlobalDreamVillageLogo: React.FC<GlobalDreamVillageLogoProps> = ({
  size = 55,
  variant = 'icon',
  className = '',
  style = {},
}) => {
  // 1. ICON VARIANT (Default): 3D Globe + Villa emblem with transparent background
  if (variant === 'icon') {
    return (
      <img
        src="/gdv-icon.png"
        alt="Global Dream Village"
        width={size}
        height={size}
        className={className}
        style={{
          display: 'inline-block',
          flexShrink: 0,
          objectFit: 'contain',
          verticalAlign: 'middle',
          ...style,
        }}
      />
    );
  }

  // 2. FULL LOGO VARIANT: Complete emblem + brand typography
  if (variant === 'full') {
    return (
      <img
        src="/logo.png"
        alt="Global Dream Village"
        width={size}
        height={size}
        className={className}
        style={{
          display: 'inline-block',
          flexShrink: 0,
          objectFit: 'contain',
          verticalAlign: 'middle',
          ...style,
        }}
      />
    );
  }

  // 3. AIRBNB STYLE: Continuous fluid Bélo ribbon weaving G, D, and V
  if (variant === 'airbnb') {
    return (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 100 100"
        width={size}
        height={size}
        className={className}
        style={{ display: 'inline-block', flexShrink: 0, ...style }}
        fill="none"
      >
        <defs>
          <linearGradient id="gdvAirbnbCoral" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#0066B3" />
            <stop offset="100%" stopColor="#004B8C" />
          </linearGradient>
        </defs>

        {/* Outer Loop: Continuous ribbon forming V base, Destination Pin, and Haven Arch */}
        <path
          d="M 50 88 C 36 70, 18 52, 18 34 A 16 16 0 0 1 50 24 A 16 16 0 0 1 82 34 C 82 52, 64 70, 50 88 Z"
          stroke="url(#gdvAirbnbCoral)"
          strokeWidth="7.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Inner Loop: Forms the G crossbar, D arch, and V valley */}
        <path
          d="M 38 42 C 38 34, 44 28, 50 28 C 56 28, 62 34, 62 42 C 62 52, 54 62, 50 66 C 46 62, 38 52, 38 42 Z"
          stroke="url(#gdvAirbnbCoral)"
          strokeWidth="7"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* G inner horizontal crossbar notch */}
        <path
          d="M 44 48 L 56 48"
          stroke="url(#gdvAirbnbCoral)"
          strokeWidth="7"
          strokeLinecap="round"
        />
      </svg>
    );
  }

  // 2. GLOBE STYLE: Classic illustrated globe landscape
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 120 120"
      width={size}
      height={size}
      className={className}
      style={{ display: 'inline-block', flexShrink: 0, ...style }}
    >
      <defs>
        <linearGradient id="gdvLogoBg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#F0F7FF" />
          <stop offset="100%" stopColor="#FFFFFF" />
        </linearGradient>
        <linearGradient id="gdvSky" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#FF6B6B" />
          <stop offset="45%" stopColor="#FFA07A" />
          <stop offset="100%" stopColor="#FCD34D" />
        </linearGradient>
        <linearGradient id="gdvOrbit" x1="0%" y1="100%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#059669" />
          <stop offset="50%" stopColor="#10B981" />
          <stop offset="100%" stopColor="#004B8C" />
        </linearGradient>
        <linearGradient id="gdvHillFar" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#10B981" />
          <stop offset="100%" stopColor="#047857" />
        </linearGradient>
        <linearGradient id="gdvHillNear" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#34D399" />
          <stop offset="50%" stopColor="#10B981" />
          <stop offset="100%" stopColor="#065F46" />
        </linearGradient>
        <linearGradient id="gdvPath" x1="50%" y1="100%" x2="50%" y2="0%">
          <stop offset="0%" stopColor="#F59E0B" />
          <stop offset="50%" stopColor="#FDE68A" />
          <stop offset="100%" stopColor="#FFFFFF" />
        </linearGradient>
        <linearGradient id="gdvRoof" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#004B8C" />
          <stop offset="100%" stopColor="#E11D48" />
        </linearGradient>
        <linearGradient id="gdvStar" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#FFFBEB" />
          <stop offset="50%" stopColor="#FDE047" />
          <stop offset="100%" stopColor="#F59E0B" />
        </linearGradient>
        <filter id="gdvGlow" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="2" result="blur" />
          <feComposite in="SourceGraphic" in2="blur" operator="over" />
        </filter>
        <clipPath id="gdvClip">
          <circle cx="60" cy="60" r="52" />
        </clipPath>
      </defs>

      <circle cx="60" cy="60" r="54" fill="url(#gdvLogoBg)" stroke="#E5E7EB" strokeWidth="1.5" />
      <g clipPath="url(#gdvClip)">
        <rect x="8" y="8" width="104" height="66" fill="url(#gdvSky)" opacity="0.88" />
        <circle cx="60" cy="40" r="16" fill="#FEF08A" opacity="0.8" filter="url(#gdvGlow)" />
        <path d="M12 68 L36 48 L56 65 L76 46 L108 72 L108 80 L12 80 Z" fill="#047857" opacity="0.45" />
        <path d="M4 74 Q 35 48, 70 64 T 116 68 L 116 116 L 4 116 Z" fill="url(#gdvHillFar)" />
        <path d="M4 86 Q 45 66, 85 80 T 116 88 L 116 116 L 4 116 Z" fill="url(#gdvHillNear)" />
        <path d="M26 84 Q 28 66, 24 54" stroke="#92400E" strokeWidth="2.5" strokeLinecap="round" fill="none" />
        <path d="M24 54 Q 14 48, 12 56 M 24 54 Q 18 42, 26 38 M 24 54 Q 34 44, 38 52 M 24 54 Q 20 60, 16 64" stroke="#059669" strokeWidth="2.2" strokeLinecap="round" fill="none" />
        <path d="M96 86 Q 93 70, 97 58" stroke="#92400E" strokeWidth="2.2" strokeLinecap="round" fill="none" />
        <path d="M97 58 Q 88 52, 86 60 M 97 58 Q 93 46, 100 42 M 97 58 Q 106 50, 108 58" stroke="#059669" strokeWidth="2" strokeLinecap="round" fill="none" />
        <rect x="49" y="58" width="22" height="18" rx="2" fill="#FFFFFF" />
        <path d="M46 59 L60 46 L74 59 Z" fill="url(#gdvRoof)" />
        <rect x="65" y="47" width="3.5" height="6" fill="#BE123C" rx="0.5" />
        <path d="M57 76 L57 69 Q 60 66, 63 69 L 63 76 Z" fill="#F59E0B" />
        <rect x="52" y="63" width="3.5" height="4" rx="0.8" fill="#FEF3C7" />
        <rect x="64.5" y="63" width="3.5" height="4" rx="0.8" fill="#FEF3C7" />
        <path d="M 60 76 Q 60 84, 52 90 T 60 102 T 48 116 L 72 116 Q 68 104, 68 96 T 60 76 Z" fill="url(#gdvPath)" opacity="0.95" />
      </g>
      <path d="M 10 66 Q 60 92, 110 66" stroke="url(#gdvOrbit)" strokeWidth="3" strokeLinecap="round" fill="none" />
    </svg>
  );
};

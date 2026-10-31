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
  // 1. ICON VARIANT (Default): Official GDV emblem + typography
  if (variant === 'icon' || variant === 'full') {
    return (
      <img
        src="/gdv-official-logo.png"
        alt="Global Dream Village"
        height={size}
        className={className}
        style={{
          display: 'inline-block',
          flexShrink: 0,
          height: `${size}px`,
          width: 'auto',
          maxWidth: '100%',
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
        <path
          d="M 50 88 C 36 70, 18 52, 18 34 A 16 16 0 0 1 50 24 A 16 16 0 0 1 82 34 C 82 52, 64 70, 50 88 Z"
          stroke="url(#gdvAirbnbCoral)"
          strokeWidth="7.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M 38 42 C 38 34, 44 28, 50 28 C 56 28, 62 34, 62 42 C 62 52, 54 62, 50 66 C 46 62, 38 52, 38 42 Z"
          stroke="url(#gdvAirbnbCoral)"
          strokeWidth="7"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M 44 48 L 56 48"
          stroke="url(#gdvAirbnbCoral)"
          strokeWidth="7"
          strokeLinecap="round"
        />
      </svg>
    );
  }

  return (
    <img
      src="/gdv-official-logo.png"
      alt="Global Dream Village"
      height={size}
      className={className}
      style={{
        display: 'inline-block',
        flexShrink: 0,
        height: `${size}px`,
        width: 'auto',
        maxWidth: '100%',
        objectFit: 'contain',
        verticalAlign: 'middle',
        ...style,
      }}
    />
  );
};

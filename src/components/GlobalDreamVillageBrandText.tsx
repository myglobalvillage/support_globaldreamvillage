import React from 'react';

interface GlobalDreamVillageBrandTextProps {
  size?: 'small' | 'medium' | 'large' | 'hero';
  scriptText?: string;
  blockText?: string;
  layout?: 'inline' | 'stacked';
  fontStyle?: 'default' | 'theme' | 'village' | 'script';
  colorScheme?: 'same' | 'blue' | 'yellow' | 'rainbow' | 'dark';
  className?: string;
  style?: React.CSSProperties;
  onClick?: () => void;
  showSubtitle?: boolean;
  subtitleText?: string;
}

export const GlobalDreamVillageBrandText: React.FC<GlobalDreamVillageBrandTextProps> = ({
  size = 'small',
  className = '',
  style = {},
  onClick,
  showSubtitle = true,
  subtitleText = 'where every stay becomes a dream',
}) => {
  // Proportional sizing configs for the brand artwork and tagline
  const configs: Record<string, { imgHeight: string | number; subSize: string | number; marginTop: number }> = {
    small: {
      imgHeight: 'clamp(24px, 5.5vw, 36px)',
      subSize: 'clamp(8.5px, 2.2vw, 11px)',
      marginTop: 2,
    },
    medium: {
      imgHeight: 'clamp(32px, 7vw, 46px)',
      subSize: 'clamp(10px, 2.8vw, 12.5px)',
      marginTop: 3,
    },
    large: {
      imgHeight: 'clamp(42px, 9vw, 62px)',
      subSize: 'clamp(11px, 3.2vw, 14px)',
      marginTop: 4,
    },
    hero: {
      imgHeight: 'clamp(54px, 12vw, 88px)',
      subSize: 'clamp(13px, 4vw, 18px)',
      marginTop: 6,
    },
  };

  const cfg = configs[size];

  // Subtitle tagline styling (clean modern Poppins typography)
  const subStyle: React.CSSProperties = {
    fontFamily: "'Poppins', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    fontSize: typeof cfg.subSize === 'number' ? `${cfg.subSize}px` : cfg.subSize,
    fontWeight: 500,
    color: '#717171',
    letterSpacing: '0.4px',
    marginTop: `${cfg.marginTop}px`,
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    maxWidth: '100%',
    lineHeight: 1.1,
    textAlign: 'center',
  };

  return (
    <div
      onClick={onClick}
      className={`gdv-brand-lockup ${className}`}
      style={{
        display: 'inline-flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        userSelect: 'none',
        cursor: onClick ? 'pointer' : 'default',
        textAlign: 'center',
        minWidth: 0,
        maxWidth: '100%',
        overflow: 'hidden',
        ...style,
      }}
    >
      {/* 3D Brand Logo Artwork */}
      <img
        src="/brand-logo.png"
        alt="Global Dream Village"
        style={{
          height: typeof cfg.imgHeight === 'number' ? `${cfg.imgHeight}px` : cfg.imgHeight,
          maxWidth: '100%',
          objectFit: 'contain',
          display: 'block',
        }}
      />

      {/* Tagline directly below */}
      {showSubtitle && (
        <span style={subStyle}>
          {subtitleText}
        </span>
      )}
    </div>
  );
};


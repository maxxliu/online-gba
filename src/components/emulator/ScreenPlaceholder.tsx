'use client';

interface ScreenPlaceholderProps {
  variant?: 'shell' | 'mobile';
}

export function ScreenPlaceholder({ variant = 'shell' }: ScreenPlaceholderProps) {
  const hint =
    variant === 'mobile'
      ? 'Tap Library to add a game'
      : 'Upload a ROM to play';

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        width: '100%',
        height: '100%',
        gap: '8px',
      }}
    >
      <span
        className="font-pixel animate-breathe"
        style={{
          fontSize: '18px',
          color: 'var(--color-lcd-darkest)',
          textShadow: '0 0 8px rgba(26, 42, 8, 0.3)',
          letterSpacing: '2px',
        }}
      >
        RetroPlay
      </span>
      <span
        className="font-mono"
        style={{
          fontSize: '9px',
          color: 'var(--color-lcd-dark)',
          letterSpacing: '0.5px',
        }}
      >
        {hint}
      </span>
    </div>
  );
}

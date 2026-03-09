'use client';

interface ScreenPlaceholderProps {
  variant?: 'shell' | 'mobile';
  error?: string | null;
}

export function ScreenPlaceholder({ variant = 'shell', error }: ScreenPlaceholderProps) {
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
      {error ? (
        <span
          className="font-mono"
          style={{
            fontSize: '10px',
            color: '#cc3333',
            textAlign: 'center',
            padding: '0 12px',
            lineHeight: '1.4',
          }}
        >
          {error}
        </span>
      ) : (
        <>
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
        </>
      )}
    </div>
  );
}

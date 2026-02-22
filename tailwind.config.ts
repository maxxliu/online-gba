import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        retro: {
          'bg-darkest': 'var(--color-bg-darkest)',
          'bg-dark': 'var(--color-bg-dark)',
          'bg-mid': 'var(--color-bg-mid)',
          'bg-light': 'var(--color-bg-light)',
          blue: 'var(--color-blue)',
          'blue-glow': 'var(--color-blue-glow)',
          teal: 'var(--color-teal)',
          purple: 'var(--color-purple)',
          pink: 'var(--color-pink)',
          gold: 'var(--color-gold)',
          orange: 'var(--color-orange)',
          red: 'var(--color-red)',
          text: 'var(--color-text)',
          'text-secondary': 'var(--color-text-secondary)',
          'text-muted': 'var(--color-text-muted)',
          'shell-primary': 'var(--color-shell-primary)',
          'shell-secondary': 'var(--color-shell-secondary)',
          'shell-highlight': 'var(--color-shell-highlight)',
          'screen-bezel': 'var(--color-screen-bezel)',
          'screen-lcd': 'var(--color-screen-lcd)',
          'screen-lcd-active': 'var(--color-screen-lcd-active)',
          'lcd-darkest': 'var(--color-lcd-darkest)',
          'lcd-dark': 'var(--color-lcd-dark)',
          'lcd-light': 'var(--color-lcd-light)',
          'lcd-lightest': 'var(--color-lcd-lightest)',
          'led-on': 'var(--color-led-on)',
          'led-off': 'var(--color-led-off)',
          'speaker-slot': 'var(--color-speaker-slot)',
          'btn-a': 'var(--color-btn-a)',
          'btn-b': 'var(--color-btn-b)',
          'btn-start': 'var(--color-btn-start)',
          'btn-dpad': 'var(--color-btn-dpad)',
          'panel-bg': 'var(--color-panel-bg)',
          'panel-border': 'var(--color-panel-border)',
          'card-bg': 'var(--color-card-bg)',
          'card-hover': 'var(--color-card-hover)',
        },
      },
      fontFamily: {
        pixel: ['var(--font-pixel)', 'monospace'],
        mono: ['var(--font-mono)', 'ui-monospace', 'Cascadia Code', 'Courier New', 'monospace'],
      },
    },
  },
  plugins: [],
};
export default config;

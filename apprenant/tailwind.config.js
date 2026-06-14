/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'Segoe UI', 'sans-serif'],
        mono: ['JetBrains Mono', 'ui-monospace', 'monospace'],
      },
      colors: {
        base: '#09090B',
        surface: '#111114',
        elevated: '#18181B',
      },
      letterSpacing: {
        tight2: '-0.02em',
        tight3: '-0.03em',
      },
      boxShadow: {
        cta: 'inset 0 1px 0 rgba(255,255,255,0.15), 0 1px 2px rgba(0,0,0,0.3), 0 8px 24px rgba(59,130,246,0.18)',
      },
      animation: {
        'dot-pulse': 'dotPulse 1.6s ease-out infinite',
        'vf-pulse': 'vfPulse 2s ease-in-out infinite',
        'unlock': 'unlock 500ms cubic-bezier(0.16, 1, 0.3, 1)',
      },
      keyframes: {
        dotPulse: {
          '0%, 100%': { boxShadow: '0 0 0 0 rgba(16,185,129,0.5)' },
          '50%': { boxShadow: '0 0 0 6px rgba(16,185,129,0)' },
        },
        vfPulse: {
          '0%, 100%': { opacity: '0.55' },
          '50%': { opacity: '1' },
        },
        unlock: {
          '0%': { opacity: '0', transform: 'scale(0.92)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
      },
    },
  },
  plugins: [],
};

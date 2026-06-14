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
        highlight: '#1F1F23',
      },
      letterSpacing: {
        tight2: '-0.02em',
        tight3: '-0.03em',
      },
      boxShadow: {
        cta: 'inset 0 1px 0 rgba(255,255,255,0.15), 0 1px 2px rgba(0,0,0,0.3), 0 8px 24px rgba(59,130,246,0.18)',
      },
    },
  },
  plugins: [],
};

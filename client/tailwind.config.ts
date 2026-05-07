/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './hooks/**/*.{ts,tsx}',
    './lib/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50:  '#eff6ff',
          100: '#dbeafe',
          200: '#bfdbfe',
          400: '#60a5fa',
          500: '#3b82f6',
          600: '#2563eb',
          700: '#1d4ed8',
          900: '#1e3a8a',
        },
        surface: {
          0:   '#ffffff',
          50:  '#f9fafb',
          100: '#f3f4f6',
          200: '#e5e7eb',
        },
        success: { DEFAULT: '#059669', bg: '#ecfdf5',  text: '#065f46',  border: '#a7f3d0' },
        danger:  { DEFAULT: '#dc2626', bg: '#fef2f2',  text: '#991b1b',  border: '#fca5a5' },
        warning: { DEFAULT: '#d97706', bg: '#fffbeb',  text: '#92400e',  border: '#fcd34d' },
        info:    { DEFAULT: '#2563eb', bg: '#eff6ff',  text: '#1e40af',  border: '#93c5fd' },
      },
      fontFamily: {
        sans: ['var(--font-geist-sans)', 'system-ui', 'sans-serif'],
        mono: ['var(--font-geist-mono)', 'monospace'],
      },
      fontSize: {
        '2xs': ['0.65rem', { lineHeight: '1rem' }],
      },
      boxShadow: {
        'card':      '0 1px 3px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.04)',
        'card-md':   '0 4px 12px rgba(0,0,0,0.08)',
        'card-lg':   '0 8px 24px rgba(0,0,0,0.08)',
        'glow-brand':'0 0 24px rgba(37,99,235,0.15)',
      },
      backgroundImage: {
        'brand-gradient': 'linear-gradient(135deg, #2563eb 0%, #3b82f6 100%)',
        'wallet-gradient':'linear-gradient(135deg, #1d4ed8 0%, #2563eb 60%, #1e40af 100%)',
      },
      animation: {
        'fade-in':   'fadeIn 0.25s ease-in-out',
        'slide-up':  'slideUp 0.25s ease-out',
        'pulse-slow':'pulse 3s ease-in-out infinite',
      },
      keyframes: {
        fadeIn:  { from: { opacity: '0' },                                      to: { opacity: '1' } },
        slideUp: { from: { transform: 'translateY(6px)', opacity: '0' },        to: { transform: 'translateY(0)', opacity: '1' } },
      },
    },
  },
  plugins: [],
};

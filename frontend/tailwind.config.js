/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'mol': {
          'dark': '#0a0e1a',
          'darker': '#060912',
          'panel': '#111827',
          'card': '#1a2235',
          'border': '#1e293b',
          'accent': '#6366f1',
          'accent2': '#8b5cf6',
          'green': '#10b981',
          'orange': '#f59e0b',
          'blue': '#3b82f6',
          'red': '#ef4444',
          'cyan': '#06b6d4',
          'text': '#e2e8f0',
          'muted': '#94a3b8',
          'subtle': '#64748b',
        },
      },
      fontFamily: {
        'sans': ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        'mono': ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
      animation: {
        'glow': 'glow 2s ease-in-out infinite alternate',
        'slide-in': 'slideIn 0.3s ease-out',
        'fade-in': 'fadeIn 0.4s ease-out',
        'pulse-soft': 'pulseSoft 3s ease-in-out infinite',
      },
      keyframes: {
        glow: {
          '0%': { boxShadow: '0 0 5px rgba(99, 102, 241, 0.2)' },
          '100%': { boxShadow: '0 0 20px rgba(99, 102, 241, 0.4)' },
        },
        slideIn: {
          '0%': { transform: 'translateX(20px)', opacity: '0' },
          '100%': { transform: 'translateX(0)', opacity: '1' },
        },
        fadeIn: {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        pulseSoft: {
          '0%, 100%': { opacity: '0.6' },
          '50%': { opacity: '1' },
        },
      },
      backdropBlur: {
        'xs': '2px',
      },
    },
  },
  plugins: [],
}

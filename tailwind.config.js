/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        'theme-accent': 'rgb(var(--theme-accent) / <alpha-value>)',
        'theme-accent-muted': 'rgb(var(--theme-accent-muted) / <alpha-value>)',
        'theme-bg-tint': 'rgb(var(--theme-bg-tint) / <alpha-value>)',
        'theme-progress': 'rgb(var(--theme-progress) / <alpha-value>)',
        'theme-text-accent': 'rgb(var(--theme-text-accent) / <alpha-value>)',
        'panel-bg': 'rgb(var(--panel-bg-2) / <alpha-value>)',
        'panel-border': 'rgb(var(--panel-border) / <alpha-value>)',
        'glow-ambient': 'rgb(var(--glow-ambient) / <alpha-value>)',
        'stone-dark': '#1a1a2e',
        'stone-mid': '#232338',
        'leather-dark': '#2d1f11',
        'iron-mid': '#5a5a68',
      },
      fontFamily: {
        display: ['Cinzel', 'Georgia', 'serif'],
      },
      boxShadow: {
        'panel-inset': 'inset 0 2px 6px rgba(0,0,0,0.5)',
        'panel-emboss': 'inset 0 1px 0 rgba(255,255,255,0.04), 0 2px 8px rgba(0,0,0,0.6)',
        'iron-ridge': 'inset 0 1px 0 rgba(255,255,255,0.06), inset 0 -1px 0 rgba(0,0,0,0.4)',
      },
    },
  },
  plugins: [],
}

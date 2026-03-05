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
      },
    },
  },
  plugins: [],
}


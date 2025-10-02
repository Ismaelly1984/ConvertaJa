/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        brandIndigo: '#6366F1',
        brandViolet: '#8B5CF6',
      },
      boxShadow: {
        neu: '0 10px 30px rgba(2,6,23,0.08), inset 0 1px 0 rgba(255,255,255,0.25)',
      },
    },
  },
  plugins: [],
}


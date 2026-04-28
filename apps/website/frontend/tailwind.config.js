/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // MISJustice Alliance Brand Colors
        primary: {
          DEFAULT: '#123262', // Navy Blue
          50: '#E8EDF5',
          100: '#D1DBE9',
          200: '#A3B7D3',
          300: '#7593BD',
          400: '#476FA7',
          500: '#123262',  // Main brand color
          600: '#0E284E',
          700: '#0A1E3B',
          800: '#071427',
          900: '#030A14',
        },
        gold: {
          DEFAULT: '#B49650', // Gold accent
          50: '#F9F5EC',
          100: '#F3EBD9',
          200: '#E7D7B3',
          300: '#DBC38D',
          400: '#CFAF67',
          500: '#B49650',  // Main gold color
          600: '#8F7840',
          700: '#6A5A30',
          800: '#453C20',
          900: '#201E10',
        },
        // Neutral grays for text and backgrounds
        neutral: {
          50: '#F8FAFC',
          100: '#F1F5F9',
          200: '#E2E8F0',
          300: '#CBD5E1',
          400: '#94A3B8',
          500: '#64748B',
          600: '#475569',
          700: '#334155',
          800: '#1E293B',
          900: '#0F172A',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        serif: ['Merriweather', 'Georgia', 'serif'],
      },
    },
  },
  plugins: [],
}

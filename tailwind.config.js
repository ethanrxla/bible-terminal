/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  // useTheme toggles a `dark` class on <html>. Without this, Tailwind v3
  // defaults to `media`, so every `dark:` variant follows the OS setting and
  // ignores the in-app toggle -- which made the page shell go dark while every
  // card and panel inside it stayed light.
  darkMode: 'class',
  theme: {
    extend: {
      // Small phones are 320-390px wide; the default `sm` at 640px is far too
      // late to be the first step up from a single column.
      screens: {
        xs: '400px',
      },
      colors: {
        bible: {
          gold: '#FBBF24',
          parchment: '#F9F5EB',
          ink: '#1E293B',
          highlight: '#FEFCE8',
          accent: '#D4AF37',
        }
      },
      animation: {
        'cursor-blink': 'blink 1s step-end infinite',
        'text-fade': 'fadeIn 1.5s ease-in',
        'slow-pulse': 'pulse 4s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
      keyframes: {
        blink: {
          '0%, 100%': { opacity: 1 },
          '50%': { opacity: 0 },
        },
        fadeIn: {
          '0%': { opacity: 0 },
          '100%': { opacity: 1 },
        },
      },
      backgroundImage: {
        'parchment-texture': "url('https://images.pexels.com/photos/207665/pexels-photo-207665.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2')",
      },
    },
  },
  plugins: [],
};
/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
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
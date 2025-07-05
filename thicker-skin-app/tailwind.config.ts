import type { Config } from 'tailwindcss';

export default {
  darkMode: 'class',
  content: ['./pages/**/*.{js,ts,jsx,tsx}', './components/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        navy: '#0B0B0B',
        bone: '#F7F7FF',
        copper: '#B87333',
        amber: '#F59E0B',
        blood: '#DC3545',
        overlay: 'rgba(0,0,0,0.6)',
      },
      fontFamily: {
        sans: ['var(--font-inter)', 'sans-serif'],
        slab: ['var(--font-roboto-slab)', 'serif'],
      },
    },
  },
  plugins: [],
} satisfies Config;

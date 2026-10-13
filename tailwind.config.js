// Paleta dinámica: "brand" apunta a variables CSS que utils/theme.js genera a partir del color del hotel
// (mismo mecanismo que DemoPV y Citas). Cambiar el color no requiere recompilar.
function withOpacity(variable) {
  return ({ opacityValue }) =>
    opacityValue !== undefined ? `rgb(var(${variable}) / ${opacityValue})` : `rgb(var(${variable}))`
}

const ramp = (prefix) =>
  Object.fromEntries([50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950].map((k) => [k, withOpacity(`--${prefix}-${k}`)]))

/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        brand: ramp('brand'),
        // Acento (dorado por defecto) y menú lateral: también configurables por hotel.
        gold: {
          300: withOpacity('--accent-300'),
          400: withOpacity('--accent-400'),
          500: withOpacity('--accent-500'),
          600: withOpacity('--accent-600'),
        },
        sidebar: withOpacity('--sidebar'),
        ink: {
          950: '#05080f',
          900: '#0a0f1c',
          850: '#0e1526',
          800: '#131b30',
          700: '#1d2742',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        display: ['Fraunces', 'Georgia', 'serif'],
      },
      boxShadow: {
        soft: '0 1px 2px rgb(15 23 42 / 0.04), 0 8px 24px -8px rgb(15 23 42 / 0.12)',
        glow: '0 0 0 1px rgb(var(--brand-500) / 0.25), 0 12px 40px -12px rgb(var(--brand-600) / 0.55)',
      },
      keyframes: {
        'fade-up': { from: { opacity: 0, transform: 'translateY(10px)' }, to: { opacity: 1, transform: 'none' } },
        'scale-in': { from: { opacity: 0, transform: 'scale(.97)' }, to: { opacity: 1, transform: 'none' } },
        float: { '0%,100%': { transform: 'translateY(0)' }, '50%': { transform: 'translateY(-10px)' } },
        'bell-ring': {
          '0%,100%': { transform: 'rotate(0)' },
          '15%': { transform: 'rotate(14deg)' },
          '30%': { transform: 'rotate(-12deg)' },
          '45%': { transform: 'rotate(9deg)' },
          '60%': { transform: 'rotate(-6deg)' },
          '75%': { transform: 'rotate(3deg)' },
        },
      },
      animation: {
        'fade-up': 'fade-up .5s cubic-bezier(.2,.8,.2,1) both',
        'scale-in': 'scale-in .2s ease-out both',
        float: 'float 7s ease-in-out infinite',
        'bell-ring': 'bell-ring 1s ease-in-out both',
      },
    },
  },
  plugins: [],
}

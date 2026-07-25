/** @type {import('tailwindcss').Config} */
const withOpacity = (variable) => `rgb(var(${variable}) / <alpha-value>)`;

module.exports = {
  content: [
    './app/**/*.{js,jsx,ts,tsx}',
    './components/**/*.{js,jsx,ts,tsx}',
  ],
  presets: [require('nativewind/preset')],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Brand + neutral scales (scheme-independent)
        primary: {
          50: '#f0fdfa',
          100: '#ccfbf1',
          200: '#99f6e4',
          300: '#5eead4',
          400: '#2dd4bf',
          500: '#14b8a6',
          600: '#0d9488',
          700: '#0f766e',
          800: '#115e59',
          900: '#134e4a',
          950: '#042f2e',
        },
        secondary: {
          50: '#fdf4ff',
          100: '#fae8ff',
          200: '#f5d0fe',
          300: '#f0abfc',
          400: '#e879f9',
          500: '#d946ef',
          600: '#c026d3',
          700: '#a21caf',
          800: '#86198f',
          900: '#701a75',
          950: '#4a044e',
        },
        // Semantic tokens (resolve per light/dark via CSS vars in global.css)
        bg: withOpacity('--color-bg'),
        surface: withOpacity('--color-surface'),
        card: withOpacity('--color-card'),
        border: withOpacity('--color-border'),
        text: withOpacity('--color-text'),
        muted: withOpacity('--color-muted'),
        brand: withOpacity('--color-brand'),
        'brand-fg': withOpacity('--color-brand-fg'),
        danger: withOpacity('--color-danger'),
        success: withOpacity('--color-success'),
        warning: withOpacity('--color-warning'),
        info: withOpacity('--color-info'),
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        sm: '6px',
        md: '10px',
        lg: '14px',
        xl: '20px',
        '2xl': '28px',
      },
    },
  },
  plugins: [],
};

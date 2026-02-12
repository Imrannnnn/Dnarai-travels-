/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
        display: ['Outfit', 'sans-serif'],
      },
      colors: {
        // Dnarai Enterprise Brand Colors
        dnarai: {
          navy: {
            50: '#e8f1f5',
            100: '#d1e3eb',
            200: '#a3c7d7',
            300: '#75abc3',
            400: '#478faf',
            500: '#0f4c75',  // Primary brand color
            600: '#0c3d5e',
            700: '#092e46',
            800: '#061f2f',
            900: '#030f17',
          },
          gold: {
            50: '#fef7f1',
            100: '#fdeee3',
            200: '#fbddc7',
            300: '#f9ccab',
            400: '#f7bb8f',
            500: '#f4a261',  // Primary accent color
            600: '#e88a3f',
            700: '#d4721d',
            800: '#a05816',
            900: '#6c3b0f',
          },
        },
        // Legacy color names mapped to brand colors
        ocean: {
          50: '#e8f1f5',
          100: '#d1e3eb',
          200: '#a3c7d7',
          300: '#75abc3',
          400: '#478faf',
          500: '#0f4c75',
          600: '#0c3d5e',
          700: '#092e46',
          800: '#061f2f',
          900: '#030f17',
        },
        sand: {
          50: '#fef7f1',
          100: '#fdeee3',
          200: '#fbddc7',
          300: '#f9ccab',
          400: '#f7bb8f',
          500: '#f4a261',
        },
        coral: {
          400: '#f7bb8f',
          500: '#f4a261',
          600: '#e88a3f',
        },
        success: {
          500: '#22c55e',
          600: '#16a34a'
        },
      },
      boxShadow: {
        'soft': '0 2px 15px rgba(0, 0, 0, 0.05)',
        'card': '0 4px 20px rgba(0, 0, 0, 0.08)',
        'card-hover': '0 8px 30px rgba(0, 0, 0, 0.12)',
        'premium': '0 20px 40px -10px rgba(0, 0, 0, 0.1), 0 0 20px -5px rgba(0, 0, 0, 0.05)',
      },
      borderRadius: {
        'xl': '1rem',
        '2xl': '1.25rem',
        '3xl': '1.5rem',
        '4xl': '2rem',
      },
      transitionDuration: {
        '400': '400ms',
      }
    }
  },
  plugins: []
}

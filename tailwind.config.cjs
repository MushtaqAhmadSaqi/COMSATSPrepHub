module.exports = {
  darkMode: 'class',
  content: [
    './index.html',
    './src/**/*.{js,jsx}'
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        display: ['Space Grotesk', 'Inter', 'sans-serif'],
        urdu: ['"Noto Nastaliq Urdu"', '"Jameel Noori Nastaleeq"', 'serif']
      },
      colors: {
        primary: '#0ea5e9',
        'primary-hover': '#0284c7',
        'primary-light': '#e0f2fe',
        dark: '#1a1a2e',
        accent: '#38bdf8',
        brand: {
          50: '#f0f9ff',
          100: '#e0f2fe',
          400: '#38bdf8',
          500: '#0ea5e9',
          600: '#0284c7',
          700: '#1d4ed8',
          800: '#1e3a8a',
          900: '#172554'
        }
      }
    }
  },
  plugins: [
    require('@tailwindcss/typography'),
    require('@tailwindcss/forms'),
    require('@tailwindcss/aspect-ratio')
  ]
};

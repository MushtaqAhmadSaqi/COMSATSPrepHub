window.tailwind = window.tailwind || {};
window.tailwind.config = {
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
      },
      colors: {
        primary: '#0f766e',
        'primary-hover': '#0d6b64',
        'primary-light': '#ccfbf1',
        dark: '#1a1a2e',
        accent: '#0f9690',
        brand: {
          50: '#f0f9ff',
          100: '#e0f2fe',
          400: '#38bdf8',
          500: '#0ea5e9',
          600: '#0284c7',
        }
      }
    }
  }
};
if (typeof tailwind !== 'undefined') {
  tailwind.config = window.tailwind.config;
}

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './templates/**/*.html',
    './static/js/**/*.js',
  ],
  darkMode: 'class', // Enable dark mode via a 'dark' class on the <html> tag
  theme: {
    extend: {
      colors: {
        'lab-blue': '#3B82F6',
        'lab-purple': '#8B5CF6',
        'lab-gray': {
          'light': '#F3F4F6',
          'dark': '#1F2937',
          'card': '#4B5563'
        }
      }
    },
  },
  plugins: [],
}
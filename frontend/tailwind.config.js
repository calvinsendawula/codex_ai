/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,jsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          light: '#4F46E5', // Indigo-600
          dark: '#6366F1',  // Indigo-500
        },
        background: {
          light: '#F9FAFB', // Gray-50
          dark: '#111827',  // Gray-900
        },
        surface: {
          light: '#FFFFFF', // White
          dark: '#1F2937',  // Gray-800
        }
      }
    },
  },
  plugins: [
    require('@tailwindcss/typography'),
  ],
} 
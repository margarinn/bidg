/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        corporate: {
          bg: '#f8fafc', // Slate-50
          border: '#e2e8f0', // Slate-200
          primary: '#4f46e5', // Indigo-600
          text: '#0f172a', // Slate-900
        }
      }
    },
  },
  plugins: [],
}

/** @type {import('tailwindcss').Config} */
export default {
  // Alternancia claro/escuro pela classe .dark no <html>
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        // Paleta semantica via CSS variables (definidas em index.css).
        brand: {
          DEFAULT: 'var(--c-brand)',
          soft: 'var(--c-brand-soft)'
        }
      }
    }
  },
  plugins: []
}

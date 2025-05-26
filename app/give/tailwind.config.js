// tailwind.config.js
/** @type {import('tailwindcss').Config} */ 
module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx}",       // <- pour les fichiers dans le dossier /app
    "./pages/**/*.{js,ts,jsx,tsx}",     // <- si tu utilises encore /pages
    "./components/**/*.{js,ts,jsx,tsx}" // <- pour tes composants
  ],
  theme: {
    extend: {},
  },
  plugins: [],
};

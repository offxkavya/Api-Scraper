/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: '#09090b', // zinc-950
        card: '#18181b', // zinc-900
        primary: '#3b82f6', // blue-500
        muted: '#71717a', // zinc-500
      }
    },
  },
  plugins: [],
}

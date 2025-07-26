/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        ankkor: {
          background: "#f8f8f5",
          foreground: "#2c2c27",
          primary: "#2c2c27",
          secondary: "#8a8778",
          accent: "#5c5c52",
          muted: "#e5e2d9",
          light: "#f4f3f0",
        },
      },
      fontFamily: {
        serif: ['var(--font-playfair)'],
        sans: ['var(--font-inter)'],
      },
      maxWidth: {
        '7xl': '80rem',
      },
      spacing: {
        '3': '0.75rem',
        '6': '1.5rem',
      },
      fontSize: {
        'sm': '0.875rem',
      },
      letterSpacing: {
        'wider': '0.05em',
      },
      borderRadius: {
        'xs': '0.125rem',
      },
    },
  },
  plugins: [],
} 
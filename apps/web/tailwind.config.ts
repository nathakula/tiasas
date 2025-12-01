import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        gold: {
          50: '#fdfbf3',
          100: '#faf6e6',
          200: '#f5ecc0',
          300: '#edd899',
          400: '#e6c566',
          500: '#D4AF37',  // Primary TIASAS gold
          600: '#b8962f',
          700: '#9c7d27',
          800: '#80651f',
          900: '#644d17',
        },
      },
      borderRadius: {
        '2xl': '1rem',
      },
      boxShadow: {
        soft: '0 4px 24px rgba(0,0,0,0.06)',
      }
    },
  },
  plugins: [],
};

export default config;

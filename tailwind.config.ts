import type { Config } from "tailwindcss";

export default {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#f0f4ff',
          100: '#dbe4fe',
          200: '#bfd0fe',
          300: '#93b2fd',
          400: '#608afa',
          500: '#3b66f5',
          600: '#2547eb',
          700: '#1d34d8',
          800: '#1e2cb0',
          900: '#1e2a8a',
          950: '#171b54',
        },
      },
    },
  },
  plugins: [],
} satisfies Config;

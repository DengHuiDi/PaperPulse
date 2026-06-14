import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        "nav-bg": "#1a2744",
        "paper-bg": "#faf8f5",
        "accent": "#1a2744",
        "thesis-yellow": "#fff3cd",
        "concept-red": "#f8d7da",
        "evidence-blue": "#d1ecf1",
        "concession-green": "#d4edda",
        "method-purple": "#e2d9f3",
        "border-color": "#dee2e6",
        "text-primary": "#2c3e50",
        "text-secondary": "#5a6c7d",
      },
    },
  },
  plugins: [],
};

export default config;

/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        coffee: "#4a3b32",
        terracotta: "#d35400",
        powder: "#b4cded",
        vanilla: "#f3e5ab",
        "light-vanilla": "#fdfbf7",
        mint: "#98ff98",
      },
      borderWidth: {
        3: "3px",
      },
      keyframes: {
        shake: {
          "0%, 100%": { transform: "translateX(0)" },
          "25%": { transform: "translateX(-5px)" },
          "75%": { transform: "translateX(5px)" },
        },
        "gradient-shift": {
          "0%": { backgroundPosition: "0% 50%" },
          "50%": { backgroundPosition: "100% 50%" },
          "100%": { backgroundPosition: "0% 50%" },
        },
        flip: {
          "0%, 100%": { transform: "rotateY(0deg)" },
          "50%": { transform: "rotateY(180deg)" },
        },
      },
      animation: {
        shake: "shake 0.5s ease-in-out",
        "gradient-shift": "gradient-shift 3s ease infinite",
        flip: "flip 2s infinite",
      },
    },
  },
  plugins: [],
};

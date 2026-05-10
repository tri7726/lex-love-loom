/**
 * Shared Tailwind preset (Sakura theme tokens).
 * Apps extend this in their own tailwind.config.{ts,js}.
 */
module.exports = {
  theme: {
    extend: {
      colors: {
        sakura: {
          50: "hsl(340 100% 97%)",
          100: "hsl(340 90% 92%)",
          300: "hsl(340 75% 78%)",
          500: "hsl(340 65% 60%)",
          700: "hsl(340 55% 45%)",
        },
      },
      fontFamily: {
        display: ["Outfit", "system-ui", "sans-serif"],
        jp: ['"Noto Sans JP"', "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};

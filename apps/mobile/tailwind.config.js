/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,jsx,ts,tsx}",
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        void: "var(--dc-void)",
        panel: "var(--dc-panel)",
        "panel-raised": "var(--dc-panel-raised)",
        line: "var(--dc-line)",
        text: "var(--dc-text)",
        muted: "var(--dc-muted)",
        faint: "var(--dc-faint)",
        "neon-pink": "var(--dc-neon-pink)",
        "neon-cyan": "var(--dc-neon-cyan)",
        "neon-purple": "var(--dc-neon-purple)",
        acid: "var(--dc-acid)",
        hot: "var(--dc-hot)",
        warm: "var(--dc-warm)",
        cold: "var(--dc-cold)",
        danger: "var(--dc-danger)",
        success: "var(--dc-success)",
      },
    },
  },
  plugins: [],
};

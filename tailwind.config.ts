import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./lib/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        void: "#050509",
        graphite: "#111217",
        panel: "rgba(18, 20, 27, 0.72)",
        line: "rgba(255, 255, 255, 0.12)",
        frost: "#dce6ee",
        muted: "#7f8b97",
        amber: "#d7b46a",
        cyan: "#75d7e5",
        signal: "#f2f4f8"
      },
      fontFamily: {
        display: ["var(--font-display)", "Inter", "ui-sans-serif", "system-ui"],
        mono: ["var(--font-mono)", "JetBrains Mono", "ui-monospace", "SFMono-Regular", "monospace"]
      },
      boxShadow: {
        vault: "0 30px 90px rgba(0,0,0,0.45)",
        insetLine: "inset 0 1px 0 rgba(255,255,255,0.08)"
      },
      backgroundImage: {
        radialNoise:
          "radial-gradient(circle at 20% 20%, rgba(117,215,229,0.12), transparent 28%), radial-gradient(circle at 80% 10%, rgba(215,180,106,0.10), transparent 24%), linear-gradient(135deg, #050509 0%, #0b0d12 45%, #07080d 100%)"
      }
    }
  },
  plugins: []
};

export default config;

import type { Persona } from "@/lib/ui-contract";

export interface Theme {
  label: string;
  bg: string;
  surface: string;
  ink: string;
  muted: string;
  accent: string;
  rule: string;
  fontBody: string;
  fontDisplay: string;
  measure: number;
}

export const THEMES: Record<Persona, Theme> = {
  researcher: {
    label: "Researcher",
    bg: "#efe7d6", surface: "#f8f3e7", ink: "#211d16", muted: "#6b6149",
    accent: "#8a2b2b", rule: "#cdbfa0",
    fontBody: "'Newsreader', Georgia, serif", fontDisplay: "'Newsreader', Georgia, serif",
    measure: 660,
  },
  developer: {
    label: "Developer",
    bg: "#0b0f17", surface: "#121826", ink: "#d6deeb", muted: "#7b88a1",
    accent: "#5ef2a0", rule: "#1f2937",
    fontBody: "'JetBrains Mono', ui-monospace, monospace", fontDisplay: "'JetBrains Mono', ui-monospace, monospace",
    measure: 720,
  },
  business: {
    label: "Business team",
    bg: "#eef1f6", surface: "#ffffff", ink: "#0f1b2d", muted: "#5b6677",
    accent: "#1d4ed8", rule: "#dde3ec",
    fontBody: "'Archivo', sans-serif", fontDisplay: "'Archivo', sans-serif",
    measure: 760,
  },
  enduser: {
    label: "End user",
    bg: "linear-gradient(160deg,#fff1e6 0%,#ffe3ec 45%,#e8f6ff 100%)",
    surface: "#ffffff", ink: "#3a2a3f", muted: "#8a7790",
    accent: "#ff5d73", rule: "#ffd9d0",
    fontBody: "'Nunito', sans-serif", fontDisplay: "'Fredoka', sans-serif",
    measure: 640,
  },
};
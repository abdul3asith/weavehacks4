import type { Persona } from "@/lib/ui-contract";

export interface Theme {
  label: string;
  bg: string;
  // Solid-color twin of bg, used where a gradient breaks (SVG stroke for the
  // diagram label halo, for example). Always a hex; never a gradient.
  bgSolid: string;
  surface: string;
  ink: string;
  muted: string;
  accent: string;
  rule: string;
  fontBody: string;
  fontDisplay: string;
  measure: number;
  // Typography decisions used to live as `persona === "X" ? … : …` ternaries
  // in Block.tsx. Moving them onto Theme lets the theme agent (or a new static
  // theme) pick them per persona, and keeps Block.tsx free of persona literals.
  headingSize: number;
  headingWeight: number;
  headingLetterSpacing: string;
  headingMarginBottom: number;
  headingPrefix: string;
  subtitleSize: number;
  subtitleItalic: boolean;
  headerDivider: boolean;
  proseSize: number;
  proseLineHeight: number;
}

export const THEMES: Record<Persona, Theme> = {
  researcher: {
    label: "Researcher",
    bg: "#efe7d6", bgSolid: "#efe7d6", surface: "#f8f3e7", ink: "#211d16", muted: "#6b6149",
    accent: "#8a2b2b", rule: "#cdbfa0",
    fontBody: "'Newsreader', Georgia, serif", fontDisplay: "'Newsreader', Georgia, serif",
    measure: 660,
    headingSize: 38, headingWeight: 600, headingLetterSpacing: "0", headingMarginBottom: 18,
    headingPrefix: "",
    subtitleSize: 17, subtitleItalic: true,
    headerDivider: true,
    proseSize: 18, proseLineHeight: 1.7,
  },
  developer: {
    label: "Developer",
    bg: "#0b0f17", bgSolid: "#0b0f17", surface: "#121826", ink: "#d6deeb", muted: "#7b88a1",
    accent: "#5ef2a0", rule: "#1f2937",
    fontBody: "'JetBrains Mono', ui-monospace, monospace", fontDisplay: "'JetBrains Mono', ui-monospace, monospace",
    measure: 720,
    headingSize: 30, headingWeight: 600, headingLetterSpacing: "-0.01em", headingMarginBottom: 18,
    headingPrefix: "$ ",
    subtitleSize: 15, subtitleItalic: false,
    headerDivider: false,
    proseSize: 15.5, proseLineHeight: 1.65,
  },
  business: {
    label: "Business team",
    bg: "#eef1f6", bgSolid: "#eef1f6", surface: "#ffffff", ink: "#0f1b2d", muted: "#5b6677",
    accent: "#1d4ed8", rule: "#dde3ec",
    fontBody: "'Archivo', sans-serif", fontDisplay: "'Archivo', sans-serif",
    measure: 760,
    headingSize: 38, headingWeight: 800, headingLetterSpacing: "-0.02em", headingMarginBottom: 18,
    headingPrefix: "",
    subtitleSize: 15, subtitleItalic: false,
    headerDivider: false,
    proseSize: 15.5, proseLineHeight: 1.65,
  },
  enduser: {
    label: "End user",
    bg: "linear-gradient(160deg,#fff1e6 0%,#ffe3ec 45%,#e8f6ff 100%)",
    bgSolid: "#ffe3ec",
    surface: "#ffffff", ink: "#3a2a3f", muted: "#8a7790",
    accent: "#ff5d73", rule: "#ffd9d0",
    fontBody: "'Nunito', sans-serif", fontDisplay: "'Fredoka', sans-serif",
    measure: 640,
    headingSize: 40, headingWeight: 600, headingLetterSpacing: "-0.01em", headingMarginBottom: 8,
    headingPrefix: "",
    subtitleSize: 15, subtitleItalic: false,
    headerDivider: false,
    proseSize: 18, proseLineHeight: 1.65,
  },
  designer: {
    label: "Designer",
    bg: "#f6f1ea", bgSolid: "#f6f1ea", surface: "#fffaf2", ink: "#1a1612", muted: "#6f6356",
    accent: "#2e3da7", rule: "#e6dccb",
    fontBody: "'Inter', sans-serif", fontDisplay: "'Playfair Display', Georgia, serif",
    measure: 700,
    headingSize: 44, headingWeight: 700, headingLetterSpacing: "-0.02em", headingMarginBottom: 22,
    headingPrefix: "",
    subtitleSize: 16, subtitleItalic: true,
    headerDivider: false,
    proseSize: 16.5, proseLineHeight: 1.65,
  },
  journalist: {
    label: "Journalist",
    bg: "#f9f6f1", bgSolid: "#f9f6f1", surface: "#ffffff", ink: "#161311", muted: "#665e54",
    accent: "#1a3a5c", rule: "#d8cfc1",
    fontBody: "'Lora', Georgia, serif", fontDisplay: "'Lora', Georgia, serif",
    measure: 680,
    headingSize: 40, headingWeight: 700, headingLetterSpacing: "-0.01em", headingMarginBottom: 16,
    headingPrefix: "",
    subtitleSize: 16, subtitleItalic: true,
    headerDivider: true,
    proseSize: 17.5, proseLineHeight: 1.7,
  },
  student: {
    label: "Student",
    bg: "#fefcf6", bgSolid: "#fefcf6", surface: "#ffffff", ink: "#2a2620", muted: "#7a6e60",
    accent: "#d97706", rule: "#ecdcb8",
    fontBody: "'Quicksand', sans-serif", fontDisplay: "'Caveat', cursive",
    measure: 660,
    headingSize: 42, headingWeight: 700, headingLetterSpacing: "0", headingMarginBottom: 12,
    headingPrefix: "",
    subtitleSize: 16, subtitleItalic: false,
    headerDivider: false,
    proseSize: 16.5, proseLineHeight: 1.75,
  },
  marketer: {
    label: "Marketer",
    bg: "#ffffff", bgSolid: "#ffffff", surface: "#fafafa", ink: "#0a0a0a", muted: "#525252",
    accent: "#c2410c", rule: "#e5e5e5",
    fontBody: "'Space Grotesk', sans-serif", fontDisplay: "'Space Grotesk', sans-serif",
    measure: 740,
    headingSize: 42, headingWeight: 800, headingLetterSpacing: "-0.025em", headingMarginBottom: 16,
    headingPrefix: "",
    subtitleSize: 15, subtitleItalic: false,
    headerDivider: false,
    proseSize: 16, proseLineHeight: 1.6,
  },
};

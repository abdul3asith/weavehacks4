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
  rule: string;

  // Structured 3-color palette. The theme agent (and the static fallback) pick
  // these as a harmonized system: primary is the brand anchor, secondary is
  // analogous or complementary, tertiary creates a third hue position. Each
  // color has dedicated usages in Block.tsx — see the comments below.
  // primary: callout border + title, references link, terminal $ prefix, steps
  // number bg, links border, tldr bg, analogy title, diagram edge halo.
  primary: string;
  // secondary: keypoints heading text, inline <code> chip bg, code lang label,
  // tldr-wedge left stripe.
  secondary: string;
  // tertiary: sup citations, diagram edge label, small decorative flourishes.
  tertiary: string;

  // Pre-computed rgba strings derived from primary, used in places that need a
  // semi-transparent tint (Block.tsx used to hardcode researcher/business hues
  // here, which looked wrong on every other persona).
  calloutTint: string;
  tldrShadow: string;

  // Per-theme syntax colors for the `code` block. Light themes need tonal
  // colors readable on `surface`; dark themes (developer) keep the synthwave
  // palette. Replaces the old hardcoded #ff7edb / #5ef2a0 / #6cb6ff trio.
  codeKeyword: string;
  codeString: string;
  codeFunction: string;

  fontBody: string;
  fontDisplay: string;
  measure: number;
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

  // Layout flags — small persona-distinctive treatments the renderer opts into.
  // dropCap: render the first letter of the first prose block as a 3em
  // primary-colored float-left drop-cap (journalist).
  dropCap: boolean;
  // headerRail: wrap the <header> in a 4px-left-border container in primary
  // (designer).
  headerRail: boolean;
  // tldrStyle: "soft" = current rounded shadow box; "wedge" = sharp corner,
  // left stripe in secondary, no shadow (marketer).
  tldrStyle: "soft" | "wedge";
}

export const THEMES: Record<Persona, Theme> = {
  researcher: {
    label: "Researcher",
    bg: "#efe7d6", bgSolid: "#efe7d6", surface: "#f8f3e7",
    ink: "#211d16", muted: "#6b6149", rule: "#cdbfa0",
    primary: "#7a1c1c", secondary: "#1d3557", tertiary: "#b08c4a",
    calloutTint: "rgba(122, 28, 28, 0.07)",
    tldrShadow: "rgba(122, 28, 28, 0.22)",
    codeKeyword: "#7a1c1c", codeString: "#1d3557", codeFunction: "#5a3e1a",
    fontBody: "'EB Garamond', Georgia, serif",
    fontDisplay: "'EB Garamond', Georgia, serif",
    measure: 660,
    headingSize: 40, headingWeight: 600, headingLetterSpacing: "0", headingMarginBottom: 18,
    headingPrefix: "",
    subtitleSize: 18, subtitleItalic: true,
    headerDivider: true,
    proseSize: 18.5, proseLineHeight: 1.7,
    dropCap: false, headerRail: false, tldrStyle: "soft",
  },
  journalist: {
    label: "Journalist",
    // KEY journalist differentiator: pure WHITE bg (not cream) and a
    // TWO-SERIF system — heavy display serif (Playfair Display) over a
    // workhorse body serif (Source Serif 4). Researcher uses EB Garamond
    // throughout on warm parchment; journalist uses different serifs on
    // white. Same "serif" family of personas, totally different feel.
    bg: "#ffffff", bgSolid: "#ffffff", surface: "#f9f7f2",
    ink: "#0f0f0f", muted: "#5e5e5e", rule: "#d8d2c6",
    primary: "#1a3a5c", secondary: "#9c1d1f", tertiary: "#8a6f3c",
    calloutTint: "rgba(26, 58, 92, 0.07)",
    tldrShadow: "rgba(26, 58, 92, 0.22)",
    codeKeyword: "#9c1d1f", codeString: "#1a3a5c", codeFunction: "#8a6f3c",
    fontBody: "'Source Serif 4', Georgia, serif",
    fontDisplay: "'Playfair Display', Georgia, serif",
    measure: 680,
    headingSize: 48, headingWeight: 800, headingLetterSpacing: "-0.02em", headingMarginBottom: 18,
    headingPrefix: "",
    subtitleSize: 18, subtitleItalic: true,
    headerDivider: true,
    proseSize: 18, proseLineHeight: 1.7,
    dropCap: true, headerRail: false, tldrStyle: "soft",
  },
  developer: {
    label: "Developer",
    bg: "#0b0f17", bgSolid: "#0b0f17", surface: "#121826",
    ink: "#d6deeb", muted: "#7b88a1", rule: "#1f2937",
    primary: "#5ef2a0", secondary: "#6cb6ff", tertiary: "#ff7edb",
    calloutTint: "rgba(94, 242, 160, 0.08)",
    tldrShadow: "rgba(94, 242, 160, 0.28)",
    codeKeyword: "#ff7edb", codeString: "#5ef2a0", codeFunction: "#6cb6ff",
    fontBody: "'JetBrains Mono', ui-monospace, monospace",
    fontDisplay: "'JetBrains Mono', ui-monospace, monospace",
    measure: 720,
    headingSize: 30, headingWeight: 600, headingLetterSpacing: "-0.01em", headingMarginBottom: 18,
    headingPrefix: "$ ",
    subtitleSize: 15, subtitleItalic: false,
    headerDivider: false,
    proseSize: 15.5, proseLineHeight: 1.65,
    dropCap: false, headerRail: false, tldrStyle: "soft",
  },
  business: {
    label: "Business team",
    bg: "#eef1f6", bgSolid: "#eef1f6", surface: "#ffffff",
    ink: "#0f1b2d", muted: "#5b6677", rule: "#dde3ec",
    primary: "#0f3460", secondary: "#1f8b59", tertiary: "#9b6d2a",
    calloutTint: "rgba(15, 52, 96, 0.06)",
    tldrShadow: "rgba(15, 52, 96, 0.24)",
    codeKeyword: "#0f3460", codeString: "#1f8b59", codeFunction: "#9b6d2a",
    fontBody: "'Archivo', sans-serif", fontDisplay: "'Archivo', sans-serif",
    measure: 760,
    headingSize: 38, headingWeight: 800, headingLetterSpacing: "-0.02em", headingMarginBottom: 18,
    headingPrefix: "",
    subtitleSize: 15, subtitleItalic: false,
    headerDivider: false,
    proseSize: 15.5, proseLineHeight: 1.65,
    dropCap: false, headerRail: false, tldrStyle: "soft",
  },
  enduser: {
    label: "End user",
    bg: "linear-gradient(160deg,#fff1e6 0%,#ffe3ec 45%,#e8f6ff 100%)",
    bgSolid: "#ffe3ec",
    surface: "#ffffff",
    ink: "#3a2a3f", muted: "#8a7790", rule: "#ffd9d0",
    primary: "#ff5d73", secondary: "#3d8eb0", tertiary: "#d97706",
    calloutTint: "rgba(255, 93, 115, 0.09)",
    tldrShadow: "rgba(255, 93, 115, 0.28)",
    codeKeyword: "#d8456b", codeString: "#3d8eb0", codeFunction: "#c97f1a",
    fontBody: "'Nunito', sans-serif", fontDisplay: "'Fredoka', sans-serif",
    measure: 640,
    headingSize: 40, headingWeight: 600, headingLetterSpacing: "-0.01em", headingMarginBottom: 8,
    headingPrefix: "",
    subtitleSize: 15, subtitleItalic: false,
    headerDivider: false,
    proseSize: 18, proseLineHeight: 1.65,
    dropCap: false, headerRail: false, tldrStyle: "soft",
  },
  designer: {
    label: "Designer",
    // DARK editorial gallery — Pentagram / Apple Newsroom / NY Magazine dark
    // mode. The three light-cream personas (researcher, journalist on white,
    // student on yellow) bled together visually before; going dark for
    // designer is the most radical differentiation possible.
    bg: "#0f0e0c", bgSolid: "#0f0e0c", surface: "#1a1815",
    ink: "#f4eee0", muted: "#a59989", rule: "#2a2722",
    // Vermillion that POPS on dark. Secondary gold and tertiary sage form a
    // sophisticated triad against the rich black bg.
    primary: "#ff5337", secondary: "#e8c97c", tertiary: "#7fc4b8",
    calloutTint: "rgba(255, 83, 55, 0.12)",
    tldrShadow: "rgba(255, 83, 55, 0.35)",
    codeKeyword: "#ff5337", codeString: "#e8c97c", codeFunction: "#7fc4b8",
    fontBody: "'DM Sans', system-ui, sans-serif",
    fontDisplay: "'Fraunces', Georgia, serif",
    measure: 720,
    headingSize: 56, headingWeight: 700, headingLetterSpacing: "-0.035em", headingMarginBottom: 26,
    headingPrefix: "",
    subtitleSize: 18, subtitleItalic: true,
    headerDivider: false,
    proseSize: 17, proseLineHeight: 1.7,
    dropCap: false, headerRail: true, tldrStyle: "soft",
  },
  student: {
    label: "Student",
    // Legal-pad yellow paper — the most recognizably "student notes" bg
    // possible. Pen-ink palette: royal blue (the pen), red (correction marks),
    // green (highlighter underline). Clearly distinct from the cream-paper
    // researcher and white-paper journalist.
    bg: "#fbf5d8", bgSolid: "#fbf5d8", surface: "#fefae7",
    ink: "#1c1816", muted: "#675a3e", rule: "#e8dfb6",
    primary: "#2c4ea7", secondary: "#c2410c", tertiary: "#3a6e3f",
    calloutTint: "rgba(44, 78, 167, 0.08)",
    tldrShadow: "rgba(44, 78, 167, 0.22)",
    codeKeyword: "#2c4ea7", codeString: "#c2410c", codeFunction: "#3a6e3f",
    fontBody: "'Quicksand', sans-serif", fontDisplay: "'Caveat', cursive",
    measure: 660,
    headingSize: 48, headingWeight: 700, headingLetterSpacing: "0", headingMarginBottom: 14,
    headingPrefix: "",
    subtitleSize: 18, subtitleItalic: false,
    headerDivider: false,
    proseSize: 16.5, proseLineHeight: 1.75,
    dropCap: false, headerRail: false, tldrStyle: "soft",
  },
  marketer: {
    label: "Marketer",
    bg: "#ffffff", bgSolid: "#ffffff", surface: "#f6f4ef",
    ink: "#0a0908", muted: "#5c574e", rule: "#e7e4dd",
    primary: "#d63a17", secondary: "#0a0908", tertiary: "#c97e15",
    calloutTint: "rgba(214, 58, 23, 0.08)",
    tldrShadow: "rgba(214, 58, 23, 0.0)", // wedge style has no shadow
    codeKeyword: "#d63a17", codeString: "#0a0908", codeFunction: "#c97e15",
    // Drops Space Grotesk (AI-slop). Bricolage Grotesque is a more distinctive
    // variable grotesque with built-in personality.
    fontBody: "'Bricolage Grotesque', system-ui, sans-serif",
    fontDisplay: "'Bricolage Grotesque', system-ui, sans-serif",
    measure: 740,
    headingSize: 46, headingWeight: 800, headingLetterSpacing: "-0.03em", headingMarginBottom: 16,
    headingPrefix: "",
    subtitleSize: 16, subtitleItalic: false,
    headerDivider: false,
    proseSize: 16, proseLineHeight: 1.6,
    dropCap: false, headerRail: false, tldrStyle: "wedge",
  },
};

import { z } from "zod";
import { zodResponseFormat } from "openai/helpers/zod";
import type { Persona } from "../ui-contract";
import { openai, MODEL } from "../openai";
import { weave } from "../weave";
import { THEMES, type Theme } from "@/components/render/Theme";
import { getCachedTheme, setCachedTheme } from "../cache";

export interface ThemeInput {
  request: string;
  persona: Persona;
}

// LLM-facing schema. Colors are 6-digit hex except `bg` (allows
// linear-gradient) and the two pre-tinted rgba slots (calloutTint, tldrShadow).
const HEX = /^#[0-9a-fA-F]{6}$/;
const Hex = z.string().regex(HEX, "must be a 6-digit hex color");
const Rgba = z.string().regex(
  /^rgba\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*,\s*[\d.]+\s*\)$/,
  "must be an rgba(r, g, b, a) string"
);
const FontFallback = z.enum(["serif", "sans-serif", "monospace", "system-ui"]);
const FontPick = z.object({
  family: z.string().min(2).max(50),
  fallback: FontFallback,
});

const ThemeS = z.object({
  bg: z.string().regex(
    /^(#[0-9a-fA-F]{6}|linear-gradient\(.+\))$/,
    "must be a hex color or linear-gradient(...)"
  ),
  bgSolid: Hex,
  surface: Hex,
  ink: Hex,
  muted: Hex,
  rule: Hex,
  // Structured 3-color palette. The agent picks them as a harmonized system —
  // primary anchors the brand, secondary is analogous (within ~30° hue) or
  // complementary (~180° opposite); tertiary is the third hue position. The
  // post-parse harmony check enforces hue separation + saturation.
  primary: Hex,
  secondary: Hex,
  tertiary: Hex,
  // Pre-tinted rgba surfaces for the callout bg and tldr shadow. Asking the
  // agent to emit these directly is simpler than computing them — and lets the
  // agent pick alpha based on the theme's overall contrast.
  calloutTint: Rgba,
  tldrShadow: Rgba,
  // Per-theme syntax colors (must be readable on `surface`, i.e. dark on light
  // surfaces; bright on dark surfaces).
  codeKeyword: Hex,
  codeString: Hex,
  codeFunction: Hex,

  body: FontPick,
  display: FontPick,
  measure: z.number().int().min(560).max(820),
  headingSize: z.number().int().min(24).max(64),
  headingWeight: z.number().int().min(400).max(900),
  headingLetterSpacing: z.string().regex(/^-?(0|0?\.\d+em)$/, "must be '0' or an em offset like '-0.02em'"),
  headingMarginBottom: z.number().int().min(0).max(48),
  headingPrefix: z.string().max(4),
  subtitleSize: z.number().int().min(12).max(22),
  subtitleItalic: z.boolean(),
  headerDivider: z.boolean(),
  proseSize: z.number().min(13).max(22),
  proseLineHeight: z.number().min(1.3).max(2.0),

  // Layout flags. The persona policy in PERSONA_LAYOUT below pins these so a
  // persona's signature (journalist drop-cap, designer header-rail, marketer
  // tldr-wedge) can't drift across runs.
  dropCap: z.boolean(),
  headerRail: z.boolean(),
  tldrStyle: z.enum(["soft", "wedge"]),
});

// Per-persona policy for the layout flags. The static THEMES match these; the
// agent's output is rejected if it drifts (e.g. agent dropped journalist's
// drop-cap). One source of truth, used by both the prompt and the validator.
const PERSONA_LAYOUT: Record<Persona, { dropCap: boolean; headerRail: boolean; tldrStyle: "soft" | "wedge" }> = {
  researcher: { dropCap: false, headerRail: false, tldrStyle: "soft" },
  journalist: { dropCap: true, headerRail: false, tldrStyle: "soft" },
  developer: { dropCap: false, headerRail: false, tldrStyle: "soft" },
  business: { dropCap: false, headerRail: false, tldrStyle: "soft" },
  enduser: { dropCap: false, headerRail: false, tldrStyle: "soft" },
  designer: { dropCap: false, headerRail: true, tldrStyle: "soft" },
  student: { dropCap: false, headerRail: false, tldrStyle: "soft" },
  marketer: { dropCap: false, headerRail: false, tldrStyle: "wedge" },
};

// Per-persona UX heuristics. Each entry covers archetype, palette direction
// (primary/secondary/tertiary relationship), and typography ranges. Layout
// flags are appended programmatically below.
const HEURISTICS: Record<Persona, string> = {
  researcher:
    "Editorial, archival, journal-like (Oxford / JSTOR / academic press). Body and display are the same serif (e.g. EB Garamond, Source Serif Pro, Cormorant Garamond, Crimson Pro). Background is parchment/cream/ivory. Ink is near-black. PALETTE: primary is a restrained editorial color — oxblood, forest, deep cobalt, ink-navy (never neon). secondary is COMPLEMENTARY or analogous-cool (e.g. oxblood primary → ink-navy secondary). tertiary is a small warm punch (aged-gold, sepia) used only for sup citations. Measure 640–700. headingSize 36–42, headingWeight 600, headingLetterSpacing '0', headerDivider true, subtitleItalic true, proseSize 17–19, proseLineHeight 1.65–1.75, headingPrefix ''. Topic may color the palette (biology → muted greens; physics → cool slates; humanities → warm umbers); never break the editorial feel.",
  journalist:
    "Newspaper / magazine longform — NYT, The Atlantic, FT Weekend. KEY DIFFERENTIATOR FROM RESEARCHER: pure WHITE bg (not cream — researcher owns the cream paper) AND a TWO-SERIF system (different display serif over different body serif). NEVER pick a sans-serif display on serif body — they don't visually harmonize. Display is a heavy editorial serif (Playfair Display, Frank Ruhl Libre, Cormorant Garamond, Bodoni Moda). Body is a workhorse news serif (Source Serif 4, PT Serif, Crimson Pro, Spectral) — different family from display. NEVER pick EB Garamond (researcher owns it) or Tinos (bland). PALETTE: primary is a deep editorial color (ink-navy, oxblood, deep forest). secondary is a complementary accent used SPARINGLY (newspaper red against navy primary, or navy against red primary). tertiary is sepia. Measure 660–700. headingSize 44–52, headingWeight 700–800, headerDivider true, subtitleItalic true (dek/standfirst feel), proseSize 17–19, proseLineHeight 1.7–1.8, headingPrefix ''. Drop-cap is on (its glyph is rendered in fontBody, so pick a body serif with a beautiful drop-cap-able letterform).",
  developer:
    "Terminal / IDE aesthetic. Body and display are monospace (JetBrains Mono, Fira Code, IBM Plex Mono, Space Mono). Background is near-black or very dark navy. Ink is light (#d6deeb-ish). PALETTE: primary is the dominant neon (terminal-green, electric cyan, magenta), secondary is a contrasting bright (sky-blue if primary is green, etc), tertiary is the third syntax color (magenta if primary green + secondary blue — synthwave triad). Code syntax colors are these three. Measure 700–760. headingSize 28–32, headingWeight 600, headingLetterSpacing '-0.01em', headingPrefix '$ ', headerDivider false, subtitleItalic false, proseSize 15–16, proseLineHeight 1.6–1.7. The dark + mono base is non-negotiable.",
  business:
    "Crisp executive deck / FT-style. Body and display are the same geometric or neo-grotesk sans (Archivo, IBM Plex Sans, Manrope). Background is very light (off-white / pale grey). Ink is near-black navy. PALETTE: primary MUST be a dark color (luminance < 0.35) — deep navy, forest green, slate, oxblood — because the tldr panel renders white text on it. secondary is a corporate complementary (e.g. navy primary → muted forest secondary). tertiary is a single muted gold or burnished bronze. Measure 720–780. headingSize 36–42, headingWeight 800, headingLetterSpacing '-0.02em', headerDivider false, subtitleItalic false, proseSize 15–16, proseLineHeight 1.5–1.65, headingPrefix ''.",
  enduser:
    "Friendly, illustrative, soft. Body font is a rounded humanist sans (Nunito, Quicksand, Comfortaa); display font is a rounded display (Fredoka, Baloo 2, Lilita One). Background is a warm pastel linear-gradient. Ink is a soft dark (warm plum / brown / deep teal). PALETTE: primary is vibrant and warm (coral, peach, candy pink). secondary is a soft cool (sky blue, mint, lavender). tertiary is a warm orange/yellow. Measure 600–660. headingSize 38–42, headingWeight 600–700, headingMarginBottom 8–12, headerDivider false, subtitleItalic false, proseSize 17–19, proseLineHeight 1.6–1.7, headingPrefix ''. display must differ from body.",
  designer:
    "DARK editorial gallery — Pentagram, Apple Newsroom dark mode, NY Magazine print, Wallpaper*. Background is RICH BLACK or near-black (luminance < 0.05); NOT cream (researcher/student own warm bgs, journalist owns white). Ink is warm off-white/cream (luminance > 0.75). Display is a high-personality variable serif (Fraunces, Recoleta, DM Serif Display). Body is a confident sans (DM Sans, Hanken Grotesk, Sora). NEVER Inter — overused AI-slop. PALETTE: primary is a vivid statement color that POPS on rich black — vermillion, electric coral, hot magenta, electric cobalt. secondary is a warm metallic (gold, brass, ochre) that complements primary on dark. tertiary is a cool punch (sage, teal, pale blue). All three must be LIGHT ENOUGH to read on the dark surface (luminance > 0.45). Measure 700–740. headingSize 50–60, headingWeight 700, headingLetterSpacing '-0.035em', headingMarginBottom 22–28, subtitleItalic true, headerDivider false, proseSize 16.5–17.5, proseLineHeight 1.6–1.75, headingPrefix ''.",
  student:
    "Legal-pad / Moleskine notebook study notes. Background is YELLOW LEGAL PAD (around #fbf5d8 — saturated warm yellow, NOT pale cream which researcher owns). Body is a friendly humanist sans (Quicksand, Nunito, Comfortaa); display is handwriting-style (Caveat, Kalam, Patrick Hand) — these are non-negotiable for the notes feel. PALETTE: think PEN INK on yellow paper. primary is a pen-ink color — royal blue (#2c4ea7-ish), forest green, deep purple — saturated and dark (luminance < 0.30). secondary is a CORRECTION-MARK red (oxblood, deep vermillion). tertiary is HIGHLIGHTER GREEN or marker color (dark enough to read as text, luminance < 0.35). Measure 640–680. headingSize 44–50, headingWeight 700, headingMarginBottom 12–16, headerDivider false, subtitleItalic false, proseSize 16–18, proseLineHeight 1.7–1.8, headingPrefix ''. display must differ from body.",
  marketer:
    "Bold brand deck / product launch. body and display are the same distinctive variable grotesque (Bricolage Grotesque, Hanken Grotesk, Sora). NEVER Space Grotesk — it is overused AI-slop. Background is pure white. Ink is near-black. PALETTE: primary is a saturated brand color but dark enough for white text on it (luminance < 0.35) — electric vermillion, deep magenta, kelly green, electric purple. secondary is MATTE BLACK (used as the tldr-wedge left stripe). tertiary is a warm punch (golden yellow, amber). Measure 720–760. headingSize 42–48, headingWeight 800, headingLetterSpacing '-0.03em', headerDivider false, subtitleItalic false, proseSize 15–17, proseLineHeight 1.5–1.65, headingPrefix ''.",
};

function fontStack({ family, fallback }: { family: string; fallback: string }) {
  const padding: Record<string, string[]> = {
    serif: ["Georgia"],
    "sans-serif": ["Helvetica", "Arial"],
    monospace: ["ui-monospace", "SFMono-Regular", "Menlo"],
    "system-ui": ["-apple-system", "BlinkMacSystemFont"],
  };
  const pad = (padding[fallback] ?? []).join(", ");
  return pad
    ? `'${family}', ${pad}, ${fallback}`
    : `'${family}', ${fallback}`;
}

// Relative luminance (WCAG). Input is "#rrggbb".
function luminance(hex: string): number {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  const lin = (c: number) =>
    c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}

function contrast(a: string, b: string): number {
  const la = luminance(a);
  const lb = luminance(b);
  const [hi, lo] = la > lb ? [la, lb] : [lb, la];
  return (hi + 0.05) / (lo + 0.05);
}

// Convert "#rrggbb" → { h: 0–360, s: 0–1, l: 0–1 }. Standard formula.
function hexToHsl(hex: string): { h: number; s: number; l: number } {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  let h = 0;
  let s = 0;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) * 60; break;
      case g: h = ((b - r) / d + 2) * 60; break;
      case b: h = ((r - g) / d + 4) * 60; break;
    }
  }
  return { h, s, l };
}

// Smallest hue separation between two angles in [0, 360].
function hueSeparation(a: number, b: number): number {
  const d = Math.abs(a - b) % 360;
  return d > 180 ? 360 - d : d;
}

// Picks Theme variables that fit the persona and the topic. Wrapped in weave.op
// so the trace tree shows it sitting under `orchestrate` alongside
// content-agent and ui-composer. Throws on catastrophic contrast OR palette
// harmony failures so the orchestrator can fall back to the static THEMES[persona].
export const runThemeAgent = weave.op(
  async function runThemeAgent({ request, persona }: ThemeInput): Promise<Theme> {
    const hit = await getCachedTheme(persona);
    if (hit) return hit;

    const layout = PERSONA_LAYOUT[persona];
    const completion = await openai.beta.chat.completions.parse({
      model: MODEL,
      temperature: 0.7,
      messages: [
        {
          role: "system",
          content:
            "You design a single set of UI variables for an explanatory web page. " +
            "Given a topic (the user message) and a persona, you output colors, " +
            "fonts, typography, and layout flags that fit BOTH the persona's " +
            "archetype AND the topic. Persona archetype dominates; topic inflects " +
            "the palette but never breaks the persona feel.\n\n" +
            `Persona: ${persona}\n` +
            `Persona archetype: ${HEURISTICS[persona]}\n\n` +
            `LAYOUT POLICY for ${persona} (these flags MUST be exactly these values — they're the persona's signature):\n` +
            `- dropCap: ${layout.dropCap}\n` +
            `- headerRail: ${layout.headerRail}\n` +
            `- tldrStyle: ${layout.tldrStyle}\n\n` +
            "PALETTE RULES (very important):\n" +
            "- primary, secondary, tertiary are three DISTINCT hues that work together as a system.\n" +
            "- secondary should be either ANALOGOUS to primary (hue within 30°) or COMPLEMENTARY (~180° opposite). Pick the relationship that suits the persona archetype.\n" +
            "- tertiary creates a third hue position (split-complementary or triadic).\n" +
            "- All three must have HSL saturation ≥ 12% (no greys). Two of them must never be within 8° hue AND 15% lightness of each other.\n" +
            "- secondary is rendered as TEXT (keypoint headings, code language label). It MUST have ≥ 3.0 contrast against `surface` — so on light surfaces, secondary's luminance must be ≤ 0.35. A pale yellow like #fad55e on white = invisible; pick a darker variant like #c98a0e.\n" +
            "- tertiary is rendered as small TEXT (sup citations, diagram labels) on `bg`. It MUST have ≥ 3.0 contrast against `bgSolid` — so on light bg, tertiary's luminance must be ≤ 0.35.\n" +
            "- calloutTint is an rgba string built from primary at low alpha — e.g. if primary is #7a1c1c, calloutTint is `rgba(122, 28, 28, 0.07)`. Alpha in 0.05–0.12.\n" +
            "- tldrShadow is an rgba string built from primary at medium alpha — e.g. `rgba(122, 28, 28, 0.22)`. Alpha in 0.18–0.30. Use alpha 0 if tldrStyle is 'wedge' (wedge has no shadow).\n" +
            "- codeKeyword, codeString, codeFunction are the three syntax colors. On LIGHT surfaces they must be DARK enough to read (luminance < 0.35); on DARK surfaces (developer only) they're bright neons. Best practice: use primary/secondary/tertiary for these on light themes.\n\n" +
            "OTHER CONSTRAINTS:\n" +
            "- ink must be a dark color on light themes (relative luminance < 0.20) and a light color on dark themes (relative luminance > 0.75).\n" +
            "- MUTED IS THE #1 FAILURE MODE. muted is BODY-SECONDARY TEXT — subtitles, bylines, footnotes, captions. The common mistake is picking muted as a tint of bg (e.g. bg #f0e7d6 → muted #c0b5a0). DON'T DO THAT. On light themes muted MUST have relative luminance ≤ 0.30 (not a tint of bg, an actual dark color); on dark themes muted MUST have relative luminance ≥ 0.45. Pick muted by DARKENING ink's hue family, not by lightening bg. Concrete example: bg #f0e7d6, ink #211d16, muted #6b6149 (luminance 0.14) — the luminance gap between muted and bg is what makes muted text readable.\n" +
            "- surface must be solid (no gradient). bgSolid is a solid-color twin of bg.\n" +
            "- rule is the 1px border / divider color; close to bg/surface.\n" +
            "- Pick Google Fonts that actually exist (we load them dynamically). NEVER pick Inter or Space Grotesk — they are overused AI-slop. Provide the bare family name + a CSS fallback family.\n" +
            "- Typography: headingSize (px), headingWeight (400–900), headingLetterSpacing (CSS '0' or '-0.02em' style), headingMarginBottom (px), headingPrefix (short string drawn in primary before the h1; '$ ' for developer, '' elsewhere), subtitleSize, subtitleItalic, headerDivider, proseSize, proseLineHeight — match the persona archetype ranges above.",
        },
        { role: "user", content: request },
      ],
      response_format: zodResponseFormat(ThemeS, "theme"),
    });

    const parsed = completion.choices[0]?.message?.parsed;
    if (!parsed) throw new Error("theme-agent: model returned no parsed output");

    // Catastrophic-only contrast gate. Hand-tuned static themes don't pass
    // WCAG AA either; we only reject themes that are visually broken.
    const inkOnSurface = contrast(parsed.ink, parsed.surface);
    const inkOnBg = contrast(parsed.ink, parsed.bgSolid);
    const mutedOnBg = contrast(parsed.muted, parsed.bgSolid);
    const mutedOnSurface = contrast(parsed.muted, parsed.surface);
    if (
      inkOnSurface < 3.0 ||
      inkOnBg < 3.0 ||
      mutedOnBg < 3.0 ||
      mutedOnSurface < 3.0
    ) {
      throw new Error(
        `theme-agent: contrast too low (ink/surface=${inkOnSurface.toFixed(2)}, ink/bgSolid=${inkOnBg.toFixed(2)}, muted/bgSolid=${mutedOnBg.toFixed(2)}, muted/surface=${mutedOnSurface.toFixed(2)})`
      );
    }

    // Palette colors are used as TEXT in places (keypoints heading uses
    // secondary, sup citations use tertiary). They need to read against the
    // surfaces they sit on. Reject if either is too light on light themes or
    // too dark on dark themes. The harmony check below doesn't catch this —
    // a yellow secondary on white passes hue separation but is invisible.
    const secondaryOnSurface = contrast(parsed.secondary, parsed.surface);
    const tertiaryOnBg = contrast(parsed.tertiary, parsed.bgSolid);
    if (secondaryOnSurface < 3.0) {
      throw new Error(
        `theme-agent: secondary unreadable on surface (contrast=${secondaryOnSurface.toFixed(2)})`
      );
    }
    if (tertiaryOnBg < 3.0) {
      throw new Error(
        `theme-agent: tertiary unreadable on bg (contrast=${tertiaryOnBg.toFixed(2)})`
      );
    }

    // Palette harmony check. Reject palettes where two colors collapse into
    // each other (hue close AND lightness close) or where any "color" is
    // effectively greyscale (saturation under 12%).
    const ph = hexToHsl(parsed.primary);
    const sh = hexToHsl(parsed.secondary);
    const th = hexToHsl(parsed.tertiary);
    const sats = [ph.s, sh.s, th.s];
    if (sats.some((s) => s < 0.12)) {
      throw new Error(
        `theme-agent: a palette color is too desaturated (s=${sats.map((s) => s.toFixed(2)).join(",")})`
      );
    }
    const pairs: Array<[string, { h: number; l: number }, { h: number; l: number }]> = [
      ["primary/secondary", ph, sh],
      ["primary/tertiary", ph, th],
      ["secondary/tertiary", sh, th],
    ];
    for (const [name, a, b] of pairs) {
      if (hueSeparation(a.h, b.h) < 8 && Math.abs(a.l - b.l) < 0.15) {
        throw new Error(
          `theme-agent: ${name} collapses (hue Δ=${hueSeparation(a.h, b.h).toFixed(0)}°, lightness Δ=${Math.abs(a.l - b.l).toFixed(2)})`
        );
      }
    }

    // Layout-flag policy. The persona's signature is non-negotiable; if the
    // agent drifted, throw and let the static fallback take over.
    if (
      parsed.dropCap !== layout.dropCap ||
      parsed.headerRail !== layout.headerRail ||
      parsed.tldrStyle !== layout.tldrStyle
    ) {
      throw new Error(
        `theme-agent: layout flag drift for ${persona} (got dropCap=${parsed.dropCap}, headerRail=${parsed.headerRail}, tldrStyle=${parsed.tldrStyle})`
      );
    }

    const theme: Theme = {
      label: THEMES[persona].label,
      bg: parsed.bg,
      bgSolid: parsed.bgSolid,
      surface: parsed.surface,
      ink: parsed.ink,
      muted: parsed.muted,
      rule: parsed.rule,
      primary: parsed.primary,
      secondary: parsed.secondary,
      tertiary: parsed.tertiary,
      calloutTint: parsed.calloutTint,
      tldrShadow: parsed.tldrShadow,
      codeKeyword: parsed.codeKeyword,
      codeString: parsed.codeString,
      codeFunction: parsed.codeFunction,
      fontBody: fontStack(parsed.body),
      fontDisplay: fontStack(parsed.display),
      measure: parsed.measure,
      headingSize: parsed.headingSize,
      headingWeight: parsed.headingWeight,
      headingLetterSpacing: parsed.headingLetterSpacing,
      headingMarginBottom: parsed.headingMarginBottom,
      headingPrefix: parsed.headingPrefix,
      subtitleSize: parsed.subtitleSize,
      subtitleItalic: parsed.subtitleItalic,
      headerDivider: parsed.headerDivider,
      proseSize: parsed.proseSize,
      proseLineHeight: parsed.proseLineHeight,
      dropCap: parsed.dropCap,
      headerRail: parsed.headerRail,
      tldrStyle: parsed.tldrStyle,
    };
    await setCachedTheme(persona, theme);
    return theme;
  },
  { name: "theme-agent" }
);

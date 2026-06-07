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

// LLM-facing schema. Colors are solid hex except `bg`, which may be a CSS
// linear-gradient too (matches the existing enduser look). Fonts come as
// { family, fallback } pairs and are composed into a CSS family stack after
// parse. `measure` is the max content width in px.
const HEX = /^#[0-9a-fA-F]{6}$/;
const Hex = z.string().regex(HEX, "must be a 6-digit hex color");
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
  accent: Hex,
  rule: Hex,
  body: FontPick,
  display: FontPick,
  measure: z.number().int().min(560).max(820),
  // Typography decisions previously hardcoded in Block.tsx as persona ternaries.
  // The agent now picks these per persona archetype + topic; static THEMES
  // entries supply fallback values.
  headingSize: z.number().int().min(24).max(56),
  headingWeight: z.number().int().min(400).max(900),
  headingLetterSpacing: z.string().regex(/^-?(0|0?\.\d+em)$/, "must be '0' or an em offset like '-0.02em'"),
  headingMarginBottom: z.number().int().min(0).max(48),
  // "$ " for developer-style prompt prefix, "" for everything else. Kept short
  // so the agent can leave it empty by default.
  headingPrefix: z.string().max(4),
  subtitleSize: z.number().int().min(12).max(22),
  subtitleItalic: z.boolean(),
  // Researcher-style 1px rule under the heading.
  headerDivider: z.boolean(),
  proseSize: z.number().min(13).max(22),
  proseLineHeight: z.number().min(1.3).max(2.0),
});

// Per-persona UX heuristics. The agent gets these inline in the system prompt
// so each persona keeps its archetype while the topic inflects the palette.
const HEURISTICS: Record<Persona, string> = {
  researcher:
    "Editorial, archival, journal-like. Body font is a serif (e.g. Newsreader, Lora, Source Serif Pro, EB Garamond). Background is parchment/cream/ivory (light, slightly warm). Ink is near-black. Accent is restrained — deep burgundy, forest green, oxblood, cobalt — never neon. Measure 640–700. headingSize 36–40, headingWeight 600, headingLetterSpacing '0', headerDivider true, subtitleItalic true, proseSize 17–18, proseLineHeight 1.65–1.75, headingPrefix ''. Topic may color the palette (biology → muted greens; physics → cool slates; humanities → warm umbers); never break the editorial feel.",
  developer:
    "Terminal / IDE aesthetic. Body font is monospace (e.g. JetBrains Mono, Fira Code, IBM Plex Mono, Space Mono). Background is near-black or very dark navy. Ink is light (#d6deeb-ish). Accent is a bright but legible neon — green, cyan, magenta, amber. Measure 700–760. headingSize 28–32, headingWeight 600, headingLetterSpacing '-0.01em', headingPrefix '$ ', headerDivider false, subtitleItalic false, proseSize 15–16, proseLineHeight 1.6–1.7. Topic may shift the accent hue but the dark + mono base is non-negotiable.",
  business:
    "Crisp executive deck / FT-style. Body font is geometric or neo-grotesk sans (e.g. Archivo, Inter, IBM Plex Sans, Manrope). Background is very light (off-white / pale grey). Ink is near-black navy. Accent MUST be a dark color (blues, deep greens, charcoal) — luminance below 0.5 — because the tldr panel renders white text on the accent. Measure 720–780. headingSize 36–40, headingWeight 800, headingLetterSpacing '-0.02em', headerDivider false, subtitleItalic false, proseSize 15–16, proseLineHeight 1.5–1.65, headingPrefix ''.",
  enduser:
    "Friendly, illustrative, soft. Body font is a rounded humanist sans (e.g. Nunito, Quicksand, Comfortaa); display font is a rounded display (e.g. Fredoka, Baloo 2, Lilita One). Background is a warm pastel linear-gradient. Ink is a soft dark (warm plum / brown / deep teal). Accent is vibrant and warm (coral, peach, candy pink). Measure 600–660. fontDisplay should differ from fontBody. headingSize 38–42, headingWeight 600–700, headingMarginBottom 8–12, headerDivider false, subtitleItalic false, proseSize 17–19, proseLineHeight 1.6–1.7, headingPrefix ''.",
  designer:
    "Editorial gallery / portfolio. Display font is a high-contrast serif or grotesk display (Playfair Display, Cormorant Garamond, DM Serif Display, Bodoni Moda); body is a clean sans (Inter, DM Sans, Manrope). Background is cream/bone/off-white. Ink is near-black. Accent is a single vivid statement color tied to the topic (cobalt, magenta, ultramarine, rust). Measure 680–720. headingSize 42–48, headingWeight 700, headingLetterSpacing '-0.02em', headingMarginBottom 20–24, subtitleItalic true, headerDivider false, proseSize 16–17, proseLineHeight 1.55–1.7, headingPrefix ''. Display font must differ from body font.",
  journalist:
    "Newspaper / longform magazine. Body font is a workhorse serif (Lora, Source Serif Pro, Crimson Text, PT Serif). Background is newsprint off-white. Ink is near-black. Accent is a single ink color (deep navy, oxblood, forest) — never neon. Measure 660–700. headingSize 36–42, headingWeight 700, headerDivider true, subtitleItalic true (dek/standfirst feel), proseSize 17–18, proseLineHeight 1.65–1.8, headingPrefix ''. Topic may shift the accent but the editorial feel and serif body are non-negotiable.",
  student:
    "Notebook / study-notes aesthetic. Body font is a friendly humanist sans (Quicksand, Nunito, Comfortaa); display font is handwriting-style (Caveat, Kalam, Patrick Hand, Shadows Into Light). Background is pale notebook paper (very warm off-white). Ink is a soft dark brown/black. Accent is a highlighter color — amber, marigold, lime, sky — but dark enough that white text on it stays legible (luminance < 0.55). Measure 640–680. headingSize 38–44, headingWeight 700, headingMarginBottom 10–14, headerDivider false, subtitleItalic false, proseSize 16–17, proseLineHeight 1.7–1.8, headingPrefix ''. Display font must differ from body font.",
  marketer:
    "Bold brand deck / product launch. Body and display are the same geometric sans (Space Grotesk, DM Sans, Inter, Manrope) for tight identity. Background is pure white or near-white. Ink is near-black. Accent is a single saturated brand color (burnt orange, magenta, electric purple, kelly green) — luminance below 0.55 so white text on the tldr accent panel stays legible. Measure 720–760. headingSize 40–46, headingWeight 800, headingLetterSpacing '-0.025em', headerDivider false, subtitleItalic false, proseSize 15–17, proseLineHeight 1.5–1.65, headingPrefix ''.",
};

function fontStack({ family, fallback }: { family: string; fallback: string }) {
  // Pad common bare names with their classic system fallback before the
  // generic family, so the rendered text never falls all the way through to
  // browser default.
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

// Picks Theme variables that fit the persona and the topic. Wrapped in weave.op
// so the trace tree shows it sitting under `orchestrate` alongside
// content-agent and ui-composer. Throws on catastrophic contrast failures so
// the orchestrator can fall back to the static THEMES[persona].
export const runThemeAgent = weave.op(
  async function runThemeAgent({ request, persona }: ThemeInput): Promise<Theme> {
    const hit = await getCachedTheme(persona);
    if (hit) return hit;

    const completion = await openai.beta.chat.completions.parse({
      model: MODEL,
      temperature: 0.7,
      messages: [
        {
          role: "system",
          content:
            "You design a single set of UI variables for an explanatory web page. " +
            "Given a topic (the user message) and a persona, you output colors, " +
            "fonts, and a content measure (max width in px) that fit BOTH the " +
            "persona's archetype AND the topic. Persona archetype dominates; " +
            "topic inflects the palette but never breaks the persona feel.\n\n" +
            `Persona: ${persona}\n` +
            `Persona archetype: ${HEURISTICS[persona]}\n\n` +
            "Constraints:\n" +
            "- ink must be a dark color (relative luminance < 0.35); it has to read against bg and surface.\n" +
            "- muted is used for subtitles, bylines, and secondary text — it must still have ≥ 3.0 contrast against both bg and surface. Pick a darker secondary, not a tint of bg.\n" +
            "- surface must be solid (no gradient).\n" +
            "- bgSolid is a solid-color twin of bg; if bg is a gradient, choose a representative middle color.\n" +
            "- rule is the 1px border / divider color; keep it close to bg/surface.\n" +
            "- accent is the highlight color used for links, callouts, code chips, and headings flourishes.\n" +
            "- Pick Google Fonts that actually exist (we load them dynamically). Provide the bare family name (e.g. \"Lora\", \"Space Grotesk\") plus an appropriate CSS fallback family.\n" +
            "- Typography: pick headingSize (px), headingWeight (CSS 400–900), headingLetterSpacing (CSS string like '-0.02em' or '0'), headingMarginBottom (px), headingPrefix (a short string drawn before the h1 title in the accent color — '' for most personas, '$ ' for developer), subtitleSize (px), subtitleItalic (boolean), headerDivider (whether to draw a 1px rule under the heading), proseSize (px), proseLineHeight (unitless). Match the persona archetype ranges above.",
        },
        { role: "user", content: request },
      ],
      response_format: zodResponseFormat(ThemeS, "theme"),
    });

    const parsed = completion.choices[0]?.message?.parsed;
    if (!parsed) throw new Error("theme-agent: model returned no parsed output");

    // Catastrophic-only contrast gate. The hand-tuned static themes don't
    // pass WCAG AA either; we only reject themes that are visually broken.
    // muted is included because the renderer uses it for subtitles + bylines
    // — light-on-light there is the most common failure mode.
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

    const theme: Theme = {
      label: THEMES[persona].label,
      bg: parsed.bg,
      bgSolid: parsed.bgSolid,
      surface: parsed.surface,
      ink: parsed.ink,
      muted: parsed.muted,
      accent: parsed.accent,
      rule: parsed.rule,
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
    };
    await setCachedTheme(persona, theme);
    return theme;
  },
  { name: "theme-agent" }
);

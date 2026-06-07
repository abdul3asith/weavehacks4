# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## Commands

- `npm run dev` — start the dev server (Next.js, default port 3000)
- `npm run build` — production build
- `npm run start` — run the production build
- `npm run lint` — ESLint (flat config in `eslint.config.mjs`, extends `eslint-config-next/core-web-vitals` + `/typescript`)
- No test runner is configured.

Required env vars (loaded from `.env` / `.env.local`, never imported from client code):
- `OPENAI_API_KEY` — used by the agent pipeline (`gpt-4o-mini`) and the CopilotKit runtime (`gpt-4.1-mini`)
- `WANDB_API_KEY` — for Weave tracing
- `WEAVE_PROJECT` (optional) — Weave project name, defaults to `weavehacks4`

## Architecture

The app is a single-input "adaptive UI" demo: one prompt produces a persona-specific layout chosen from a fixed component menu. Four personas exist — `researcher | developer | business | enduser` — defined in `src/lib/ui-contract.ts`.

### Request flow

1. `src/app/page.tsx` (client) posts `{ request, persona }` to `POST /api/adaptive-ui`.
2. `src/app/api/adaptive-ui/route.ts` calls `initWeave()` then `orchestrate({ request, persona })`.
3. `src/lib/agents/orchestrator.ts` runs three agents, all wrapped in `weave.op`. `theme-agent` is kicked off at the top of `orchestrate` in parallel; `content-agent` then `ui-composer` run sequentially. Trace tree:

   ```
   orchestrate
     ├─ theme-agent           (parallel)
     └─ content-agent
          └─ ui-composer      (sequential)
   ```

   - `content-agent.ts` — writes prose in the persona's voice (plain prose, no markdown).
   - `ui-composer.ts` — converts prose into an ordered `Block[]` via OpenAI structured output (Zod schema + `zodResponseFormat`).
   - `theme-agent.ts` — picks a `Theme` (colors, fonts, measure) tuned to persona + topic. Wall time stays ≈ `max(theme, content+composer)`.
4. The route returns `{ persona, blocks, theme }`; `src/components/render/Renderer.tsx` applies the theme and renders the blocks.

`/preview?q=...&persona=...` (`src/app/preview/page.tsx`) is a server component with `dynamic = "force-dynamic"` that runs the same pipeline — handy for verifying generation without the chat UI.

### The block contract (do not break)

`src/lib/ui-contract.ts` defines the **fixed** discriminated-union `Block` types the renderer understands (heading, byline, prose, callout, references, terminal, code, steps, links, tldr, keypoints, table, footnote, analogy, visual, faq, diagram). The ui-composer agent may pick and order blocks but **must not invent new types or fields**.

Two deliberate divergences exist between the LLM-facing Zod schema in `ui-composer.ts` and the runtime `Block` types, because OpenAI strict mode is finicky:
- `prose.runs` is `string[]` to the LLM, widened to `TextRun[]` after parsing.
- `code` is `{ lang, source: string }` to the LLM, tokenized into `CodeToken[][]` after parsing.
- Contract-optional fields (`heading.subtitle`, `callout.kind`, terminal line parts, etc.) are `.nullable()` in the schema and re-omitted in `toBlocks()`.

`toBlocks()` in `ui-composer.ts` is the canonical normalizer between the two shapes. The `visual` block is filtered out there — its render in `components/render/Block.tsx` is a hardcoded graphic that can't adapt to arbitrary topics.

### Theme generation

`src/lib/agents/theme-agent.ts` is the third agent. Same shape as `ui-composer` (Zod schema → `openai.beta.chat.completions.parse` with `zodResponseFormat` → `weave.op` wrap). Returns colors, two fonts (any Google Font family name + a CSS fallback enum), and a content measure.

- **Fallback is unconditional.** The orchestrator wraps the call in `.catch(() => THEMES[persona])`, so a theme-agent failure (quota, schema rejection, contrast violation) can never break the pipeline — the static persona theme is used instead.
- **Catastrophic-only contrast gate.** After parse, the agent computes contrast for ink-on-surface and ink-on-bgSolid. If either is below ratio 3.0 it throws (caught by the orchestrator). We deliberately don't gate on WCAG AA — the existing hand-tuned themes (e.g. `enduser.accent = #ff5d73`) don't pass either, and strict gating would reject good themes.
- **`bgSolid` field on `Theme`.** A solid-hex twin of `bg`, used wherever a gradient breaks. Specifically `DiagramFlow.tsx` uses it for the edge-label halo, because SVG `stroke` doesn't accept `linear-gradient(...)`. All static themes set both.

**Scope-honest caveat:** the theme agent picks colors, fonts, and measure, but plenty of styling inside `Block.tsx` is still hardcoded — the syntax-highlight palette (`#ff7edb` / `#5ef2a0` / `#6cb6ff`), terminal traffic-light chrome, and the `#fff` text drawn on `theme.ink` (table header) and `theme.accent` (tldr). A fully adaptive theme would move those into the contract or compute them from luminance; this PR did not.

### Renderer

`src/components/render/Renderer.tsx` is the seam between agent output and the DOM.
- Accepts an **optional** `theme?: Theme` prop; falls back to `THEMES[persona]` when absent (keeps any static usage working).
- Loads any Google Font at runtime by rendering `<link rel="stylesheet" precedence="default" href="https://fonts.googleapis.com/css2?family=...&display=swap">` for each unique family in the theme. React 19 hoists these to `<head>` with dedup; `display=swap` means the page renders in the fallback immediately and swaps when the font arrives. This is what lets the theme agent pick any Google Font family, not just the five preloaded in `FONT_IMPORT`.
- `FONT_IMPORT` in `page.tsx` still loads Newsreader / JetBrains Mono / Archivo / Fredoka / Nunito for the static `THEMES`; the dynamic loader handles everything else.

### Personas

- `src/lib/detect-persona.ts` — keyword-based inference used when the caller doesn't supply a persona.
- `src/lib/specs.ts` — hardcoded golden-path `Block[]` for the LangChain example, one per persona. Useful as a reference for what well-formed output looks like; not used at runtime.
- `src/components/render/Theme.ts` — per-persona fonts/colors/measure for the static fallback. Adding a persona requires updates here, in `ui-contract.ts`, in `detect-persona.ts`, in the `PALETTE` map inside `ui-composer.ts`, and in the `HEURISTICS` map inside `theme-agent.ts` (so the agent knows the new persona's archetype).

### Tracing (Weave)

- `src/lib/weave.ts` exposes `initWeave()` (idempotent) and re-exports `weave`. The route handler calls `initWeave()` before each pipeline run.
- `src/lib/openai.ts` wraps the shared client with `weave.wrapOpenAI`, so every chat completion becomes a child span of the currently active `weave.op`.
- `next.config.ts` sets `serverExternalPackages: ["weave"]` — Weave's auto-instrumentation breaks under Next's server bundler otherwise. Leave this in place.
- `src/lib/openai.ts` is server-only. Never import it from a `"use client"` file.

### CopilotKit

- `src/app/layout.tsx` wraps the tree with `<CopilotKit runtimeUrl="/api/copilotkit" useSingleEndpoint={false}>`.
- `src/app/api/copilotkit/[[...all]]/route.ts` uses the **v2** runtime (`@copilotkit/runtime/v2`) with a default `BuiltInAgent`. It short-circuits `GET /api/copilotkit/threads` with an empty list because react-core probes it on mount and the runtime otherwise returns 422 (no `CopilotKitIntelligence` configured).
- The page registers a `renderAdaptiveUI` action via `useCopilotAction` so the chat assistant can trigger the same re-skin as the input bar.

### Other conventions

- TypeScript path alias `@/*` → `./src/*`.
- The `ChatBar` component in `page.tsx` is defined at module scope (outside `Page`) intentionally — putting it inside the component causes the input to lose focus across re-renders.
- `redis` and `@langchain/core` are listed as dependencies but are not currently wired into the pipeline.

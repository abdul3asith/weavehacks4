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
3. `src/lib/agents/orchestrator.ts` runs two agents in sequence, both wrapped in `weave.op` so the trace tree is `orchestrate → content-agent → ui-composer`:
   - `content-agent.ts` — writes prose in the persona's voice (plain prose, no markdown).
   - `ui-composer.ts` — converts prose into an ordered `Block[]` via OpenAI structured output (Zod schema + `zodResponseFormat`).
4. The route returns `{ persona, blocks }`; `src/components/render/Renderer.tsx` themes and renders the blocks.

`/preview?q=...&persona=...` (`src/app/preview/page.tsx`) is a server component with `dynamic = "force-dynamic"` that runs the same pipeline — handy for verifying generation without the chat UI.

### The block contract (do not break)

`src/lib/ui-contract.ts` defines the **fixed** discriminated-union `Block` types the renderer understands (heading, byline, prose, callout, references, terminal, code, steps, links, tldr, keypoints, table, footnote, analogy, visual, faq, diagram). The ui-composer agent may pick and order blocks but **must not invent new types or fields**.

Two deliberate divergences exist between the LLM-facing Zod schema in `ui-composer.ts` and the runtime `Block` types, because OpenAI strict mode is finicky:
- `prose.runs` is `string[]` to the LLM, widened to `TextRun[]` after parsing.
- `code` is `{ lang, source: string }` to the LLM, tokenized into `CodeToken[][]` after parsing.
- Contract-optional fields (`heading.subtitle`, `callout.kind`, terminal line parts, etc.) are `.nullable()` in the schema and re-omitted in `toBlocks()`.

`toBlocks()` in `ui-composer.ts` is the canonical normalizer between the two shapes. The `visual` block is filtered out there — its render in `components/render/Block.tsx` is a hardcoded graphic that can't adapt to arbitrary topics.

### Personas

- `src/lib/detect-persona.ts` — keyword-based inference used when the caller doesn't supply a persona.
- `src/lib/specs.ts` — hardcoded golden-path `Block[]` for the LangChain example, one per persona. Useful as a reference for what well-formed output looks like; not used at runtime.
- `src/components/render/Theme.ts` — per-persona fonts/colors/measure. Adding a persona requires updates here, in `ui-contract.ts`, in `detect-persona.ts`, and in the `PALETTE` map inside `ui-composer.ts`.

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

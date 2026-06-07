# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

# WeaveHacks Adaptive UI

One request → a radically different UI per detected **persona** (8: researcher, developer, business, enduser, designer, journalist, student, marketer — `src/lib/ui-contract.ts` `PERSONAS`). The interface re-skins (layout, components, colors, fonts) to match the audience. Local-only, no auth.

Sponsors: **Weave** (observability), **CopilotKit** (frontend/agent bridge), **LangGraph** (orchestration), **Redis** (theme cache). Default to the latest Claude models when adding AI.

## Phase 1 — the generation pipeline (the spine)

`request + persona → { content-agent + theme-agent } → ui-composer → Block[] + Theme → <Renderer>`

- **`src/lib/ui-contract.ts`** — the FROZEN component menu: `Block` discriminated union (heading, prose, callout, references, terminal, code, steps, links, tldr, keypoints, table, footnote, analogy, faq, diagram, …) + `PERSONAS`/`Persona`. The contract the composer must emit.
- **`src/lib/agents/content-agent.ts`** — `runContentAgent({request, persona, depth?, history?})` → persona-voiced prose. `gpt-4o-mini`.
- **`src/lib/agents/ui-composer.ts`** — `runUIComposer({persona, content, directives?})` → `Block[]` via **OpenAI structured outputs** (`zodResponseFormat`). Strict schema + `toBlocks()` → the model can only emit valid, designed components.
- **`src/lib/agents/theme-agent.ts`** (add-on) — `runThemeAgent({request, persona})` → a topic-aware **`Theme`** (colors, fonts, typography, `measure`). **Redis-cached** via `src/lib/cache.ts` (`getCachedTheme`/`setCachedTheme`); no-ops when `REDIS_URL` unset. Falls back to static `THEMES[persona]` on error.
- **`src/lib/agents/orchestrator.ts`** — `orchestrate({request, persona, depth?, directives?})` runs **theme-agent in parallel** with content→composer, returns `{ blocks, theme }`. Used by the fallback route `src/app/api/adaptive-ui/route.ts`.
- **`src/components/render/`** — `Renderer.tsx` (walks `Block[]`, applies a dynamic `theme` prop, injects the theme's Google fonts via `<link>`; falls back to `THEMES[persona]`), `Block.tsx` (`{block, theme}`), `Theme.ts` (`Theme` type + 8 static `THEMES`), `DiagramFlow.tsx` (flowcharts from **structured nodes/edges** — SVG, no text DSL → no "syntax error").
- Every agent fn is `weave.op()`-wrapped → nested trace `orchestrate → theme-agent + content-agent + ui-composer`. `src/lib/weave.ts` + `src/lib/openai.ts` (one shared `weave.wrapOpenAI`).

## Phase 2 — the live agent path: CopilotKit → A2UI → LangGraph → agent

What the running page actually uses (the `/api/adaptive-ui` route is the fallback).

```
Browser ──CopilotKit──▶ A2UI / AG-UI ──LangGraph──▶ agents ──▶ {blocks, theme} ──▶ themed page
useAgent("adaptive")    AdaptiveAgent      StateGraph      content+composer+theme    Renderer
runAgent(forwardedProps) STATE_SNAPSHOT    write_content / pick_theme (parallel)     whole page re-skins
```

1. **CopilotKit (v2)** — `src/components/CopilotProvider.tsx` (`CopilotKitProvider`, no chat popup) + v2 runtime in `src/app/api/copilotkit/[[...all]]/route.ts` (`CopilotRuntime` + `createCopilotEndpoint`; agents `default` + `adaptive`). The page uses **`useAgent("adaptive")`** + **`runAgent({ forwardedProps })`** with steering `topic`/`personaOverride`/`depth`/`directives`/`history`. Direct call — no LLM tool-calling — so it's reliable.
2. **A2UI / AG-UI** — `src/lib/agents/adaptive-agent.ts`: `AdaptiveAgent extends AbstractAgent` (`@ag-ui/client`). `run()` emits `RUN_STARTED → STATE_SNAPSHOT(writing) → (composing) → STATE_SNAPSHOT(done, blocks+theme) → TEXT_MESSAGE_* → RUN_FINISHED`. "done" is emitted only after the graph fully drains, so the final snapshot has both blocks and theme. The `STATE_SNAPSHOT` stream IS the shared state the UI renders.
3. **LangGraph (in-process)** — `src/lib/agents/graph.ts`: `StateGraph` with parallel branches `write_content → compose_ui` and `pick_theme`; channels `{request, persona, status, content, blocks, theme, depth, directives, history}`; `graph.stream({streamMode:"updates"})`. Nodes call the Phase-1 `weave.op` agents (trace preserved). **No LangGraph server** (we don't use `@ag-ui/langgraph`'s `LangGraphAgent` — it needs a `deploymentUrl`).

### Frontend behavior (`src/app/page.tsx`)
- ChatGPT/Claude-style **continuous multi-turn chat**: turns stack, `history` passed for context.
- **Persona is sticky**; naming a *different* audience **clears the page** and starts a fresh conversation in the new persona.
- The whole page background = the (dynamic) theme color; only the floating bottom input keeps a fixed dark color.

## Env vars (server-side only; `.env` / `.env.local`)
- `OPENAI_API_KEY` — pipeline (`gpt-4o-mini`) + CopilotKit runtime (`gpt-4.1-mini`)
- `WANDB_API_KEY` — Weave tracing · `WEAVE_PROJECT` (optional, defaults `weavehacks4`)
- `REDIS_URL` (optional) — theme cache, e.g. `rediss://…` from Redis Cloud; cache no-ops when unset
- `THEME_CACHE_TTL_SECONDS` (optional) — default 86400

## Commands & gotchas
- `npm run dev` / `build` / `start` / `lint`. No test runner. Run `npx tsc --noEmit` after changes.
- **`@ag-ui/client` + `@ag-ui/core` pinned to `0.0.48`** to match CopilotKit's bundled copy. Any `npm install/uninstall` may re-hoist `0.0.53` and break `tsc` ("two different types named AbstractAgent"). Fix: `npm install -E @ag-ui/client@0.0.48 @ag-ui/core@0.0.48`.
- `next.config.ts` needs `serverExternalPackages: ["weave"]`.
- Do NOT install `@openai/agents` (needs zod v4; CopilotKit pins zod v3).
- The dev server must run from a terminal **with network access** (agents hit OpenAI/W&B/Redis).

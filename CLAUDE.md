@AGENTS.md

# WeaveHacks Adaptive UI

One request → four radically different UIs based on the detected **persona** (researcher / developer / business / enduser). The interface re-skins (layout, components, theme, fonts) to match the audience. Local-only, no auth, hardcoded session.

Sponsors targeted: **Weave** (observability), **CopilotKit** (frontend/agent bridge), **LangGraph** (orchestration). Default to the latest Claude models when adding any AI.

## Phase 1 — the generation pipeline (the spine)

`request + persona → content-agent → ui-composer → Block[] → <Renderer>`

- **`src/lib/ui-contract.ts`** — the FROZEN component menu: `Block` discriminated union (heading, prose, callout, references, terminal, code, steps, links, tldr, keypoints, table, footnote, analogy, faq, diagram, …) + `Persona`. This IS the contract the composer must emit.
- **`src/lib/agents/content-agent.ts`** — `runContentAgent({request, persona, depth?, history?})` → persona-voiced prose. OpenAI `gpt-4o-mini`.
- **`src/lib/agents/ui-composer.ts`** — `runUIComposer({persona, content, directives?})` → `Block[]` via **OpenAI structured outputs** (`beta.chat.completions.parse` + `zodResponseFormat`). The strict schema + `toBlocks()` adapter mean the model **can only emit valid, designed components** — never invents UI.
- **`src/lib/agents/orchestrator.ts`** — `orchestrate({request, persona, depth?, directives?})` chains the two. Used by the fallback route `src/app/api/adaptive-ui/route.ts`.
- **`src/components/render/`** — `Renderer.tsx` (walks `Block[]`, applies `THEMES[persona]`), `Block.tsx` (renders each block), `Theme.ts` (4 persona themes), `DiagramFlow.tsx` (flowcharts from **structured nodes/edges**, SVG — NOT a text DSL, so no "syntax error" possible).
- Every agent fn is wrapped in `weave.op()` → nested Weave trace `orchestrate → content-agent + ui-composer`. `src/lib/weave.ts` = `initWeave()` + `weave`. `src/lib/openai.ts` = one shared `weave.wrapOpenAI(new OpenAI())` client.

## Phase 2 — the live agent path: CopilotKit → A2UI → LangGraph → agent

This is what the running page actually uses (the `/api/adaptive-ui` route is now just a fallback).

```
Browser ──CopilotKit──▶ A2UI / AG-UI ──LangGraph──▶ agents ──▶ Block[] ──▶ themed page
useAgent("adaptive")    AdaptiveAgent       StateGraph     content+ui-composer    Renderer
runAgent(forwardedProps) emits STATE_SNAPSHOT  write_content   (Weave-traced)     whole page re-skins
```

1. **CopilotKit (v2)** — `src/components/CopilotProvider.tsx` (`CopilotKitProvider`, no chat popup) + the v2 runtime in `src/app/api/copilotkit/[[...all]]/route.ts` (`CopilotRuntime` + `createCopilotEndpoint`, agents `default` BuiltInAgent + `adaptive`). The page ([src/app/page.tsx](src/app/page.tsx)) uses **`useAgent("adaptive")`** to read live shared state and **`runAgent({ forwardedProps })`** to drive it (steering: `topic`, `personaOverride`, `depth`, `directives`, `history`). Reliable because it's a direct call — no LLM deciding to call a tool.
2. **A2UI / AG-UI** — `src/lib/agents/adaptive-agent.ts`: `AdaptiveAgent extends AbstractAgent` (`@ag-ui/client`). `run()` returns an `Observable<BaseEvent>` emitting `RUN_STARTED → STATE_SNAPSHOT(writing) → STATE_SNAPSHOT(composing) → STATE_SNAPSHOT(done, blocks) → TEXT_MESSAGE_* → RUN_FINISHED`. The `STATE_SNAPSHOT` stream IS the shared state the UI renders (drives the "✍️ writing… → 🎨 composing…" status + the persona re-skin).
3. **LangGraph (in-process)** — `src/lib/agents/graph.ts`: a real `@langchain/langgraph` `StateGraph` (`write_content → compose_ui`), state channels `{request, persona, status, content, blocks, depth, directives, history}`, run via `graph.stream({streamMode:"updates"})`. Nodes call the Phase-1 `weave.op` agents (so the Weave trace is preserved). **No LangGraph server** — runs in the Node route. (We deliberately do NOT use `@ag-ui/langgraph`'s `LangGraphAgent`; it requires a `deploymentUrl`.)

### Frontend behavior (page.tsx)
- ChatGPT/Claude-style: centered hero input → on submit the question moves to the top, the persona UI renders below; **continuous multi-turn chat** (turns stack, history passed for context).
- **Persona is sticky**; naming a *different* audience **clears the page** and starts a fresh conversation in the new persona.
- The whole page background = the persona's theme color; only the floating bottom input keeps a fixed dark color.

## Gotchas / conventions
- **`@ag-ui/client` + `@ag-ui/core` are pinned to `0.0.48`** to match the CopilotKit runtime's bundled copy. Any `npm install/uninstall` may re-hoist `0.0.53` and break `tsc` with "two different types named AbstractAgent". Fix: `npm install -E @ag-ui/client@0.0.48 @ag-ui/core@0.0.48`.
- `next.config.ts` needs `serverExternalPackages: ["weave"]` (Weave breaks under the bundler otherwise).
- Do NOT install `@openai/agents` (needs zod v4; CopilotKit pins zod v3 — currently 3.25.x).
- The dev server must run from a terminal **with network access** (agent calls hit OpenAI/W&B). A sandboxed server gets `getaddrinfo ENOTFOUND api.openai.com`.
- Run `npx tsc --noEmit` after changes. Keys are server-side only.

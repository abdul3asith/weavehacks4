# Familiar UI

**One question. An interface adapted to the person asking.**

Familiar UI detects a user's audience and generates a complete explanation, layout, and visual theme for that persona. The same topic can become a developer console, research paper, executive brief, student notebook, or marketing page.

Supported personas:

- Researcher
- Developer
- Business
- End user
- Designer
- Journalist
- Student
- Marketer

## How It Works

```text
Question + Persona
        |
        v
Redis semantic-cache lookup
        |
        +-- Cache hit --> Restore Block[] + Theme
        |
        +-- Cache miss --> LangGraph
                              |
                              +-- Content Agent --> UI Composer
                              |
                              +-- Theme Agent
                                      |
                                      v
                               Block[] + Theme
                                      |
                                      v
                                   Renderer
```

## Technology

### CopilotKit

CopilotKit is the bridge between the React frontend and the adaptive agent. The page uses `useAgent("adaptive")` to send the prompt, persona, and conversation history and receive live shared state.

### AG-UI

AG-UI is the event protocol between the agent and browser. It streams events such as:

```text
RUN_STARTED
STATE_SNAPSHOT: writing
STATE_SNAPSHOT: composing
STATE_SNAPSHOT: done
RUN_FINISHED
```

This lets the interface show progress and update before the complete pipeline finishes.

### LangGraph

LangGraph orchestrates the agent workflow. It runs content generation and theme generation in parallel, then sends the content into the UI composer.

### Redis Semantic Cache

Redis stores the generated `Block[]`, theme, and request embedding. Similar prompts for the same persona can restore the complete interface without rerunning the generation agents.

- First request: full generation, then stored in Redis
- Semantic hit: one embedding lookup and immediate restoration
- Persona-separated keys prevent returning a researcher UI to a developer
- Cache miss safely falls back to normal generation

### OpenAI

OpenAI models power:

- Persona-specific content generation
- Topic-aware theme generation
- Structured UI composition
- Request embeddings for semantic matching

The UI composer uses structured outputs so it can only return supported, validated components.

### Renderer

The renderer converts structured blocks into React components. Models never return arbitrary HTML.

Supported blocks include headings, prose, code, terminals, tables, steps, FAQs, references, callouts, key points, and diagrams.

### Weave

Weave traces model calls and agent operations, making latency, errors, and the nested multi-agent workflow observable.

### Next.js

Next.js provides the React application, server routes, CopilotKit runtime endpoint, and rendering environment.

## Local Setup

```bash
npm install
```

Create `.env.local`:

```env
OPENAI_API_KEY=
WANDB_API_KEY=
WEAVE_PROJECT=weavehacks4
REDIS_URL=redis://default:password@host:port
```

Run the application:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Useful Commands

```bash
npm run dev
npm run build
npm run lint
npx tsc --noEmit
```

## Redis Demo

First request:

> Explain how Redis prevents duplicate background jobs using idempotency keys for a developer.

Paraphrase:

> For a developer, describe using Redis idempotency keys to stop the same background task from running twice.

The first request generates and stores the interface. The paraphrase should return the cached developer interface with a similarity score and lower latency.

## Core Idea

> Familiar UI does not only rewrite an answer. It rebuilds the content structure and visual interface around the audience, then uses semantic caching to make repeated intent fast and cost-efficient.

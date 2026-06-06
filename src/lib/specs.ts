import type { Block, Persona } from "@/lib/ui-contract";

export const SPECS: Record<Persona, Block[]> = {
  researcher: [
    { type: "heading", title: "LangChain", subtitle: "A Framework for Composing Language-Model Applications" },
    { type: "byline", text: "Framework analysis \u00B7 prepared for technical review" },
    {
      type: "prose",
      runs: [
        "LangChain is an open-source framework for developing applications powered by large language models (LLMs). It abstracts the orchestration of model calls, prompt templating, memory, and retrieval into composable units, allowing a developer to express a multi-step reasoning pipeline declaratively rather than imperatively",
        { sup: "1" },
        ". Its central abstraction, the \u201Cchain,\u201D sequences calls to models, tools, and data sources; more recent work extends this to agentic control flow in which the model itself selects which tool to invoke",
        { sup: "2" },
        ".",
      ],
    },
    {
      type: "prose",
      runs: [
        "A frequently cited application is retrieval-augmented generation (RAG), wherein documents are embedded, stored in a vector index, and retrieved at inference time to ground the model\u2019s output in an external corpus",
        { sup: "3" },
        ". This mitigates hallucination on knowledge-intensive tasks, though it introduces retrieval-quality dependencies that are themselves an active area of study.",
      ],
    },
    {
      type: "callout", kind: "caveat", title: "Methodological caveats",
      body: "Abstraction layers obscure token-level cost and latency; evaluation of chain outputs remains non-standardized; framework churn complicates reproducibility across versions.",
    },
    {
      type: "references",
      items: [
        "Chase, H. et al. LangChain Documentation. langchain.com (accessed 2026).",
        "Yao, S. et al. \u201CReAct: Synergizing Reasoning and Acting in Language Models.\u201D 2022.",
        "Lewis, P. et al. \u201CRetrieval-Augmented Generation for Knowledge-Intensive NLP Tasks.\u201D NeurIPS, 2020.",
      ],
    },
  ],

  developer: [
    { type: "heading", title: "langchain", subtitle: "// compose LLM calls into chains & agents" },
    { type: "prose", runs: ["A framework for wiring models, prompts, tools and retrieval into pipelines. You build a chain, then ", { code: "invoke" }, " it. Below: install, a minimal chain, and where to go next."] },
    {
      type: "terminal",
      lines: [
        { p: "$", c: "pip install langchain langchain-openai" },
        { o: "Successfully installed langchain-0.3.x langchain-openai-0.2.x" },
        { p: "$", c: "export OPENAI_API_KEY=sk-..." },
      ],
    },
    {
      type: "code", lang: "python",
      tokens: [
        [["k", "from"], ["t", " langchain_core.prompts "], ["k", "import"], ["t", " ChatPromptTemplate"]],
        [["k", "from"], ["t", " langchain_openai "], ["k", "import"], ["t", " ChatOpenAI"]],
        [],
        [["t", "llm = "], ["fn", "ChatOpenAI"], ["t", "(model="], ["s", "\"gpt-4o-mini\""], ["t", ")"]],
        [["t", "prompt = ChatPromptTemplate."], ["fn", "from_template"], ["t", "("], ["s", "\"Explain {topic}\""], ["t", ")"]],
        [["t", "chain = prompt | llm"]],
        [],
        [["t", "chain."], ["fn", "invoke"], ["t", "({"], ["s", "\"topic\""], ["t", ": "], ["s", "\"LangChain\""], ["t", "})"]],
      ],
    },
    {
      type: "steps",
      items: [
        "Define a prompt template with variables.",
        "Pick a model adapter (langchain-openai, -anthropic, etc.).",
        "Pipe them: prompt | llm | parser.",
        "Add memory or a retriever when you need state or grounding.",
      ],
    },
    { type: "links", items: [
      { label: "python.langchain.com/docs", href: "#" },
      { label: "LangSmith (tracing)", href: "#" },
      { label: "github.com/langchain-ai", href: "#" },
    ] },
  ],

  business: [
    { type: "heading", title: "LangChain", subtitle: "Executive brief" },
    { type: "tldr", body: "LangChain is the most widely-adopted open-source toolkit for building LLM-powered features. It shortens time-to-prototype for AI products and standardizes how teams connect models to company data." },
    {
      type: "keypoints",
      items: [
        { h: "What it is", t: "A developer framework that assembles AI \u201Cbuilding blocks\u201D (models, data, tools) into working applications." },
        { h: "Why it matters", t: "Cuts custom plumbing, so engineering ships AI features in days, not quarters." },
        { h: "Where it fits", t: "Internal copilots, customer support, document Q&A, research assistants." },
      ],
    },
    {
      type: "table",
      columns: ["Use case", "Business value"],
      rows: [
        ["Chat over internal docs", "Faster answers, less time hunting in wikis"],
        ["Customer support assist", "Lower handle time, consistent responses"],
        ["Research / analysis agent", "Compress hours of reading into minutes"],
      ],
    },
    { type: "footnote", text: "Open-source core; commercial observability (LangSmith) available. No per-seat lock-in at the framework layer." },
  ],

  enduser: [
    { type: "heading", title: "What is LangChain?", subtitle: "Let\u2019s break it down \u2014 no jargon, promise" },
    { type: "prose", runs: ["LangChain is a toolkit that helps people build smart assistants on top of AI models like ChatGPT. Instead of the AI just answering one question, LangChain lets it follow steps \u2014 look something up, think, then reply."] },
    { type: "analogy", emoji: "\uD83E\uDDF1", title: "Think of it like LEGO for AI", body: "Each piece does one small job \u2014 search, remember, answer. Snap them together and you get something much smarter than a single piece on its own." },
    { type: "visual" },
    {
      type: "faq",
      items: [
        { q: "Do I need to code?", a: "To build with it, yes \u2014 it\u2019s a developer tool. But the apps people make with it are for everyone." },
        { q: "Is it free?", a: "The core is free and open-source. Some add-ons are paid." },
        { q: "Why is it popular?", a: "It saves builders a ton of time connecting AI to real data and tools." },
      ],
    },
  ],
};
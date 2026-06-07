"use client";

import type { Block, UISpec } from "@/lib/agents/schema";

export function Renderer({ spec }: { spec: UISpec | null }) {
  if (!spec) return null;
  return (
    <section className="space-y-4">
      <p className="text-xs uppercase tracking-wide text-neutral-500">
        persona: {spec.persona}
      </p>
      {spec.blocks.map((block, i) => (
        <BlockView key={i} block={block} />
      ))}
    </section>
  );
}

function BlockView({ block }: { block: Block }) {
  switch (block.kind) {
    case "tldr":
      return (
        <div className="border-l-4 border-neutral-300 pl-3">
          <p className="text-sm font-medium text-neutral-700">TL;DR</p>
          <p>{block.text}</p>
        </div>
      );
    case "heading": {
      const cls =
        block.level === 1
          ? "text-2xl font-semibold"
          : block.level === 2
            ? "text-xl font-semibold"
            : "text-lg font-semibold";
      return <h2 className={cls}>{block.text}</h2>;
    }
    case "prose":
      return <p className="leading-relaxed">{block.text}</p>;
    case "keypoints":
      return (
        <ul className="list-disc pl-6 space-y-1">
          {block.items.map((item, i) => (
            <li key={i}>{item}</li>
          ))}
        </ul>
      );
    case "callout": {
      const tone =
        block.tone === "warn"
          ? "bg-amber-50 border-amber-300 text-amber-900"
          : block.tone === "tip"
            ? "bg-emerald-50 border-emerald-300 text-emerald-900"
            : "bg-sky-50 border-sky-300 text-sky-900";
      return (
        <div className={`rounded border px-3 py-2 ${tone}`}>{block.text}</div>
      );
    }
    case "code":
      return (
        <pre className="rounded bg-neutral-900 text-neutral-100 text-sm p-3 overflow-x-auto">
          <code>{block.code}</code>
        </pre>
      );
    case "faq":
      return (
        <dl className="space-y-2">
          {block.items.map((item, i) => (
            <div key={i}>
              <dt className="font-medium">{item.q}</dt>
              <dd className="text-neutral-700">{item.a}</dd>
            </div>
          ))}
        </dl>
      );
  }
}

"use client";
import { Renderer } from "@/components/render/Renderer";
import type { UISpec } from "@/lib/agents/schema";
import { useState } from "react";

export default function Home() {
  const [request, setRequest] = useState("");
  const [spec, setSpec] = useState<UISpec | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit() {
    if (!request.trim() || loading) return;
    setLoading(true);
    setError(null);
    setSpec(null);
    try {
      const res = await fetch("/api/answer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: request.trim() }),
      });
      const body = await res.json();
      if (!res.ok) {
        setError(typeof body?.error === "string" ? body.error : `Request failed (${res.status})`);
      } else {
        setSpec(body as UISpec);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="max-w-2xl mx-auto p-8 space-y-4">
      <h1 className="text-2xl font-semibold">Adaptive UI — WeaveHacks</h1>
      <div className="flex gap-2">
        <input
          value={request}
          onChange={(e) => setRequest(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") onSubmit();
          }}
          placeholder="What is Cursor?"
          className="border p-2 flex-1"
          disabled={loading}
        />
        <button
          onClick={onSubmit}
          disabled={loading || !request.trim()}
          className="border px-4 disabled:opacity-50"
        >
          {loading ? "…" : "Enter"}
        </button>
      </div>
      {error && (
        <p className="text-sm text-red-600 break-words" role="alert">
          {error}
        </p>
      )}
      <Renderer spec={spec} />
    </main>
  );
}

"use client";
import { Renderer } from "@/components/render/Renderer";
import type { Level } from "@/lib/agents/orchestrator";
import { useState } from "react";

export default function Home() {
  const [level, setLevel] = useState<Level>("7th-grade");
  const [request, setRequest] = useState("");

  return (
    <main className="max-w-2xl mx-auto p-8 space-y-4">
      <h1 className="text-2xl font-semibold">Adaptive UI — WeaveHacks</h1>
      <div className="flex gap-2">
        <select value={level} onChange={(e) => setLevel(e.target.value as Level)} className="border p-2">
          <option value="7th-grade">7th grade</option>
          <option value="masters">Master's</option>
        </select>
        <input value={request} onChange={(e) => setRequest(e.target.value)}
          placeholder="e.g. photosynthesis" className="border p-2 flex-1" />
        <button disabled className="border px-4">Generate (Step 2)</button>
      </div>
      <Renderer spec={null} />
    </main>
  );
}
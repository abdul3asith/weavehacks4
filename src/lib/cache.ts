import { Redis } from "@upstash/redis";
import type { Persona } from "./ui-contract";
import type { Theme } from "@/components/render/Theme";

// Bump SCHEMA_VERSION whenever the Theme type in src/components/render/Theme.ts
// gains or loses a field. Stale entries from a previous shape would deserialize
// wrong and reach the renderer.
const SCHEMA_VERSION = "v1";

function key(persona: Persona): string {
  return `theme:${SCHEMA_VERSION}:${persona}`;
}

function ttlSeconds(): number {
  const raw = process.env.THEME_CACHE_TTL_SECONDS;
  const parsed = raw ? Number.parseInt(raw, 10) : NaN;
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 86_400;
}

// Lazy singleton. Returns null when Upstash isn't configured so the rest of
// the pipeline keeps working unchanged — the cache is a pure optimization.
let cached: Redis | null | undefined;
function client(): Redis | null {
  if (cached !== undefined) return cached;
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) {
    cached = null;
    return null;
  }
  cached = new Redis({ url, token });
  return cached;
}

export async function getCachedTheme(persona: Persona): Promise<Theme | null> {
  const c = client();
  if (!c) return null;
  try {
    const value = await c.get<Theme>(key(persona));
    return value ?? null;
  } catch (e) {
    console.warn("[theme-cache] read failed:", e);
    return null;
  }
}

export async function setCachedTheme(persona: Persona, theme: Theme): Promise<void> {
  const c = client();
  if (!c) return;
  try {
    await c.set(key(persona), theme, { ex: ttlSeconds() });
  } catch (e) {
    console.warn("[theme-cache] write failed:", e);
  }
}

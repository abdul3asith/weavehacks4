import { createClient } from "redis";
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

// Persist the client across Next.js dev hot reloads so we don't leak TCP
// connections. Typed loosely because node-redis v6's `RedisClientType`
// generic defaults don't compare cleanly across the declare-global boundary;
// the only consumers are the two helpers below, which use a tiny call
// surface (.get / .set / .on / .connect) that doesn't need stronger types.
/* eslint-disable @typescript-eslint/no-explicit-any */
declare global {
  var _themeCacheRedis: any;
}

async function client(): Promise<any> {
  if (globalThis._themeCacheRedis !== undefined) return globalThis._themeCacheRedis;
  const url = process.env.REDIS_URL;
  if (!url) {
    globalThis._themeCacheRedis = null;
    return null;
  }
  try {
    const c = createClient({ url });
    c.on("error", (e: unknown) => console.warn("[theme-cache] redis error:", e));
    await c.connect();
    globalThis._themeCacheRedis = c;
    return c;
  } catch (e) {
    console.warn("[theme-cache] connect failed:", e);
    globalThis._themeCacheRedis = null;
    return null;
  }
}
/* eslint-enable @typescript-eslint/no-explicit-any */

export async function getCachedTheme(persona: Persona): Promise<Theme | null> {
  const c = await client();
  if (!c) return null;
  try {
    const raw: string | null = await c.get(key(persona));
    if (!raw) return null;
    return JSON.parse(raw) as Theme;
  } catch (e) {
    console.warn("[theme-cache] read failed:", e);
    return null;
  }
}

export async function setCachedTheme(persona: Persona, theme: Theme): Promise<void> {
  const c = await client();
  if (!c) return;
  try {
    await c.set(key(persona), JSON.stringify(theme), { EX: ttlSeconds() });
  } catch (e) {
    console.warn("[theme-cache] write failed:", e);
  }
}

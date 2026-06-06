import * as weave from "weave";

let initialized = false;
export async function initWeave() {
  if (initialized) return;
  await weave.init(process.env.WEAVE_PROJECT ?? "weavehacks4");
  initialized = true;
}
export { weave };

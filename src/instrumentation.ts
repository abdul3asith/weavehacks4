export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;

  const weave = await import("weave");

  if (process.env.WANDB_API_KEY) {
    await weave.login(process.env.WANDB_API_KEY);
  }
  await weave.init(process.env.WEAVE_PROJECT ?? "weavehacks4");

  await weave.instrumentOpenAIAgents();
}

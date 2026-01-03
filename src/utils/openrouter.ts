import { OpenRouter } from "@openrouter/sdk";

const openRouter = new OpenRouter({
  apiKey: process.env.OPENROUTER_API_KEY,
});

export interface OpenRouterModelInfo {
  id: string;
  name: string;
  contextLength: number | null;
  inputModalities: string[];
  outputModalities: string[];
  pricing: Record<string, string>;
}

const normalizePricing = (pricing: Record<string, string | undefined>): Record<string, string> => {
  return Object.fromEntries(
    Object.entries(pricing).filter(([, value]) => value !== undefined)
  ) as Record<string, string>;
};

export async function getOpenRouterModels(): Promise<OpenRouterModelInfo[]> {
  if (!process.env.OPENROUTER_API_KEY) {
    throw new Error("Missing OPENROUTER_API_KEY");
  }
  const response = await openRouter.models.list();
  return response.data
    .map((model) => ({
      id: model.id,
      name: model.name,
      contextLength: model.contextLength ?? null,
      inputModalities: model.architecture?.inputModalities?.map(String) ?? [],
      outputModalities: model.architecture?.outputModalities?.map(String) ?? [],
      pricing: normalizePricing({
        prompt: model.pricing?.prompt,
        completion: model.pricing?.completion,
        request: model.pricing?.request,
        image: model.pricing?.image,
        audio: model.pricing?.audio,
      }),
    }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

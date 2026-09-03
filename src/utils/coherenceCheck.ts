import { createOpenAI } from "@ai-sdk/openai";
import { generateObject } from "ai";
import { storyCoherenceSchema } from "@src/schemas";
import { generateStoryCoherencePrompt, type CoherenceStoryInput } from "@src/utils/prompts";
import { OPENAI_API_KEY } from "astro:env/server";

const openai = createOpenAI({
  apiKey: OPENAI_API_KEY,
});

// Comprobación de coherencia NARRATIVA de un cuento completo. A diferencia
// de las comprobaciones de utils/functions.ts (deterministas, gratis), esto
// necesita una llamada a IA para "leer y entender" el cuento, así que vive
// en su propio módulo en vez de mezclarse con las funciones puras. Se llama
// desde dos sitios que necesitan exactamente el mismo juicio sobre los
// mismos datos: create-story.ts (justo tras generar el contenido, con los
// datos todavía en memoria, sin persistir) y diagnose-story-coherence.ts
// (sobre un cuento ya publicado, leyendo los mismos datos desde la base de
// datos) — de ahí que viva aquí y no dentro de ninguno de los dos.
export const checkStoryCoherence = async (input: CoherenceStoryInput) => {
  const { object } = await generateObject({
    model: openai('gpt-5-nano'),
    maxOutputTokens: 3000,
    providerOptions: {
      openai: {
        reasoningEffort: "low",
      },
    },
    prompt: generateStoryCoherencePrompt(input),
    schema: storyCoherenceSchema,
  });
  return object;
};

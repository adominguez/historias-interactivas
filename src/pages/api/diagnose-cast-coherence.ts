import { createOpenAI } from "@ai-sdk/openai";
import { generateObject } from "ai";
import { castCoherenceSchema } from "@src/schemas";
import { generateCastCoherencePrompt } from "@src/utils/prompts";
import { getStoryBySlug } from "@src/turso";
import { OPENAI_API_KEY } from "astro:env/server";

const openai = createOpenAI({
  apiKey: OPENAI_API_KEY,
});

// Diagnóstico de coherencia de reparto para UN cuento ya publicado. A
// diferencia de diagnose-stories.ts (estructura, diálogo, ortografía: todo
// determinista y gratis), "¿tiene sentido este reparto de personajes en
// conjunto?" es un juicio semántico que no se puede resolver con una regla
// fija, así que necesita una llamada a IA de solo lectura (barata: solo
// texto, sin imagen). Por eso vive en su propio endpoint bajo demanda, en
// vez de estar metido en el escaneo automático y gratuito de
// diagnose-stories — así nunca se dispara coste sin que alguien lo pida
// explícitamente, historia a historia.
export async function GET(request: Request) {
  const url = new URL(request.url);
  const storySlug = url.searchParams.get("storySlug") || undefined;

  if (!storySlug) {
    return new Response(JSON.stringify({ error: "Falta el parámetro 'storySlug'" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const [story] = await getStoryBySlug(storySlug);
  if (!story) {
    return new Response(JSON.stringify({ error: "No se ha encontrado el cuento" }), {
      status: 404,
      headers: { "Content-Type": "application/json" },
    });
  }

  const characters = JSON.parse(story.characters as string) as { name: string; description: string }[];
  const categories = JSON.parse(story.categories as string) as string[];

  // Con 0 o 1 personajes no hay mezcla que evaluar: nos ahorramos la
  // llamada a IA directamente.
  if (characters.length < 2) {
    return new Response(JSON.stringify({
      storyId: story.id,
      storySlug,
      storyTitle: story.title,
      coherent: true,
      outlierCharacters: [],
      reason: "Menos de 2 personajes, no hay mezcla que evaluar.",
    }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }

  const { object } = await generateObject({
    model: openai('gpt-5-nano'),
    maxOutputTokens: 1500,
    providerOptions: {
      openai: {
        reasoningEffort: "low",
      },
    },
    prompt: generateCastCoherencePrompt({
      title: story.title as string,
      category: categories.join(', '),
      age: story.age as string,
      characters,
    }),
    schema: castCoherenceSchema,
  });

  return new Response(JSON.stringify({
    storyId: story.id,
    storySlug,
    storyTitle: story.title,
    ...object,
  }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}

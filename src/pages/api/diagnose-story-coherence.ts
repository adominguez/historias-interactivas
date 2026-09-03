import { checkStoryCoherence } from "@src/utils/coherenceCheck";
import { getStoryBySlug, getNodesByParentSlug, getStoryOptions, getNodeOptions } from "@src/turso";

// Diagnóstico de coherencia NARRATIVA para UN cuento ya publicado: lee el
// cuento entero (raíz + todos los nodos, con sus opciones reales) y evalúa
// si tiene sentido de principio a fin (ver utils/coherenceCheck.ts para los
// tres tipos de problema que busca). Igual que diagnose-cast-coherence.ts,
// vive en su propio endpoint bajo demanda —nunca automático ni gratis, cada
// llamada cuesta una petición a IA— en vez de estar metido en el escaneo
// gratuito de diagnose-stories.ts.
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

  const storyId = story.id as number;
  const [rawNodes, storyOptions] = await Promise.all([
    getNodesByParentSlug(storySlug),
    getStoryOptions(storyId),
  ]);

  const nodes = await Promise.all(rawNodes.map(async (node) => ({
    slug: node.slug as string,
    title: node.title as string,
    text: node.text as string,
    options: await getNodeOptions(node.id as number),
  })));

  const characters = JSON.parse(story.characters as string) as { name: string; description: string }[];
  const categories = JSON.parse(story.categories as string) as string[];

  const result = await checkStoryCoherence({
    title: story.title as string,
    category: categories.join(', '),
    age: story.age as string,
    characters,
    story: { text: story.text as string, options: storyOptions },
    nodes,
  });

  return new Response(JSON.stringify({
    storyId,
    storySlug,
    storyTitle: story.title,
    ...result,
  }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}

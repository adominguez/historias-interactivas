import { regenerateStory } from "./create-story";
import { generateStorySetup } from "@src/utils/characters";
import { getStoryBySlug } from "@src/turso";
import { setupCategories } from "@src/data/categories";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const storySlug = url.searchParams.get("storySlug") || undefined;

  if (!storySlug) {
    return new Response(JSON.stringify({ error: "Falta el parámetro 'storySlug'" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const [existing] = await getStoryBySlug(storySlug);
  if (!existing) {
    return new Response(JSON.stringify({ error: "No se ha encontrado el cuento" }), {
      status: 404,
      headers: { "Content-Type": "application/json" },
    });
  }

  const existingCategories = JSON.parse(existing.categories as string) as string[];
  // Reutilizamos la misma categoría del cuento original si sigue existiendo
  // en el catálogo actual; si no (categoría eliminada desde entonces), dejamos
  // que generateStorySetup elija una al azar en vez de fallar.
  const categoryKeys = Object.keys(setupCategories);
  const category = existingCategories[0] && categoryKeys.includes(existingCategories[0]) ? existingCategories[0] : undefined;
  const age = existing.age as string;

  console.log(`Regenerando el cuento "${storySlug}" (categoría: ${category ?? "aleatoria"}, edad: ${age})...`);

  const { scenario, characterOptions, category: resolvedCategory, age: resolvedAge } = generateStorySetup(category, age);

  const { status, story, nodes, coherenceCheck, error } = await regenerateStory({ storySlug, scenario, characterOptions, category: resolvedCategory, age: resolvedAge });

  if (status === 200) {
    return new Response(JSON.stringify({ story, nodes, coherenceCheck }), { status, headers: { "Content-Type": "application/json" } });
  } else {
    return new Response(JSON.stringify({ message: "Ha ocurrido un error al regenerar el cuento", error }), { status, headers: { "Content-Type": "application/json" } });
  }
}

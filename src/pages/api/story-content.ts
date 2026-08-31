import { getStoryBySlug, getNodesByParentSlug } from "@src/turso";

// Devuelve el título y texto del cuento y de todos sus nodos, para
// alimentar el editor manual de /admin/editar-historia.
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

  const nodeRows = await getNodesByParentSlug(storySlug);
  const nodes = nodeRows.map((node) => ({
    slug: node.slug as string,
    title: node.title as string,
    text: node.text as string,
  }));

  return new Response(JSON.stringify({
    story: { title: story.title as string, text: story.text as string },
    nodes,
  }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}

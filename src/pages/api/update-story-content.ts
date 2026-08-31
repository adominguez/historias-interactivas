import { getStoryBySlug, getNodeBySlugAndParent, updateStoryTitleAndText, updateNodeTitleAndText } from "@src/turso";

// Guarda una edición manual (sin IA) del título y/o texto de la raíz de un
// cuento o de uno de sus nodos. Va por POST con cuerpo JSON, a diferencia
// del resto de endpoints de admin (que van por GET con query params),
// porque el texto de una escena puede ser bastante más largo de lo que cabe
// con margen en una URL.
export async function POST({ request }: { request: Request }) {
  const body = await request.json().catch(() => null) as { storySlug?: string; target?: string; title?: string; text?: string } | null;

  if (!body?.storySlug || !body?.target || typeof body.title !== "string" || typeof body.text !== "string") {
    return new Response(JSON.stringify({ error: "Faltan 'storySlug', 'target', 'title' o 'text'" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const { storySlug, target, title, text } = body;

  if (text.trim().length < 10) {
    return new Response(JSON.stringify({ error: "El texto es demasiado corto" }), {
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

  if (target === "story") {
    await updateStoryTitleAndText(story.id as number, title, text);
  } else {
    const [node] = await getNodeBySlugAndParent(target, storySlug);
    if (!node) {
      return new Response(JSON.stringify({ error: "No se ha encontrado la escena" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }
    await updateNodeTitleAndText(node.id as number, title, text);
  }

  return new Response(JSON.stringify({ message: "Guardado correctamente" }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}

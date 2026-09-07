import type { APIRoute } from "astro";
import { FACEBOOK_API_TOKEN, FACEBOOK_PAGE_ID, FACEBOOK_API_VERSION } from "astro:env/server";

const facebookUrl = `https://graph.facebook.com/${FACEBOOK_API_VERSION}/${FACEBOOK_PAGE_ID}/photos?access_token=${FACEBOOK_API_TOKEN}`;
const photoStoriesUrl = `https://graph.facebook.com/${FACEBOOK_API_VERSION}/${FACEBOOK_PAGE_ID}/photo_stories?access_token=${FACEBOOK_API_TOKEN}`;

// Sin esto, un fetch que se quede colgado (confirmado en vivo: la ruta de
// Stories agotaba hasta 120s en Vercel sin devolver ni error ni respuesta)
// consume todo el presupuesto de la función serverless en silencio. Con
// timeout, si de verdad se cuelga falla rápido con un error identificable
// en vez de agotar maxDuration sin dejar ninguna pista de cuál llamada era.
const GRAPH_API_TIMEOUT_MS = 15000;

// Publica una foto con mensaje en la página de Facebook. Extraída como
// función reutilizable (antes solo existía como el cuerpo del handler POST
// de abajo) para que social-auto-post.ts pueda llamarla directamente sin
// pegarle una petición HTTP a este mismo endpoint.
export async function postToFacebook(imageUrl: string, message: string): Promise<{ ok: true; postId: string } | { ok: false; error: string }> {
  const response = await fetch(facebookUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded"
    },
    body: `url=${encodeURIComponent(imageUrl)}&message=${encodeURIComponent(message)}`,
    signal: AbortSignal.timeout(GRAPH_API_TIMEOUT_MS)
  });

  const data = await response.json();

  if (!data.id) {
    return { ok: false, error: JSON.stringify(data) };
  }

  return { ok: true, postId: data.id as string };
}

// Publica una Story de Facebook. A diferencia del feed (una sola llamada),
// es un flujo de dos pasos documentado por Meta: (1) subir la foto SIN
// publicarla en el feed (published=false, mismo endpoint /photos de arriba)
// para conseguir un id de foto, (2) publicar esa foto como Story en
// /photo_stories con ese id. La forma exacta de la respuesta del paso 2 no
// se pudo confirmar de forma independiente en la documentación (se menciona
// {success, post_id}), así que se trata como fallo cualquier respuesta que
// no traiga ninguno de los dos campos, en vez de asumir que siempre viene.
export async function postFacebookStory(imageUrl: string): Promise<{ ok: true; postId: string } | { ok: false; error: string }> {
  const uploadResponse = await fetch(facebookUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded"
    },
    body: `url=${encodeURIComponent(imageUrl)}&published=false`,
    signal: AbortSignal.timeout(GRAPH_API_TIMEOUT_MS)
  });

  const uploadData = await uploadResponse.json();

  if (!uploadData.id) {
    return { ok: false, error: JSON.stringify(uploadData) };
  }

  const storyResponse = await fetch(photoStoriesUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded"
    },
    body: `photo_id=${encodeURIComponent(uploadData.id)}`,
    signal: AbortSignal.timeout(GRAPH_API_TIMEOUT_MS)
  });

  const storyData = await storyResponse.json();

  if (!storyData.success && !storyData.post_id) {
    return { ok: false, error: JSON.stringify(storyData) };
  }

  return { ok: true, postId: (storyData.post_id ?? uploadData.id) as string };
}

export const POST: APIRoute = async ({ request }) => {

  if (request.headers.get("Content-Type") === "application/json") {

    const body = await request.json();
    const result = await postToFacebook(body.url, body.message);

    return new Response(JSON.stringify({ response: result }), {
      headers: {
        "content-type": "application/json"
      }
    })
  }
  return new Response("Invalid request", {
    status: 400
  })
};
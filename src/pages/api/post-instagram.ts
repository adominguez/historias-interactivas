import type { APIRoute } from "astro";
import { FACEBOOK_API_TOKEN, INSTAGRAM_PAGE_ID, FACEBOOK_API_VERSION } from "astro:env/server";

const containerUrl = `https://graph.facebook.com/${FACEBOOK_API_VERSION}/${INSTAGRAM_PAGE_ID}/media`;
const publishUrl = `https://graph.facebook.com/${FACEBOOK_API_VERSION}/${INSTAGRAM_PAGE_ID}/media_publish`;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// Instagram procesa la imagen del contenedor de forma asíncrona: publicar
// justo después de crearlo puede fallar con "Media ID is not available"
// aunque el contenedor se haya creado bien (confirmado en una prueba real:
// código 9007 / subcódigo 2207027). Hay que consultar su status_code hasta
// que sea "FINISHED" antes de publicar. Para una foto normalmente tarda
// pocos segundos; 10 intentos cada 2s (20s máximo) da margen de sobra sin
// bloquear indefinidamente si algo va mal con esa imagen en concreto.
const waitForMediaReady = async (containerId: string): Promise<{ ok: true } | { ok: false; error: string }> => {
  const statusUrl = `https://graph.facebook.com/${FACEBOOK_API_VERSION}/${containerId}?fields=status_code&access_token=${FACEBOOK_API_TOKEN}`;

  for (let attempt = 0; attempt < 10; attempt++) {
    const response = await fetch(statusUrl);
    const data = await response.json();

    if (data.status_code === "FINISHED") return { ok: true };
    if (data.status_code === "ERROR") return { ok: false, error: JSON.stringify(data) };

    await sleep(2000);
  }

  return { ok: false, error: "El contenedor de Instagram no terminó de procesarse a tiempo (20s)" };
};

// Crea un contenedor de medios con los parámetros dados, espera a que
// termine de procesarse y lo publica -- el flujo de 3 pasos es idéntico para
// un post de feed y una Story, solo cambian los parámetros del contenedor
// (caption vs. media_type=STORIES), así que ambas funciones de abajo llaman
// a este único helper en vez de duplicar el flujo.
const createAndPublishMedia = async (containerParams: Record<string, string>): Promise<{ ok: true; postId: string } | { ok: false; error: string }> => {
  const mediaResponse = await fetch(containerUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded"
    },
    body: new URLSearchParams({
      ...containerParams,
      access_token: FACEBOOK_API_TOKEN
    })
  });

  const mediaData = await mediaResponse.json();

  if (!mediaData.id) {
    return { ok: false, error: JSON.stringify(mediaData) };
  }

  const readyState = await waitForMediaReady(mediaData.id);
  if (!readyState.ok) {
    return readyState;
  }

  const publishResponse = await fetch(publishUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      creation_id: mediaData.id,
      access_token: FACEBOOK_API_TOKEN
    })
  });

  const publishData = await publishResponse.json();

  if (!publishData.id) {
    return { ok: false, error: JSON.stringify(publishData) };
  }

  return { ok: true, postId: publishData.id as string };
};

// Publica una imagen con descripción en la cuenta de Instagram. Extraída
// como función reutilizable (antes solo existía como el cuerpo del handler
// POST de abajo) para que social-auto-post.ts pueda llamarla directamente
// sin pegarle una petición HTTP a este mismo endpoint.
export async function postToInstagram(imageUrl: string, caption: string) {
  return createAndPublishMedia({ image_url: imageUrl, caption });
}

// Publica una Story de Instagram. A diferencia del feed, las Stories no
// llevan caption en la API -- el texto ya va incrustado en la propia imagen
// (ver utils/socialStoryImage.ts) -- así que esta función no recibe ningún
// texto, solo la imagen ya compuesta.
export async function postInstagramStory(imageUrl: string) {
  return createAndPublishMedia({ image_url: imageUrl, media_type: "STORIES" });
}

export const POST: APIRoute = async ({ request }) => {
  if (request.headers.get("Content-Type") === "application/json") {
    const body = await request.json();
    const result = await postToInstagram(body.imageUrl, body.caption);

    return new Response(JSON.stringify({ response: result }), {
      headers: { "content-type": "application/json" }
    });
  }

  return new Response("Invalid request", { status: 400 });
};

import type { APIRoute } from "astro";
import { FACEBOOK_API_TOKEN, FACEBOOK_PAGE_ID, FACEBOOK_API_VERSION } from "astro:env/server";

const facebookUrl = `https://graph.facebook.com/${FACEBOOK_API_VERSION}/${FACEBOOK_PAGE_ID}/photos?access_token=${FACEBOOK_API_TOKEN}`;

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
    body: `url=${encodeURIComponent(imageUrl)}&message=${encodeURIComponent(message)}`
  });

  const data = await response.json();

  if (!data.id) {
    return { ok: false, error: JSON.stringify(data) };
  }

  return { ok: true, postId: data.id as string };
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
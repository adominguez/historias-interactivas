import type { APIRoute } from "astro";
import { FACEBOOK_API_TOKEN, INSTAGRAM_PAGE_ID, FACEBOOK_API_VERSION } from "astro:env/server";

const containerUrl = `https://graph.facebook.com/${FACEBOOK_API_VERSION}/${INSTAGRAM_PAGE_ID}/media`;
const publishUrl = `https://graph.facebook.com/${FACEBOOK_API_VERSION}/${INSTAGRAM_PAGE_ID}/media_publish`;

export const POST: APIRoute = async ({ request }) => {
  if (request.headers.get("Content-Type") === "application/json") {
    const body = await request.json();
    const caption = body.caption; // No es necesario encodeURIComponent aquí
    const imageUrl = body.imageUrl;
    
    // ✅ Paso 1: Crear el contenedor de medios en Instagram
    const mediaResponse = await fetch(containerUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded"
      },
      body: new URLSearchParams({
        image_url: imageUrl,
        caption: caption, // Aquí ya se maneja correctamente
        access_token: FACEBOOK_API_TOKEN
      })
    });

    const mediaData = await mediaResponse.json();
    console.log("Media response:", mediaData);

    if (!mediaData.id) {
      return new Response(JSON.stringify({
        error: "Error posting to Instagram",
        mediaData
      }), {
        status: 400,
      });
    }

    // ✅ Paso 2: Publicar la imagen en Instagram
    const publishResponse = await fetch(publishUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        creation_id: mediaData.id,
        access_token: FACEBOOK_API_TOKEN
      })
    });

    const response = await publishResponse.json();
    console.log("Publish response:", response);

    return new Response(JSON.stringify({ response }), {
      headers: { "content-type": "application/json" }
    });
  }

  return new Response("Invalid request", { status: 400 });
};

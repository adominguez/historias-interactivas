import type { APIRoute } from "astro";
import { FACEBOOK_API_TOKEN, FACEBOOK_PAGE_ID, FACEBOOK_API_VERSION } from "astro:env/server";

const facebookUrl = `https://graph.facebook.com/${FACEBOOK_API_VERSION}/${FACEBOOK_PAGE_ID}/photos?access_token=${FACEBOOK_API_TOKEN}`;

export const POST: APIRoute = async ({ request }) => {

  if (request.headers.get("Content-Type") === "application/json") {

    const body = await request.json();
    const message = encodeURIComponent(body.message);
    const url = body.url;
    
    const data = await fetch(facebookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded"
      },
      body: `url=${url}&message=${message}`
    })

    const response = await data.json();

    return new Response(JSON.stringify({ response }), {
      headers: {
        "content-type": "application/json"
      }
    })
  }
  return new Response("Invalid request", {
    status: 400
  })
};
import { updateStoryRating } from '@src/turso';

export async function GET(request: Request) {
  
  const url = new URL(request.url);

  const slug = url.searchParams.get("slug") || undefined;
  const rating = url.searchParams.get("rating") || undefined;
  const isRated = url.searchParams.get("isRated") || undefined;

  if (!slug) {
    return new Response(JSON.stringify({ error: 'Missing slug parameter' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  if (!rating) {
    return new Response(JSON.stringify({ error: 'Missing rating parameter' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Llama a la función que busca en la base de datos
  const results = await updateStoryRating(slug, parseInt(rating, 10), isRated === 'true' ? true : false);

  return new Response(JSON.stringify({ results }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}
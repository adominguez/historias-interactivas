import { getSearchStories } from "@src/turso";

export async function GET(request: Request) {
  
  const url = new URL(request.url);

  const searchTerm = url.searchParams.get("q") || undefined;

  if (!searchTerm) {
    return new Response(JSON.stringify({ error: 'Missing query parameter' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Llama a la función que busca en la base de datos
  const results = await getSearchStories(searchTerm)

  return new Response(JSON.stringify({ results }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}
import { getNodesByParentSlug, getStoryBySlug, deleteStory, deleteNodesByStoryId, deleteEdgesByStoryId } from "@src/turso";
import { v2 as cloudinary } from 'cloudinary'
import { PUBLIC_CLOUDINARY_CLOUD_NAME, PUBLIC_CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET } from "astro:env/server";

cloudinary.config({
  cloud_name: PUBLIC_CLOUDINARY_CLOUD_NAME,
  api_key: PUBLIC_CLOUDINARY_API_KEY,
  api_secret: CLOUDINARY_API_SECRET,
  secure: true,
});

export async function GET(request: Request) {
  
  const url = new URL(request.url);

  const storySlug = url.searchParams.get("url") || undefined;

  if (!storySlug) {
    return new Response(JSON.stringify({ error: 'Missing query parameter' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const [story] = await getStoryBySlug(storySlug);

  if (!story) {
    return new Response(JSON.stringify({ error: 'Story not found' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const storyId = story.id;
  // Orden obligatorio: 'edges' y 'nodes' tienen claves foráneas hacia
  // 'stories' (y 'edges' hacia 'nodes'), que Turso sí comprueba de verdad —
  // borrar la historia antes que sus hijos lo rechazaría con
  // SQLITE_CONSTRAINT.
  await deleteEdgesByStoryId(storyId as number);
  await deleteNodesByStoryId(storyId as number);
  await deleteStory(storyId as number);

  const errors = [];

  try {
    // Elimina la carpeta y la imagen de la historia de cloudinary
    await cloudinary.api.delete_resources_by_prefix(`cuentos-interactivos/${storySlug}`);
    await cloudinary.api.delete_folder(`cuentos-interactivos/${storySlug}`);
  } catch (error) {
    errors.push(`No se ha podido eliminar la imagen: ${error}`);
  }

  const stories = await getStoryBySlug(storySlug);
  const nodes = await getNodesByParentSlug(storySlug);


  return new Response(JSON.stringify({ story: storySlug, stories, nodes, message: 'Se ha eliminado la historia y todos sus nodos', errors }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}
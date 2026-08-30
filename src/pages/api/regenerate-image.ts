import { generateImage, uploadImage } from "./create-story";
import { generateImagePrompt } from "@src/utils/prompts";
import { getStoryBySlug } from "@src/turso";

// Regenera SOLO la imagen de portada de un cuento ya publicado, sin tocar ni
// el texto ni el grafo. Útil para volver a generar imágenes con un prompt o
// modelo mejor (ver generateImagePrompt/gpt-image-2) sin pagar de nuevo por
// blueprint+contenido, que es lo que hace 'regenerate-story'. Sube la nueva
// imagen al mismo public_id de Cloudinary (derivado del slug), así que
// sobrescribe la anterior en la misma ruta: la URL de la imagen no cambia y
// no hace falta tocar la fila de la base de datos.
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

  const age = story.age as string;
  const category = (JSON.parse(story.categories as string) as string[])[0];
  const characters = JSON.parse(story.characters as string) as { name: string; description: string }[];
  const sceneText = story.text as string;

  const imagePrompt = generateImagePrompt({ age, category, sceneText, characters });

  console.log(`Regenerando solo la imagen de "${storySlug}"...`);
  const { isGenerated, error, imageUrl } = await generateImage(imagePrompt);

  if (!isGenerated || !imageUrl) {
    return new Response(JSON.stringify({ message: "No se ha podido generar la imagen", error }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const { isUploaded, error: uploadError } = await uploadImage(imageUrl, storySlug);

  if (!isUploaded) {
    return new Response(JSON.stringify({ message: "No se ha podido subir la imagen", error: uploadError }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  console.log(`Imagen de "${storySlug}" regenerada correctamente.`);
  return new Response(JSON.stringify({ message: "Imagen regenerada correctamente", storySlug }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}

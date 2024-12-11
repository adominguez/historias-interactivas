import { openai } from "@ai-sdk/openai";
import { generateObject } from "ai";
import { fullSchema } from "@src/schemas";
import { generateStorySetup } from "@src/utils/characters";
import { truncateString, validateStoryIntegrity } from "@src/utils/functions";
import { generateStoryPrompt } from "@src/utils/prompts";
import OpenAI from "openai";
import { v2 as cloudinary } from 'cloudinary'
import { insertNewNodes, insertNewStory } from "@src/turso";
import { type Node } from "@types";

cloudinary.config({
  cloud_name: import.meta.env.PUBLIC_CLOUDINARY_CLOUD_NAME,
  api_key: import.meta.env.PUBLIC_CLOUDINARY_API_KEY,
  api_secret: import.meta.env.CLOUDINARY_API_SECRET,
  secure: true,
});

const ia = new OpenAI({
  apiKey: import.meta.env.OPENAI_API_KEY,
});

export async function GET(request: Request) {
  // Obtenemos la configuración del cuento
  const { scenario, characters, category } = generateStorySetup();
  console.log('Configuración del cuento: ', scenario, characters, category);
  // Generamos el prompt para OpenAI
  console.log('Generando cuento...');
  const prompt = generateStoryPrompt({ scenario, characters, category });
  const schema = fullSchema;
  const result = await generateObject({
    model: openai('gpt-4o-mini'),
    system: `Eres un escritor de cuentos interactivos para niños de entre 5 y 8 años.`,
    prompt,
    schema,
  });

  console.log('Cuento generado!!');

  const { story, nodes } = result.object;

  validateStoryIntegrity(nodes as unknown as Node[]);

  console.log('Guardando cuento en la base de datos...');
  const storyParams = [
    story.title,
    story.slug,
    story.resume,
    story.text,
    JSON.stringify(story.options), // Convierte a JSON para almacenar en la base de datos
    story.meta.description,
    JSON.stringify(story.meta.keywords),
    JSON.stringify(story.categories),
    JSON.stringify(story.characters),
  ];

  const { insertedId } = await insertNewStory(storyParams);

  console.log('Guardando nodos en la base de datos...');
  const nodesParams = nodes.map(({ slug, backSlug, text, meta, options }) => ([
    insertedId,
    slug,
    story.slug,
    backSlug,
    text,
    JSON.stringify(options),
    meta.title,
    meta.description,
    JSON.stringify(story.meta.keywords)
  ]));

  insertNewNodes(nodesParams);

  console.log('Cuento guardado en la base de datos!!');

  console.log('Creando imagen con IA...');
  // comenzamos la creación de imágenes con IA
  const imagePrompt = `${truncateString(
    `I NEED to test how the tool works with extremely simple prompts. DO NOT add any detail, just use it AS-IS:
    Ilustración 3D en estilo de cuento infantil, colores brillantes y texturas suaves, evita añadir texto. Este es el texto: ${story.text}.`, 700,)}. Personajes: ${story.characters.map(({ name, description }) => `${name}: ${description}`).join(", ")}.`

  const aiResponse = await ia.images.generate({
    model: "dall-e-3",
    prompt: imagePrompt,
    n: 1,
    size: "1792x1024",
  });

  const imageUrl = aiResponse.data[0].url as string;

  console.log('Imagen creada con IA!!');

  console.log('Subiendo imagen a cloudinary...');
  cloudinary.uploader
    .upload(imageUrl, {
      public_id: story.slug,
      quality_analysis: true,
      colors: true,
      folder: `cuentos-interactivos/${story.slug}`
    }).then(result=> {
        console.log('imagen subida a cloudinary');
        console.log(result)
    }).catch(error => {
        console.log('error al subir la imagen a cloudinary');
        console.log(error)
    });
  
  console.log('se ha creado el cuento, proceso completado!!');

  // Devolvemos el resultado
  return new Response(JSON.stringify({ story, nodes }), { status: 200 });
}
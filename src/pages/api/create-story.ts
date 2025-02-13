import { createOpenAI } from "@ai-sdk/openai";
import { generateObject } from "ai";
import { fullSchema } from "@src/schemas";
import { generateStorySetup } from "@src/utils/characters";
import { truncateString, validateStoryIntegrity } from "@src/utils/functions";
import { generateStoryPrompt } from "@src/utils/prompts";
import OpenAI from "openai";
import { v2 as cloudinary } from 'cloudinary'
import { insertNewNodes, insertNewStory, getStoryBySlug } from "@src/turso";
import { type Node } from "@types";
import { AGES } from '@src/utils/characters';
import { PUBLIC_CLOUDINARY_CLOUD_NAME, PUBLIC_CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET, OPENAI_API_KEY } from "astro:env/server";

const openai = createOpenAI({
  apiKey: OPENAI_API_KEY,
});

cloudinary.config({
  cloud_name: PUBLIC_CLOUDINARY_CLOUD_NAME,
  api_key: PUBLIC_CLOUDINARY_API_KEY,
  api_secret: CLOUDINARY_API_SECRET,
  secure: true,
});

const ia = new OpenAI({
  apiKey: OPENAI_API_KEY,
});

const uploadImage = async (imageUrl: string, slug: string) => {
  console.log('Subiendo imagen a cloudinary...');
  try {
    await cloudinary.uploader
      .upload(imageUrl, {
        public_id: slug,
        quality_analysis: true,
        colors: true,
        folder: `cuentos-interactivos/${slug}`
      });
    console.log('Imagen subida a cloudinary!!');
    return { isUploaded: true };
  } catch (error) {
    console.log('Error al subir la imagen a cloudinary:', error);
    return { isUploaded: false, error };
  }
};

const generateImage = async (prompt: string) => {
  try {
    console.log('Creando imagen con IA...');
    const aiResponse = await ia.images.generate({
      model: "dall-e-3",
      prompt,
      n: 1,
      size: "1792x1024",
    });
    console.log('Imagen creada con IA!!');
    const imageUrl = aiResponse.data[0].url as string;
    return { imageUrl, isGenerated: true };
  } catch (error) {
    return { isGenerated: false, error };
  }
};

const createStory = async ({ scenario, characters, category, age }: { scenario: string, characters: string[], category: string, age: string }) => {
  // Generamos el prompt para OpenAI
  console.log('Generando cuento...');
  const prompt = generateStoryPrompt({ scenario, characters, category, age });
  const schema = fullSchema;
  const result = await generateObject({
    model: openai('gpt-4o-mini'),
    system: `Eres un escritor de cuentos interactivos para ${AGES[age].type} de ${AGES[age].alias} con habilidades SEO.
    Cada nodo y la historia principal deben incluir un objeto "meta" con los siguientes campos:
    - "keywords": Una lista de palabras clave relevantes al contenido.
    - "title": Un título breve y descriptivo para SEO.
    - "description": Una descripción atractiva que resuma el contenido.`,
    prompt,
    schema,
  });

  console.log('Cuento generado!!');

  const { story, nodes } = result.object;

  // Comprobamos que no exista un cuento con el mismo slug
  const storyBySlug = await getStoryBySlug(story.slug);
  const isValidSlug = storyBySlug?.length === 0;

  // Validamos la integridad del cuento
  const { isValidated } = validateStoryIntegrity(nodes as unknown as Node[]);

  console.log({ isValidated, isValidSlug });

  if (isValidated && isValidSlug) {
    const storyParams = [
      story.title,
      story.slug,
      story.resume,
      story.text,
      JSON.stringify(story.options), // Convierte a JSON para almacenar en la base de datos
      story.meta.description,
      JSON.stringify(story.meta.keywords),
      JSON.stringify([category]),
      JSON.stringify(story.characters),
      `cuentos-interactivos/${story.slug}/${story.slug}`,
      age,
      story.duration || '10-15 minutos',
      0
    ];

    const selectedAge = AGES[age as keyof typeof AGES] || AGES["9-12"];

    // comenzamos la creación de imágenes con IA
    const imagePrompt = `${truncateString(
      `I NEED to test how the tool works with extremely simple prompts. DO NOT add any detail, just use it AS-IS:
    Ilustración 3D para ${selectedAge.people} de ${selectedAge.alias}, colores brillantes y texturas suaves, evita añadir texto. Este es el texto: ${story.text}.`, 700,)}. Personajes: ${story.characters.map(({ name, description }) => `${name}: ${description}`).join(", ")}.`

    const { isGenerated, error, imageUrl } = await generateImage(imagePrompt);

    if (isGenerated && imageUrl) {

      // Subimos la imagen a cloudinary
      const { isUploaded, error } = await uploadImage(imageUrl, story.slug);

      if (isUploaded) {
        // Guardamos el cuento en la base de datos
        console.log('Guardando cuento en la base de datos...');
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
        return { status: 200, story, nodes };
      } else {
        return { status: 400, error };
      }
    } else {
      return { status: 400, error }
    }
  } else {
    return { status: 400, error: !isValidated ? "El cuento no ha pasado la validación de integridad" : "El slug del cuento ya existe" };
  }
};

export async function GET(request: Request) {
  console.log('Va a comenzar la creación del cuento...');

  // Obtener la URL completa
  const url = new URL(request.url);

  // Extraer el parámetro "category"
  const paramCategory = url.searchParams.get("category") || undefined;
  const paramAge = url.searchParams.get("age") === '18 ' || url.searchParams.get("age") === '18' ? '18+' : url.searchParams.get("age") || undefined;

  console.log('Parámetros de la petición: ', paramCategory, paramAge);

  // Obtenemos la configuración del cuento
  const { scenario, characters, category, age } = generateStorySetup(paramCategory, paramAge);
  console.log('Configuración del cuento: ', scenario, characters, category, age);

  // Creamos el cuento
  const { status, story, nodes, error } = await createStory({ scenario, characters, category, age });

  // Devolvemos el resultado
  if (status === 200) {
    return new Response(JSON.stringify({ story, nodes }), { status });
  } else {
    return new Response(JSON.stringify({ message: "Ha ocurrido un error al crear el cuento", error }), { status });
  }
}


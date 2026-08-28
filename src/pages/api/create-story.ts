import { createOpenAI } from "@ai-sdk/openai";
import { generateObject } from "ai";
import { blueprintSchema, sceneContentSchema, storyContentSchema } from "@src/schemas";
import { generateStorySetup } from "@src/utils/characters";
import { truncateString, validateStoryIntegrity, buildAncestorSummaries } from "@src/utils/functions";
import { generateBlueprintPrompt, generateSceneContentPrompt } from "@src/utils/prompts";
import OpenAI from "openai";
import { v2 as cloudinary } from 'cloudinary'
import { insertNewNodes, insertNewStory, getStoryBySlug } from "@src/turso";
import { type Node, type Option } from "@types";
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
      model: "gpt-image-1",
      prompt,
      n: 1,
      size: "1536x1024",
      quality: "high",
    });
    console.log('Imagen creada con IA!!');
    const base64 = aiResponse.data?.[0]?.b64_json;
    if (!base64) {
      return { isGenerated: false, error: "La API no devolvió ninguna imagen" };
    }
    // gpt-image-1 ya no admite response_format: "url", siempre devuelve base64.
    const imageUrl = `data:image/png;base64,${base64}`;
    return { imageUrl, isGenerated: true };
  } catch (error) {
    return { isGenerated: false, error };
  }
};

const buildWriterSystemPrompt = (age: string) => {
  const selectedAge = AGES[age as keyof typeof AGES] || AGES["9-12"];
  return `Eres un experto escritor de cuentos interactivos para ${selectedAge.type} de ${selectedAge.alias}. Tu labor es generar ${selectedAge.type}.`;
};

// Pass 1: genera solo el esqueleto del grafo (slugs, opciones, resúmenes de
// continuidad), sin texto completo. Es barato, y se valida ANTES de gastar en
// texto e imagen: un cuento con enlaces rotos o nodos huérfanos se descarta
// aquí sin haber generado ni una sola escena completa.
const generateBlueprint = async ({ scenario, characters, category, age }: { scenario: string, characters: string[], category: string, age: string }) => {
  console.log('Generando esqueleto del cuento...');
  const result = await generateObject({
    model: openai('gpt-5-nano'),
    temperature: 1,
    maxOutputTokens: 8000,
    providerOptions: {
      openai: {
        reasoningEffort: "low",
      },
    },
    system: buildWriterSystemPrompt(age),
    prompt: generateBlueprintPrompt({ scenario, characters, category, age }),
    schema: blueprintSchema,
  });
  console.log('Esqueleto generado!!');
  return result.object;
};

// Pass 2: genera el texto completo de UNA escena (la raíz o un nodo),
// recibiendo el resumen de las escenas anteriores de su mismo camino como
// contexto de continuidad.
const generateSceneContent = async ({ age, history, summary, isEnding, isRoot }: { age: string, history: string[], summary: string, isEnding: boolean, isRoot: boolean }) => {
  const schema = isRoot ? storyContentSchema : sceneContentSchema;
  const result = await generateObject({
    model: openai('gpt-5-nano'),
    temperature: 1,
    maxOutputTokens: 4000,
    providerOptions: {
      openai: {
        reasoningEffort: "low",
      },
    },
    system: buildWriterSystemPrompt(age),
    prompt: generateSceneContentPrompt({ age, history, summary, isEnding }),
    schema,
  });
  return result.object;
};

const createStory = async ({ scenario, characters, category, age }: { scenario: string, characters: string[], category: string, age: string }) => {
  const blueprint = await generateBlueprint({ scenario, characters, category, age });
  const { story: storyBlueprint, nodes: nodeBlueprints } = blueprint;

  // Comprobamos que no exista un cuento con el mismo slug
  const storyBySlug = await getStoryBySlug(storyBlueprint.slug);
  const isValidSlug = storyBySlug?.length === 0;

  // Validamos la integridad del grafo ANTES de generar texto completo o imagen
  const { isValidated, errors } = validateStoryIntegrity(
    { slug: storyBlueprint.slug, options: storyBlueprint.options },
    nodeBlueprints as unknown as Node[]
  );

  console.log({ isValidated, isValidSlug, errors });

  if (!isValidated || !isValidSlug) {
    return { status: 400, error: !isValidated ? { message: "El cuento no ha pasado la validación de integridad", errors } : "El slug del cuento ya existe" };
  }

  // Calculamos, para cada nodo, el resumen de las escenas anteriores de su
  // camino (a partir de las opciones reales del grafo, ya validadas).
  const historyBySlug = buildAncestorSummaries(
    { slug: storyBlueprint.slug, summary: storyBlueprint.summary, options: storyBlueprint.options as Option[] },
    nodeBlueprints.map(node => ({ slug: node.slug, summary: node.summary, options: node.options as Option[] }))
  );

  console.log('Generando el texto completo de cada escena...');
  const [storyContent, ...nodeContents] = await Promise.all([
    generateSceneContent({ age, history: [], summary: storyBlueprint.summary, isEnding: false, isRoot: true }),
    ...nodeBlueprints.map(node => generateSceneContent({
      age,
      history: historyBySlug.get(node.slug) ?? [],
      summary: node.summary,
      isEnding: node.options.length === 0,
      isRoot: false,
    })),
  ]);
  console.log('Texto de todas las escenas generado!!');

  const story = {
    ...storyBlueprint,
    text: (storyContent as typeof storyContent & { resume: string }).text,
    resume: (storyContent as typeof storyContent & { resume: string }).resume,
    meta: storyContent.meta,
  };
  const nodes = nodeBlueprints.map((node, index) => ({
    ...node,
    text: nodeContents[index].text,
    meta: nodeContents[index].meta,
  }));

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

  if (!isGenerated || !imageUrl) {
    return { status: 400, error };
  }

  // Subimos la imagen a cloudinary
  const { isUploaded, error: uploadError } = await uploadImage(imageUrl, story.slug);

  if (!isUploaded) {
    return { status: 400, error: uploadError };
  }

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
    JSON.stringify(meta.keywords)
  ]));

  insertNewNodes(nodesParams);
  console.log('Cuento guardado en la base de datos!!');
  return { status: 200, story, nodes };
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

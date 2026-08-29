import { createOpenAI } from "@ai-sdk/openai";
import { generateObject } from "ai";
import { blueprintSchema, sceneContentSchema, storyContentSchema } from "@src/schemas";
import { generateStorySetup } from "@src/utils/characters";
import { truncateString, validateStoryIntegrity, resolveBlueprint } from "@src/utils/functions";
import { generateBlueprintPrompt, generateSceneContentPrompt } from "@src/utils/prompts";
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
  return `Eres un experto escritor de cuentos interactivos para ${selectedAge.type} de ${selectedAge.alias}. Tu labor es generar ${selectedAge.type}. Escribes siempre con claridad y concreción; usas imágenes poéticas solo cuando aportan un significado fácil de entender, nunca como adorno vacío.`;
};

// Pass 1: genera solo el esqueleto del grafo (slugs, opciones, resúmenes de
// continuidad), sin texto completo. Es barato, y se valida ANTES de gastar en
// texto e imagen: un cuento con enlaces rotos o nodos huérfanos se descarta
// aquí sin haber generado ni una sola escena completa.
const generateBlueprint = async ({ scenario, characterOptions, category, age }: { scenario: string, characterOptions: string[], category: string, age: string }) => {
  console.log('Generando esqueleto del cuento...');
  const result = await generateObject({
    model: openai('gpt-5-nano'),
    maxOutputTokens: 8000,
    providerOptions: {
      openai: {
        reasoningEffort: "low",
      },
    },
    system: buildWriterSystemPrompt(age),
    prompt: generateBlueprintPrompt({ scenario, characterOptions, category, age }),
    schema: blueprintSchema,
  });
  console.log('Esqueleto generado!!');
  return result.object;
};

// Pass 2: genera el texto completo de UNA escena (la raíz o un nodo),
// recibiendo el resumen de las escenas anteriores de su mismo camino como
// contexto de continuidad.
const generateSceneContent = async ({ age, history, summary, isEnding, isRoot, characters }: { age: string, history: string[], summary: string, isEnding: boolean, isRoot: boolean, characters: { name: string, description: string }[] }) => {
  const schema = isRoot ? storyContentSchema : sceneContentSchema;
  const result = await generateObject({
    model: openai('gpt-5-nano'),
    maxOutputTokens: 4000,
    providerOptions: {
      openai: {
        reasoningEffort: "low",
      },
    },
    system: buildWriterSystemPrompt(age),
    prompt: generateSceneContentPrompt({ age, history, summary, isEnding, characters }),
    schema,
  });
  return result.object;
};

const MAX_BLUEPRINT_ATTEMPTS = 3;

const createStory = async ({ scenario, characterOptions, category, age }: { scenario: string, characterOptions: string[], category: string, age: string }) => {
  // El esqueleto ya no puede tener enlaces rotos, slugs duplicados ni nodos
  // huérfanos (resolveBlueprint los descarta o los calcula de forma
  // determinista). Lo único que sigue siendo un fallo real de contenido —y
  // por tanto merece reintentar— es un índice fuera de rango, un cuento sin
  // ningún nodo alcanzable, o un cuento que nunca termina.
  let resolved: Extract<ReturnType<typeof resolveBlueprint>, { ok: true }> | undefined;
  let lastErrors: any[] = [];
  let attempt = 0;

  while (attempt < MAX_BLUEPRINT_ATTEMPTS && !resolved) {
    attempt += 1;
    const rawBlueprint = await generateBlueprint({ scenario, characterOptions, category, age });
    const result = resolveBlueprint(rawBlueprint.story, rawBlueprint.nodes);

    console.log(`Esqueleto intento ${attempt}/${MAX_BLUEPRINT_ATTEMPTS}:`, result.ok ? { ok: true, nodos: result.nodes.length } : { ok: false, errors: result.errors });

    if (result.ok) {
      resolved = result;
    } else {
      lastErrors = result.errors;
    }
  }

  if (!resolved) {
    return { status: 400, error: { message: `El cuento no ha pasado la validación de integridad tras ${attempt} intentos`, errors: lastErrors } };
  }

  // El slug de la historia se deriva del título; si por casualidad ya existe
  // (muy improbable, dos títulos distintos rara vez coinciden), lo
  // desambiguamos con un sufijo en vez de descartar todo el esqueleto.
  const originalStorySlug = resolved.story.slug;
  let storySlug = originalStorySlug;
  for (let suffix = 2; suffix <= 6; suffix++) {
    const existing = await getStoryBySlug(storySlug);
    if (!existing || existing.length === 0) break;
    storySlug = `${originalStorySlug}-${suffix}`;
  }

  const storyBlueprint = { ...resolved.story, slug: storySlug };
  const nodeBlueprints = resolved.nodes.map(node => ({
    ...node,
    backSlug: node.backSlug === originalStorySlug ? storySlug : node.backSlug,
  }));
  const historyBySlug = resolved.historyBySlug;

  // Comprobación final de cordura: el grafo ya resuelto debería ser correcto
  // por construcción. Si esto llega a fallar es un bug en resolveBlueprint,
  // no un problema de la IA.
  const sanityCheck = validateStoryIntegrity(
    { slug: storyBlueprint.slug, options: storyBlueprint.options },
    nodeBlueprints as unknown as Node[]
  );
  if (!sanityCheck.isValidated) {
    console.error('El esqueleto resuelto no superó la comprobación de cordura final (bug interno):', sanityCheck.errors);
    return { status: 500, error: { message: "Error interno al resolver el esqueleto del cuento", errors: sanityCheck.errors } };
  }

  console.log('Generando el texto completo de cada escena...');
  const [storyContent, ...nodeContents] = await Promise.all([
    generateSceneContent({ age, history: [], summary: storyBlueprint.summary, isEnding: false, isRoot: true, characters: storyBlueprint.characters }),
    ...nodeBlueprints.map(node => generateSceneContent({
      age,
      history: historyBySlug.get(node.slug) ?? [],
      summary: node.summary,
      isEnding: node.options.length === 0,
      isRoot: false,
      characters: storyBlueprint.characters,
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
  const plainSceneText = story.text.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  const imagePrompt = `Ilustración 3D para ${selectedAge.people} de ${selectedAge.alias}, colores brillantes y texturas suaves, evita añadir texto en la imagen. Escena: ${truncateString(plainSceneText, 900)}. Personajes: ${story.characters.map(({ name, description }) => `${name}: ${description}`).join(", ")}.`

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
  const { scenario, characterOptions, category, age } = generateStorySetup(paramCategory, paramAge);
  console.log('Configuración del cuento: ', scenario, characterOptions, category, age);

  // Creamos el cuento
  const { status, story, nodes, error } = await createStory({ scenario, characterOptions, category, age });

  // Devolvemos el resultado
  if (status === 200) {
    return new Response(JSON.stringify({ story, nodes }), { status });
  } else {
    return new Response(JSON.stringify({ message: "Ha ocurrido un error al crear el cuento", error }), { status });
  }
}

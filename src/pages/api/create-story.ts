import { createOpenAI } from "@ai-sdk/openai";
import { generateObject } from "ai";
import { blueprintSchema, sceneContentSchema, storyContentSchema } from "@src/schemas";
import { generateStorySetup } from "@src/utils/characters";
import { validateStoryIntegrity, resolveBlueprint, hasScreenplayStyleDialogue, findInvalidSpanishWords } from "@src/utils/functions";
import { generateBlueprintPrompt, generateSceneContentPrompt, generateImagePrompt } from "@src/utils/prompts";
import OpenAI from "openai";
import { v2 as cloudinary } from 'cloudinary'
import { insertNewNodes, insertNewStory, getStoryBySlug, updateStory, deleteNodesByStoryId } from "@src/turso";
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
      model: "gpt-image-2",
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
    // Los modelos gpt-image-* no admiten response_format: "url", siempre devuelven base64.
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

const MAX_SCENE_CONTENT_ATTEMPTS = 3;

// Pese a pedirlo explícitamente en el prompt, dos problemas han reaparecido
// con formas distintas en sesiones de prueba anteriores: el diálogo
// "disfrazado" de guion de teatro/cine ("Nombre: texto", "— Nombre — texto")
// y palabras que no existen en español (glitches de generación como
// "otransportas" o palabras de otro idioma coladas como "fails"). En vez de
// seguir puliendo el prompt, lo comprobamos de forma determinista y, si
// aparece cualquiera de los dos, regeneramos SOLO esa escena (barato, un
// único nodo) en vez de todo el cuento.
const generateSceneContentWithRetry = async (params: { age: string, history: string[], summary: string, isEnding: boolean, isRoot: boolean, characters: { name: string, description: string }[] }) => {
  const characterNames = params.characters.map(({ name }) => name);
  let result: Awaited<ReturnType<typeof generateSceneContent>> | undefined;

  for (let attempt = 1; attempt <= MAX_SCENE_CONTENT_ATTEMPTS; attempt++) {
    result = await generateSceneContent(params);

    const invalidWords = findInvalidSpanishWords(result.text, characterNames);
    const isScreenplayStyle = hasScreenplayStyleDialogue(result.text, characterNames);

    if (invalidWords.length === 0 && !isScreenplayStyle) {
      return result;
    }

    const reasons = [
      isScreenplayStyle && 'diálogo con formato de guion',
      invalidWords.length > 0 && `palabras no válidas (${invalidWords.join(', ')})`,
    ].filter(Boolean).join(' y ');
    console.log(`Escena con ${reasons}, regenerando (intento ${attempt}/${MAX_SCENE_CONTENT_ATTEMPTS})...`);
  }

  console.warn('No se pudo evitar el problema detectado tras varios intentos; se usa la última versión generada.');
  return result!;
};

// El esqueleto es la única pasada que se reintenta y es barata (nada de
// texto completo ni imagen todavía). Hemos ido añadiendo más motivos
// legítimos de rechazo (decisión de mentira, bucles, convergencia...), lo
// que ha bajado la probabilidad de que un intento cualquiera pase todas las
// comprobaciones a la vez; subimos el límite para compensarlo en vez de
// relajar las propias comprobaciones. 'convergent-node' resultó ser, con
// diferencia, el motivo de rechazo más frecuente al medirlo sobre un lote
// real de 6 regeneraciones (ver prompt reforzado en generateBlueprintPrompt):
// con 6 intentos, 4 de 6 cuentos agotaron el límite sin conseguir un esqueleto
// válido. Subido a 10 mientras se comprueba si el prompt reforzado basta por
// sí solo para bajar la tasa de fallo.
const MAX_BLUEPRINT_ATTEMPTS = 10;

// Genera el esqueleto + contenido completo + imagen de un cuento (todo lo
// que NO depende de si el resultado se inserta como cuento nuevo o
// sustituye a uno ya existente). Si se pasa 'targetSlug', el cuento se
// fuerza a usar exactamente ese slug en vez de derivarlo del título — es el
// caso de 'regenerateStory', donde el slug ya está fijado de antemano
// porque tiene que seguir siendo la misma URL (ver comentario allí). Si se
// pasa 'skipImage', no se genera ni sube ninguna imagen nueva (la de
// Cloudinary en esa misma ruta, si existe, se queda tal cual): la generación
// de imagen en calidad "high" es, con diferencia, la llamada más cara de todo el pipeline,
// y para reparar la estructura de un cuento ya publicado no hace falta arte
// nuevo — regenerar 42 cuentos con imagen nueva salía por varios euros más de
// lo necesario para un objetivo puramente estructural.
const generateStoryWithContent = async ({ scenario, characterOptions, category, age, targetSlug, skipImage }: { scenario: string, characterOptions: string[], category: string, age: string, targetSlug?: string, skipImage?: boolean }) => {
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
    return { status: 400 as const, error: { message: `El cuento no ha pasado la validación de integridad tras ${attempt} intentos`, errors: lastErrors } };
  }

  const originalStorySlug = resolved.story.slug;
  let storySlug = originalStorySlug;
  if (targetSlug) {
    storySlug = targetSlug;
  } else {
    // El slug de la historia se deriva del título; si por casualidad ya
    // existe (muy improbable, dos títulos distintos rara vez coinciden), lo
    // desambiguamos con un sufijo en vez de descartar todo el esqueleto.
    for (let suffix = 2; suffix <= 6; suffix++) {
      const existing = await getStoryBySlug(storySlug);
      if (!existing || existing.length === 0) break;
      storySlug = `${originalStorySlug}-${suffix}`;
    }
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
    return { status: 500 as const, error: { message: "Error interno al resolver el esqueleto del cuento", errors: sanityCheck.errors } };
  }

  console.log('Generando el texto completo de cada escena...');
  let storyContent, nodeContents;
  try {
    [storyContent, ...nodeContents] = await Promise.all([
      generateSceneContentWithRetry({ age, history: [], summary: storyBlueprint.summary, isEnding: false, isRoot: true, characters: storyBlueprint.characters }),
      ...nodeBlueprints.map(node => generateSceneContentWithRetry({
        age,
        history: historyBySlug.get(node.slug) ?? [],
        summary: node.summary,
        isEnding: node.options.length === 0,
        isRoot: false,
        characters: storyBlueprint.characters,
      })),
    ]);
  } catch (error) {
    // Por ejemplo, sceneContentSchema rechazando un texto vacío o
    // demasiado corto para alguna escena: mejor fallar aquí que persistir
    // un nodo en blanco (ha llegado a pasar en producción).
    console.error('Fallo generando el contenido de una escena:', error);
    return { status: 400 as const, error: { message: "No se ha podido generar el texto completo de todas las escenas" } };
  }
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

  if (!skipImage) {
    // comenzamos la creación de imágenes con IA
    const imagePrompt = generateImagePrompt({ age, category, sceneText: story.text, characters: story.characters });

    const { isGenerated, error, imageUrl } = await generateImage(imagePrompt);

    if (!isGenerated || !imageUrl) {
      return { status: 400 as const, error };
    }

    // Subimos la imagen a cloudinary. El public_id se deriva de story.slug, así
    // que si 'targetSlug' viene fijado (regenerar en el mismo sitio), esto
    // sobrescribe la imagen anterior en la misma ruta en vez de crear una
    // nueva: la URL de la imagen tampoco cambia.
    const { isUploaded, error: uploadError } = await uploadImage(imageUrl, story.slug);

    if (!isUploaded) {
      return { status: 400 as const, error: uploadError };
    }
  }

  return { status: 200 as const, story, nodes, category, age };
};

const createStory = async (params: { scenario: string, characterOptions: string[], category: string, age: string }) => {
  const result = await generateStoryWithContent(params);
  if (result.status !== 200) return result;
  const { story, nodes, category, age } = result;

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
  return { status: 200 as const, story, nodes, error: undefined };
};

// Sustituye TODO el contenido de un cuento ya publicado (título, texto,
// personajes, nodos, imagen) manteniendo exactamente el mismo slug/URL y el
// mismo 'id' de fila. Pensado para cuentos con el grafo estructuralmente
// roto (enlaces rotos, sin final...) que no se pueden reparar escena a
// escena: en vez de borrar el cuento (lo que rompería la URL ya indexada en
// buscadores) o redirigirlo a otra página (perdiendo ese contenido), se
// genera un cuento nuevo desde cero para la misma categoría/edad y se coloca
// en el mismo sitio exacto donde estaba el roto.
const regenerateStory = async ({ storySlug, scenario, characterOptions, category, age }: { storySlug: string, scenario: string, characterOptions: string[], category: string, age: string }) => {
  const [existing] = await getStoryBySlug(storySlug);
  if (!existing) {
    return { status: 404 as const, error: { message: "No se ha encontrado el cuento a regenerar" } };
  }

  const result = await generateStoryWithContent({ scenario, characterOptions, category, age, targetSlug: storySlug, skipImage: true });
  if (result.status !== 200) return result;
  const { story, nodes } = result;

  console.log('Sustituyendo el cuento en la base de datos...');
  await updateStory(existing.id as number, {
    title: story.title,
    resume: story.resume,
    text: story.text,
    options: JSON.stringify(story.options),
    description: story.meta.description,
    keywords: JSON.stringify(story.meta.keywords),
    categories: JSON.stringify([category]),
    characters: JSON.stringify(story.characters),
    age,
    duration: story.duration || '10-15 minutos',
  });

  await deleteNodesByStoryId(existing.id as number);
  const nodesParams = nodes.map(({ slug, backSlug, text, meta, options }) => ([
    existing.id,
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
  console.log('Cuento regenerado en el mismo slug!!');

  return { status: 200 as const, story, nodes, error: undefined };
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

export { regenerateStory };

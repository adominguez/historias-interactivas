import { type Node, type Option } from "@types"

// Función para verificar la integridad narrativa del grafo generado por la IA
// antes de persistirlo: enlaces rotos, nodos huérfanos, slugs duplicados y
// ausencia de finales.
function validateStoryIntegrity(story: { slug: string; options: Option[] }, nodes: Node[]) {
  const errors = [] as any[];

  // Slugs duplicados entre nodos
  const slugCounts = new Map<string, number>();
  nodes.forEach(node => {
    slugCounts.set(node.slug, (slugCounts.get(node.slug) ?? 0) + 1);
  });
  slugCounts.forEach((count, slug) => {
    if (count > 1) {
      errors.push({ type: "duplicate-slug", slug });
    }
  });

  const slugs = new Set(nodes.map(node => node.slug));
  const slugToOptions = new Map(nodes.map(node => [node.slug, node.options ?? []]));

  // Enlaces rotos: tanto desde las opciones iniciales de la historia como desde cada nodo
  const checkOptions = (fromSlug: string, options: Option[] = []) => {
    options.forEach(option => {
      if (!slugs.has(option.next)) {
        errors.push({
          type: "broken-link",
          currentSlug: fromSlug,
          missingSlug: option.next,
          optionText: option.text,
        });
      }
    });
  };

  checkOptions(story.slug, story.options);
  nodes.forEach(node => checkOptions(node.slug, node.options));

  // Nodos huérfanos: no alcanzables recorriendo el grafo desde la raíz de la historia
  const reachable = new Set<string>();
  const traverse = (options: Option[] = []) => {
    options.forEach(option => {
      if (!slugs.has(option.next) || reachable.has(option.next)) return;
      reachable.add(option.next);
      traverse(slugToOptions.get(option.next));
    });
  };
  traverse(story.options);

  nodes
    .filter(node => !reachable.has(node.slug))
    .forEach(node => errors.push({ type: "orphan-node", slug: node.slug }));

  // Ausencia de finales: ningún nodo sin opciones significa que el cuento nunca termina
  const hasEnding = nodes.some(node => !node.options || node.options.length === 0);
  if (!hasEnding) {
    errors.push({ type: "no-ending" });
  }

  const isValidated = errors.length === 0;

  if (!isValidated) {
    console.log("Se encontraron errores de integridad narrativa:", errors);
  } else {
    console.log("¡Todo está correctamente enlazado!");
  }

  return { isValidated, errors };
}

function slugify(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // quita acentos
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

type RawIndexOption = { text: string; next: number };
type RawNodeBlueprint = { title: string; summary: string; options: RawIndexOption[] };
type RawStoryBlueprint = {
  title: string;
  summary: string;
  options: RawIndexOption[];
  categories: string[];
  characters: { name: string; description: string }[];
  duration: string | null;
};

// La IA ya no inventa slugs de texto: cada opción referencia el nodo al que
// lleva por su ÍNDICE en el array 'nodes' (ver schemas.ts). Esta función:
//  1. Comprueba que todos los índices están dentro de rango (si no, es un
//     fallo real que hay que reintentar, no podemos adivinar la intención).
//  2. Recorre el grafo desde la raíz y descarta en silencio los nodos que
//     nadie referencia — un nodo huérfano no le hace daño a nadie, así que no
//     hace falta rechazar todo el cuento por él.
//  3. Comprueba que quede al menos un final entre los nodos alcanzables.
//  4. Asigna slugs reales de forma determinista a partir de los títulos
//     (con desambiguación si dos títulos generan el mismo slug), calcula el
//     back_slug real de cada nodo a partir de quién lo descubrió primero en
//     el recorrido (no de nada que declare la IA), y de paso calcula el
//     historial de resúmenes de cada camino (para la continuidad narrativa
//     de la pasada 2), todo en el mismo recorrido.
function resolveBlueprint(story: RawStoryBlueprint, nodes: RawNodeBlueprint[]) {
  const isValidIndex = (index: number) => Number.isInteger(index) && index >= 0 && index < nodes.length;

  const invalidIndexErrors: any[] = [];
  const checkIndices = (from: string | number, options: RawIndexOption[]) => {
    options.forEach(option => {
      if (!isValidIndex(option.next)) {
        invalidIndexErrors.push({ type: "invalid-index", from, index: option.next, optionText: option.text });
      }
    });
  };
  checkIndices("story", story.options);
  nodes.forEach((node, index) => checkIndices(index, node.options));

  if (invalidIndexErrors.length > 0) {
    return { ok: false as const, errors: invalidIndexErrors };
  }

  // Recorrido desde la raíz: descubre qué nodos son alcanzables, quién los
  // descubrió primero (su padre real) y el historial de resúmenes hasta ahí.
  const parentOf = new Map<number, "story" | number>();
  const historyByIndex = new Map<number, string[]>();
  const order: number[] = [];
  const visited = new Set<number>();

  const reachedBy = new Map<number, Set<"story" | number>>();

  const enqueue = (fromId: "story" | number, fromHistory: string[], options: RawIndexOption[]) => {
    options.forEach(option => {
      // Un bucle sobre sí mismo (fromId === option.next) ya se rechaza aparte
      // más abajo; no debe contar como una "fuente" extra para la comprobación
      // de convergencia.
      if (fromId === option.next) return;

      const sources = reachedBy.get(option.next) ?? new Set();
      sources.add(fromId);
      reachedBy.set(option.next, sources);

      if (visited.has(option.next)) return;
      visited.add(option.next);
      parentOf.set(option.next, fromId);
      historyByIndex.set(option.next, fromHistory);
      order.push(option.next);
    });
  };

  enqueue("story", [], story.options);
  for (let cursor = 0; cursor < order.length; cursor++) {
    const current = order[cursor];
    const currentHistory = [...(historyByIndex.get(current) ?? []), nodes[current].summary];
    enqueue(current, currentHistory, nodes[current].options);
  }

  if (order.length === 0) {
    return { ok: false as const, errors: [{ type: "no-nodes-reachable" }] };
  }
  if (!order.some(index => nodes[index].options.length === 0)) {
    return { ok: false as const, errors: [{ type: "no-ending" }] };
  }

  // Convergencia: si dos nodos distintos llevan al mismo nodo, ese nodo
  // tendría dos historiales de continuidad diferentes según por dónde se
  // llegue (p. ej. un objeto mencionado en un camino pero no en el otro), y
  // su texto solo puede escribirse pensando en uno de los dos. Todo nuestro
  // modelo (back_slug, historial de resúmenes) asume que cada nodo tiene un
  // único camino de llegada, así que un cuento con convergencia real se
  // rechaza y se reintenta en vez de generar un final que no encaje con
  // alguno de los caminos que llevan a él.
  const convergentNode = order.find(index => (reachedBy.get(index)?.size ?? 0) > 1);
  if (convergentNode !== undefined) {
    return { ok: false as const, errors: [{ type: "convergent-node", node: convergentNode }] };
  }

  // Decisiones de mentira: varias opciones que llevan todas al mismo nodo no
  // rompen el grafo, pero tampoco son una decisión real (el lector acaba en
  // el mismo sitio elija lo que elija). No es un fallo que podamos arreglar
  // solo con código (haría falta inventar un destino nuevo), así que lo
  // tratamos como un fallo de contenido que hay que reintentar.
  const isPointlessChoice = (options: RawIndexOption[]) =>
    options.length > 1 && new Set(options.map(option => option.next)).size === 1;

  if (isPointlessChoice(story.options)) {
    return { ok: false as const, errors: [{ type: "pointless-choice", from: "story" }] };
  }
  const pointlessNode = order.find(index => isPointlessChoice(nodes[index].options));
  if (pointlessNode !== undefined) {
    return { ok: false as const, errors: [{ type: "pointless-choice", from: pointlessNode }] };
  }

  // Bucles: una opción de un nodo que apunta a sí mismo deja al lector
  // exactamente donde ya estaba. Igual que la decisión de mentira, es un
  // fallo de contenido que hay que reintentar, no algo que podamos reparar.
  const selfLoopNode = order.find(index => nodes[index].options.some(option => option.next === index));
  if (selfLoopNode !== undefined) {
    return { ok: false as const, errors: [{ type: "self-loop", node: selfLoopNode }] };
  }

  // Slugs deterministas a partir de los títulos, solo para lo alcanzable.
  const MAX_SLUG_LENGTH = 60;
  const usedSlugs = new Set<string>();
  const slugFor = (title: string) => {
    let base = slugify(title) || "escena";
    if (base.length > MAX_SLUG_LENGTH) {
      base = base.slice(0, MAX_SLUG_LENGTH).replace(/-[^-]*$/, "");
    }
    let candidate = base;
    let suffix = 2;
    while (usedSlugs.has(candidate)) {
      candidate = `${base}-${suffix}`;
      suffix += 1;
    }
    usedSlugs.add(candidate);
    return candidate;
  };

  const storySlug = slugFor(story.title);
  const slugByIndex = new Map(order.map(index => [index, slugFor(nodes[index].title)]));
  const resolveOptions = (options: RawIndexOption[]): Option[] =>
    options.map(({ text, next }) => ({ text, next: slugByIndex.get(next) as string }));

  const resolvedStory = {
    slug: storySlug,
    title: story.title,
    summary: story.summary,
    options: resolveOptions(story.options),
    categories: story.categories,
    characters: story.characters,
    duration: story.duration,
  };

  const historyBySlug = new Map<string, string[]>();
  const resolvedNodes = order.map(index => {
    const slug = slugByIndex.get(index) as string;
    const parent = parentOf.get(index);
    const backSlug = parent === "story" ? storySlug : (slugByIndex.get(parent as number) as string);
    historyBySlug.set(slug, historyByIndex.get(index) ?? []);
    return {
      slug,
      backSlug,
      title: nodes[index].title,
      summary: nodes[index].summary,
      options: resolveOptions(nodes[index].options),
    };
  });

  return { ok: true as const, story: resolvedStory, nodes: resolvedNodes, historyBySlug };
}

function truncateString(input: string | any[], maxLength = 800) {
  if (input.length <= maxLength) {
    return input; // Si el string ya está dentro del límite, se retorna tal cual
  }

  // Cortar el string al límite máximo
  let truncated = input.slice(0, maxLength);

  // Buscar el último espacio antes del límite para no cortar palabras
  const lastSpaceIndex = truncated.lastIndexOf(" ");
  if (lastSpaceIndex > 0) {
    truncated = truncated.slice(0, lastSpaceIndex);
  }

  return truncated + "..."; // Añadir "..." para indicar que el texto fue truncado
}

const LOCAL_STORAGE_KEY = "ratedStories";
export const isBrowser = typeof window !== "undefined";

/**
 * Guarda un cuento valorado en el localStorage
 * @param {string} slug - El identificador único (slug) del cuento.
 * @param {number} rating - La calificación que el usuario dio al cuento.
 */
const saveRatedStory = (slug: string, rating: number) => {
  if (!isBrowser) return; // Verificar entorno cliente

  const ratedStories = JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEY) || "[]");

  const existingStory = ratedStories.find((story: any) => story.slug === slug);

  if (existingStory) {
    existingStory.rating = rating;
  } else {
    ratedStories.push({ slug, rating, date: new Date().toISOString() });
  }

  localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(ratedStories));
};

/**
 * Recupera todos los cuentos valorados del localStorage
 * @returns {Array<{slug: string, rating: number, date: string}>} - Listado de cuentos valorados
 */
const getRatedStories = (): { slug: string; rating: number; date: string }[] => {
  if (!isBrowser) return []; // Verificar entorno cliente

  return JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEY) || "[]");
};

/**
 * Recupera la calificación de un cuento valorado del localStorage
 * @param {string} slug - El identificador único (slug) del cuento.
 */
const getRatedStory = (slug: string) => {
  if (!isBrowser) return; // Verificar entorno cliente

  const ratedStories = JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEY) || "[]");
  const existingStory = ratedStories.find((story: any) => story.slug === slug);

  return existingStory;
}

/**
 * Elimina un cuento valorado del localStorage
 * @param {string} slug - El identificador único (slug) del cuento a eliminar.
 */
const removeRatedStory = (slug: string) => {
  if (!isBrowser) return; // Verificar entorno cliente

  const ratedStories = JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEY) || "[]");
  const updatedStories = ratedStories.filter((story: any) => story.slug !== slug);

  localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updatedStories));
};




export { truncateString, validateStoryIntegrity, resolveBlueprint, saveRatedStory, getRatedStories, removeRatedStory, getRatedStory };
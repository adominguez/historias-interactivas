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




export { truncateString, validateStoryIntegrity, saveRatedStory, getRatedStories, removeRatedStory, getRatedStory };
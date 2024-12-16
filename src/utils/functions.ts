import { type Node, type Option } from "@types"

// Función para verificar integridad del JSON
function validateStoryIntegrity(nodes: Node[]) {
  const slugs = new Set(nodes.map(node => node.slug)); // Conjunto de slugs existentes
  const errors = [] as any[];
  let isValidated = false;

  nodes.forEach(node => {
    if (node.options && node.options.length > 0) {
      node.options.forEach((option) => {
        if (!slugs.has(option.next)) {
          errors.push({
            currentSlug: node.slug,
            missingSlug: option.next,
            optionText: option.text
          });
        }
      });
    }
  });

  if (errors.length > 0) {
    isValidated = false;
    console.log("Se encontraron errores:");
    errors.forEach(error => {
      console.log(
        `En el nodo "${error.currentSlug}" la opción "${error.optionText}" apunta a un slug inexistente: "${error.missingSlug}"`
      );
    });
  } else {
    isValidated = true;
    console.log("¡Todo está correctamente enlazado!");
  }

  return {isValidated};
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

function findExtraNodes(storySlug: string, nodes: any[]) {
  // Crear un Set para almacenar slugs válidos (incluyendo el nodo raíz)
  const validSlugs = new Set();
  validSlugs.add(storySlug); // Nodo raíz del cuento

  // Crear un mapa para relacionar slugs con sus opciones
  const slugToOptions = new Map();
  nodes.forEach(node => {
    slugToOptions.set(node.slug, JSON.parse(node.options || '[]'));
  });

  // Función para recorrer los nodos y agregar slugs válidos
  function traverseNodes(slug: string) {
    if (slugToOptions.has(slug)) {
      const options = slugToOptions.get(slug);
      options.forEach((option: Option) => {
        if (!validSlugs.has(option.next)) {
          validSlugs.add(option.next);
          traverseNodes(option.next); // Recursión
        }
      });
    }
  }

  // Iniciar la validación desde el nodo raíz
  traverseNodes(storySlug);

  // Detectar nodos sobrantes comparando con los válidos
  const extraNodes = nodes.filter(node => !validSlugs.has(node.slug));

  return extraNodes; // Retorna los nodos sobrantes
}


export { truncateString, validateStoryIntegrity, findExtraNodes };
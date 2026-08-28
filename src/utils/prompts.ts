import { AGES } from '@src/utils/characters';

// Pass 1: solo la estructura del grafo (slugs, opciones, resúmenes de escena),
// sin el texto final de cada nodo. Barato de generar y barato de validar antes
// de gastar en texto completo e imagen.
function generateBlueprintPrompt({ scenario, characters, category, age }: { scenario: string, characters: string[], category: string, age: string }) {
  const formattedList = new Intl.ListFormat('es', { style: 'long', type: 'conjunction' });
  const formattedCharacters = formattedList.format(characters);

  const selectedAge = AGES[age as keyof typeof AGES] || AGES["9-12"];

  return `Diseña el ESQUELETO de ${selectedAge.type} interactivo para ${selectedAge.people} de ${selectedAge.alias}. Todavía NO escribas el texto final de cada escena, solo su estructura y un resumen de lo que ocurre en cada una.

  1. **Estructura:**
     - Los personajes principales son ${formattedCharacters}, pero si ves que pueden no tener sentido puedes modificar estos personajes.
     - El escenario del cuento es '${scenario}'.
     - La categoría del cuento es '${category}'.
     - El cuento debe estar dividido en un **inicio**, un **nudo** y un **desenlace**.
     - ¡Muy importante! Sé original, no hagas el típico de encontrar algo eligiendo caminos, por ejemplo podría ser elegir opciones en un diálogo...
     - Puede darse el caso de que los personajes se encuentren con personajes secundarios que también deben tener nombre, pero no deben ser el foco principal de la historia.
     - La trama debe incluir decisiones importantes que lleven a diferentes caminos y nodos finales.
     - El cuento debe tener un mínimo de 3 nodos y un máximo de 8.
     - Cada decisión debe ofrecer un mínimo de 2 opciones y un máximo de 4.
     - El slug de la historia y de cada nodo debe ser descriptivo de lo que ocurre en esa escena concreta. Nunca uses palabras genéricas como "inicio", "cuento" o "nodo" como slug.

  2. **El campo "summary" es el más importante de todos:**
     - Describe en 1-2 frases qué ocurre en esa escena concreta: dónde están los personajes, qué acaba de pasar y qué se plantea a continuación.
     - Nombra explícitamente cualquier objeto, personaje secundario o lugar relevante que aparezca, y usa siempre el mismo nombre exacto si vuelve a aparecer más adelante en ese mismo camino (por ejemplo, si consiguen "una moneda dorada", llámala siempre "la moneda dorada", no "el tesoro" o "la moneda" a secas).
     - Este resumen se usará después para escribir el texto completo de cada escena manteniendo la coherencia con lo que pasó antes en ese camino (mismo escenario, mismos objetos y personajes salvo que la trama cambie explícitamente), así que no lo dejes vago ni genérico.

  3. **Validación de las opciones:**
     - Todas las opciones dentro de 'options' deben apuntar a un slug que exista entre los nodos generados.
     - Cada 'next' debe corresponder a un slug de otro nodo, y ese nodo debe existir.
     - Si el nodo es final, su campo 'options' debe estar vacío ([]).`
}

// Pass 2: el texto completo de UNA escena concreta, ya con el esqueleto
// validado. Recibe el resumen de las escenas anteriores de ese mismo camino
// para mantener la continuidad (escenario, objetos, personajes...).
function generateSceneContentPrompt({ age, history, summary, isEnding }: { age: string, history: string[], summary: string, isEnding: boolean }) {
  const selectedAge = AGES[age as keyof typeof AGES] || AGES["9-12"];

  const historyText = history.length > 0
    ? `Esto es lo que ya ha ocurrido en este camino de la historia, en orden:\n${history.map((line, index) => `${index + 1}. ${line}`).join('\n')}\n\nMantén coherencia total con estos hechos: no los contradigas, no hagas desaparecer objetos o personajes ya mencionados sin explicación, y continúa en el mismo escenario salvo que la trama indique explícitamente un cambio.`
    : 'Esta es la escena inicial del cuento, no hay nada previo que continuar.';

  return `Escribe el texto completo de esta escena de ${selectedAge.type} interactivo para ${selectedAge.people} de ${selectedAge.alias}.

  ${historyText}

  Lo que debe ocurrir en ESTA escena concreta: ${summary}

  Instrucciones:
  - Escribe ${selectedAge.words}, con un lenguaje adecuado para ${selectedAge.people} de ${selectedAge.alias}.
  - NO uses markdown, utiliza las etiquetas HTML <p>, <strong>, <em>... que hagan falta.
  - ${isEnding
      ? 'Esta es una escena final: cierra la historia por completo, sin dejar la sensación de que puede continuar, e incluye una moraleja o reflexión sin remarcar explícitamente que lo es.'
      : 'Termina la escena de forma que las opciones de navegación que vendrán a continuación tengan sentido natural.'}
  - Genera también los metadatos SEO ("meta"): palabras clave, un título breve y una descripción atractiva del contenido de ESTA escena.`
}

export { generateBlueprintPrompt, generateSceneContentPrompt };

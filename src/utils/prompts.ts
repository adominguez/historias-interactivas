function generateStoryPrompt({scenario, characters, category}: {scenario: string, characters: string[], category: string}) {
  const formattedList = new Intl.ListFormat('es', { style: 'long', type: 'conjunction' });
  const formattedCharacters = formattedList.format(characters);
  
  return `Genera un cuento interactivo para niños entre 5 y 8 años con las siguientes características:
  1. **Estructura del cuento:**
     - Los personajes principales son ${formattedCharacters}.
     - El escenario del cuento es '${scenario}'.
     - La categoría del cuento es '${category}'.
     - El cuento debe estar dividido en un **inicio**, un **nudo** y un **desenlace**.
     - ¡Muy importante! Se original, no hagas el típico de encontrar algo eligiendo caminos, por ejemplo podría ser elegir opciones en un diálogo...
     - Cada sección debe contener al menos **300-400 palabras**, con un lenguaje adecuado para niños.
     - La trama debe incluir decisiones importantes que lleven a diferentes caminos y nodos finales.
     - El texto debe estar en HTML utilizando las etiquetas <p>, <strong>, <em>... que sean necesarias.
     - El cuento debe de tener un mínimo de 3 nodos y un máximo de 5.
     - cada decisión puede ofrecer un mínimo de 2 opciones y un máximo de 4.
  
  3. **Validación de las opciones:**
     - Es muy importante que **todas las opciones dentro del campo 'options' deben apuntar a un slug que exista dentro del JSON generado, si esto no funciona bien el cuento no será válido.
     - Cada 'next' debe corresponder a un slug de otro nodo, y ese nodo debe existir.
     - Si el nodo es final, su campo 'options' debe estar vacío ([]).
  
  4. **Moraleja y cierre:**
     - El cuento debe tener un desenlace completo, sin dejar la sensación de que puede continuar.
     - Incluir una moraleja o reflexión en el desenlace para que el lector aprenda algo valioso, no es necesario recalcar en el texto que es una moraleja.`
}

export { generateStoryPrompt };
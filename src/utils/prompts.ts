import { AGES } from '@src/utils/characters';

function generateStoryPrompt({scenario, characters, category, age}: {scenario: string, characters: string[], category: string, age: string}) {
  const formattedList = new Intl.ListFormat('es', { style: 'long', type: 'conjunction' });
  const formattedCharacters = formattedList.format(characters);

  const selectedAge = AGES[age as keyof typeof AGES] || AGES["9-12"];
  
  return `Genera ${selectedAge.type} interactivo para ${selectedAge.people} de ${selectedAge.alias} con las siguientes características:
  1. **Estructura:**
     - Los personajes principales son ${formattedCharacters}, pero si ves que pueden no tener sentido puedes modificar estos personajes.
     - El escenario del cuento es '${scenario}'.
     - La categoría del cuento es '${category}'.
     - El cuento debe estar dividido en un **inicio**, un **nudo** y un **desenlace**.
     - ¡Muy importante! Se original, no hagas el típico de encontrar algo eligiendo caminos, por ejemplo podría ser elegir opciones en un diálogo...
     - Puede darse el caso de que los personajes puedan encontrarse con otros personajes secundarios, pero no deben ser el foco principal de la historia.
     - Puede darse el caso de que los personajes se complementen y puedan enfrentarse entre ellos, por ejemplo, un cazador de brujas y una bruja.
     - Cada sección debe contener de ${selectedAge.words} para que lo entiendan ${selectedAge.people} de ${selectedAge.alias}, con un lenguaje adecuado para ${selectedAge.people} de ${selectedAge.alias}.
     - La trama debe incluir decisiones importantes que lleven a diferentes caminos y nodos finales.
     - El texto debe estar en HTML utilizando las etiquetas <p>, <strong>, <em>... que sean necesarias.
     - El cuento debe de tener un mínimo de 3 nodos y un máximo de 8.
     - cada decisión debe de ofrecer un mínimo de 2 opciones y un máximo de 4.
  
  3. **Validación de las opciones:**
     - Es muy importante que **todas las opciones dentro del campo 'options' deben apuntar a un slug que exista dentro del JSON generado, si esto no funciona bien el cuento no será válido.
     - Cada 'next' debe corresponder a un slug de otro nodo, y ese nodo debe existir.
     - Si el nodo es final, su campo 'options' debe estar vacío ([]).
     - Cada nodo debe de tener asociada una o varias virtudes con una puntuación de 1 a 10 en función del contenido que tenga el nodo.
  
  4. **Moraleja y cierre:**
     - El cuento debe tener un desenlace completo, sin dejar la sensación de que puede continuar.
     - Incluir una moraleja o reflexión en el desenlace para que el lector aprenda algo valioso, no es necesario recalcar en el texto que es una moraleja.`
}

export { generateStoryPrompt };
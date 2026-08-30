import { AGES } from '@src/utils/characters';
import { truncateString } from '@src/utils/functions';

// Pass 1: solo la estructura del grafo (slugs, opciones, resúmenes de escena),
// sin el texto final de cada nodo. Barato de generar y barato de validar antes
// de gastar en texto completo e imagen.
function generateBlueprintPrompt({ scenario, characterOptions, category, age }: { scenario: string, characterOptions: string[], category: string, age: string }) {
  const formattedList = new Intl.ListFormat('es', { style: 'long', type: 'conjunction' });
  const formattedOptions = formattedList.format(characterOptions);

  const selectedAge = AGES[age as keyof typeof AGES] || AGES["9-12"];

  return `Diseña el ESQUELETO de ${selectedAge.type} interactivo para ${selectedAge.people} de ${selectedAge.alias}. Todavía NO escribas el texto final de cada escena, solo su estructura y un resumen de lo que ocurre en cada una.

  1. **Estructura:**
     - Escribe todo (títulos, resúmenes y textos de las opciones) en español, sin mezclar ninguna palabra ni expresión en otro idioma.
     - Estos son los personajes disponibles para este tipo de historia: ${formattedOptions}. Elige entre 2 y 3 que formen un elenco con sentido temático entre sí (el mismo tipo de mundo y de tono) y que encajen con el escenario propuesto. NO mezcles personajes de mundos claramente incompatibles solo porque ambos estaban en la lista (por ejemplo, evita juntar un ser espacial de ciencia ficción con un animal de un bosque mágico sin ninguna explicación). Si ves que ninguna combinación encaja bien, puedes ajustar ligeramente la descripción de alguno para que sí encaje.
     - El escenario del cuento es '${scenario}'.
     - La categoría del cuento es '${category}'.
     - El cuento debe estar dividido en un **inicio**, un **nudo** y un **desenlace**.
     - ¡Muy importante! Sé original: evita que la única mecánica de decisión sea "un cruce con dos caminos físicos". Varía el tipo de decisión entre nodos: puede ser una elección dentro de un diálogo, un dilema moral (a quién ayudar, qué sacrificar), cómo repartir una tarea entre los personajes, a quién creer, o cuándo actuar y cuándo esperar.
     - Puede darse el caso de que los personajes se encuentren con personajes secundarios que también deben tener nombre, pero no deben ser el foco principal de la historia. Si le das un nombre propio a un personaje secundario, usa siempre ESE mismo nombre para referirte a él en el resto del cuento; no le añadas después un apodo o título distinto (por ejemplo, no lo llames "Nimbo" en un resumen y "el Zorro Sabio" en otro, como si fueran cosas distintas).
     - Cada personaje debe tener un género gramatical fijo: femenino o masculino (el español no tiene una forma neutra real para sustantivos como "robot" o "dragón" — si un personaje no tiene género definido en tu cabeza, elige uno de los dos igualmente, no intentes dejarlo ambiguo, porque eso es lo que provoca que el texto alterne sin control entre "el" y "la"). Indícalo explícitamente en su descripción (por ejemplo: "es un dragón, refiérete a él siempre en masculino" o "es una dragona, refiérete a ella siempre en femenino"). Si el nombre del personaje incluye un adjetivo con género (por ejemplo "galáctico"/"galáctica", "misterioso"/"misteriosa"), ese adjetivo debe concordar con el género elegido y escribirse SIEMPRE de esa misma forma, nunca de la otra.
     - Cuidado especial con sustantivos que cambian de significado según su género gramatical (por ejemplo "cometa": "la cometa" es el juguete de papel, "el cometa" es el objeto astronómico). Si usas una de estas palabras, dilo de forma explícita y sin contradicción en la descripción del personaje (por ejemplo "es el cometa, el objeto astronómico masculino, no la cometa de juguete") para no confundir dos personajes distintos en una sola palabra.
     - Todo objeto, misterio o pista importante que introduzcas en el resumen de un nodo debe tener consecuencia más adelante en ESE MISMO camino: o bien se usa, se explica o se resuelve en un nodo posterior, o bien no lo introduzcas. No llenes la historia de elementos "de atrezo" que se mencionan una vez y luego desaparecen sin más: tú planificas el cuento entero de una vez, así que puedes asegurarte de que todo lo que plantas se cosecha.
     - La trama debe incluir decisiones importantes que lleven a diferentes caminos y nodos finales.
     - El cuento debe tener un mínimo de 3 nodos y un máximo de 8.
     - Cada decisión debe ofrecer un mínimo de 2 opciones y un máximo de 4. MUY IMPORTANTE: las distintas opciones de una misma decisión deben llevar a nodos DIFERENTES entre sí (al menos dos destinos distintos). Nunca hagas que todas las opciones de un mismo nodo apunten al mismo índice: si el lector acaba en el mismo sitio elija lo que elija, la decisión no sirve de nada.
     - Ningún nodo puede tener una opción cuyo 'next' sea su propio índice (un nodo nunca se referencia a sí mismo): eso dejaría al lector exactamente donde ya estaba.
     - **Regla de un único padre por nodo (la que más se te olvida, léela dos veces):** cada nodo tiene EXACTAMENTE UN padre — una sola opción, de un solo nodo anterior (o de la propia historia), puede apuntar a él con su 'next'. Antes de dar el esqueleto por terminado, repasa TODAS las opciones de TODOS los nodos y de la historia (todos los 'next' de todo el documento) y comprueba, índice a índice, cuántas veces aparece cada uno como destino: cada índice de 'nodes' debe aparecer como destino EXACTAMENTE UNA VEZ en total sumando todas las opciones del documento entero, nunca dos o más. Es muy tentador cerrar dos caminos distintos en el mismo nodo final para dar sensación de clímax compartido — NO lo hagas, aunque narrativamente te parezca natural: el mismo texto no puede encajar con dos historiales previos distintos a la vez. Si sientes esa tentación, la solución correcta es escribir DOS nodos finales distintos, uno para cada camino (pueden ser parecidos en espíritu — el mismo tipo de desenlace feliz o el mismo giro — pero cada uno mencionando los objetos y hechos concretos de SU propio camino), nunca fusionarlos en uno solo.

  2. **Cómo referenciar los nodos (MUY IMPORTANTE, léelo con cuidado):**
     - NO inventes ningún identificador de texto para los nodos. Los nodos se identifican solo por su POSICIÓN dentro del array 'nodes'.
     - La propia historia (el objeto 'story', con su resumen y sus opciones iniciales) NO forma parte del array 'nodes' y NO tiene índice. El array 'nodes' empieza a contar desde cero para su PRIMER elemento: nodes[0] es el índice 0, nodes[1] es el índice 1, y así sucesivamente. Si generas 5 nodos, sus índices válidos son 0, 1, 2, 3 y 4 (nunca 5).
     - En cada opción ('options'), el campo 'next' debe ser ese NÚMERO de índice dentro de 'nodes' (por ejemplo, next: 2 significa "lleva a nodes[2]", el tercer elemento del array).
     - Esto incluye también las opciones iniciales de la propia historia ('story.options'): igualmente usan 'next' como índice de un elemento de 'nodes', nunca como si la historia misma ocupara el índice 0.
     - Si el nodo es final, su campo 'options' debe estar vacío ([]).

  3. **El campo "summary" es el más importante de todos:**
     - Describe en 1-2 frases qué ocurre en esa escena concreta: dónde están los personajes, qué acaba de pasar y qué se plantea a continuación.
     - Nombra explícitamente cualquier objeto, personaje secundario o lugar relevante que aparezca, y usa siempre el mismo nombre exacto si vuelve a aparecer más adelante en ese mismo camino (por ejemplo, si consiguen "una moneda dorada", llámala siempre "la moneda dorada", no "el tesoro" o "la moneda" a secas).
     - Este resumen se usará después para escribir el texto completo de cada escena manteniendo la coherencia con lo que pasó antes en ese camino (mismo escenario, mismos objetos y personajes salvo que la trama cambie explícitamente), así que no lo dejes vago ni genérico.`
}

// Pass 2: el texto completo de UNA escena concreta, ya con el esqueleto
// validado. Recibe el resumen de las escenas anteriores de ese mismo camino
// para mantener la continuidad (escenario, objetos, personajes...).
function generateSceneContentPrompt({ age, history, summary, isEnding, characters }: { age: string, history: string[], summary: string, isEnding: boolean, characters: { name: string, description: string }[] }) {
  const selectedAge = AGES[age as keyof typeof AGES] || AGES["9-12"];

  const historyText = history.length > 0
    ? `Esto es lo que ya ha ocurrido en este camino de la historia, en orden:\n${history.map((line, index) => `${index + 1}. ${line}`).join('\n')}\n\nMantén coherencia total con estos hechos: no los contradigas, no hagas desaparecer objetos o personajes ya mencionados sin explicación, y continúa en el mismo escenario salvo que la trama indique explícitamente un cambio. Muy importante: NO des por hecho ni menciones como si ya existiera ningún objeto, lugar o personaje que no esté explícitamente en esta lista o en el resumen de esta escena (nada de "la brújula que aún guardaban" si ninguna brújula ha aparecido antes). Si necesitas algo nuevo, preséntalo como algo que aparece ahora por primera vez.`
    : 'Esta es la escena inicial del cuento, no hay nada previo que continuar.';

  const charactersText = characters.length > 0
    ? `Personajes de la historia (manténlos coherentes con esta descripción durante toda la escena: personalidad, forma de hablar, el género gramatical exacto que se indica para cada uno —incluidos los adjetivos que formen parte de su propio nombre, que deben escribirse siempre con la misma terminación de género, nunca alternando—, sin cambiar nada de esto aunque en otra escena se haya usado diferente):\n${characters.map(({ name, description }) => `- ${name}: ${description}`).join('\n')}`
    : '';

  return `Escribe el texto completo de esta escena de ${selectedAge.type} interactivo para ${selectedAge.people} de ${selectedAge.alias}.

  ${charactersText}

  ${historyText}

  Lo que debe ocurrir en ESTA escena concreta: ${summary}

  Instrucciones:
  - Escribe ${selectedAge.words}, con un lenguaje adecuado para ${selectedAge.people} de ${selectedAge.alias}.
  - Escribe todo el texto en español, sin mezclar ninguna palabra ni expresión en otro idioma.
  - NO uses markdown, utiliza las etiquetas HTML <p>, <strong>, <em>... que hagan falta.
  - Los diálogos deben ir siempre integrados en la narración, introducidos con raya (—). NUNCA uses comillas para marcar un diálogo, y NUNCA uses formato de guion de teatro o cine (nombre seguido de dos puntos). Cada línea de diálogo lleva su raya, y quién habla se indica UNA sola vez por línea (puede ir antes o después del diálogo, como prefieras, pero nunca las dos veces a la vez ni repetida al final). Antes de dar una línea de diálogo por terminada, comprueba mentalmente que no has mencionado quién habla dos veces.
  - Usa solo palabras reales del español; si dudas de si una palabra existe, usa una más sencilla y común en su lugar.
  - Prioriza SIEMPRE la claridad sobre el adorno poético. Evita metáforas o personificaciones vacías que no signifiquen nada concreto, del tipo "la hierba canta con la brisa", "el camino se siente claro", "una voz hecha de viento y campanillas" o "el Arco se inclina ante la paciencia". Si una frase suena bonita pero no podrías explicar con palabras sencillas qué significa o qué aporta a la historia, no la escribas: cuenta lo mismo de forma directa y concreta.
  - Cuando un personaje hable, sus palabras deben decir algo claro y accionable (una idea, una pista, una decisión), nunca una frase ambigua tipo acertijo poético que no se entiende.
  - No empieces la escena con una descripción genérica del paisaje fusionándose con el cielo o la naturaleza "cantando" o "respirando" (evita fórmulas como "el cielo parece derretirse en oro"). Empieza con algo concreto: una acción, un diálogo, o un detalle específico y distinto del lugar.
  - ${isEnding
      ? 'Esta es una escena final: cierra la historia por completo, sin dejar la sensación de que puede continuar, e incluye una moraleja o reflexión sin remarcar explícitamente que lo es.'
      : 'Termina la escena dejando la decisión planteada de forma natural dentro de la narración (por ejemplo, con una duda, una encrucijada o una pregunta). NO describas ni enumeres las opciones concretas en el texto (nada de "Opción A", "Opción B" ni listas de alternativas): esas opciones ya se muestran aparte, en botones, justo debajo del texto.'}
  - Genera también los metadatos SEO ("meta"): palabras clave, un título breve y una descripción atractiva del contenido de ESTA escena.`
}

// Estilos de ilustración por franja de edad. Antes se usaba literalmente el
// mismo estilo ("Ilustración 3D... colores brillantes y texturas suaves")
// para TODAS las edades, incluida 18+ — de ahí que las portadas de historias
// para adultos parecieran hechas para niños pequeños. Varios estilos por
// franja, elegidos al azar, también evitan que todas las portadas de la
// misma edad salgan con el mismo aspecto genérico de IA.
const IMAGE_STYLES: Record<string, string[]> = {
  "3-4": [
    "ilustración de cuento infantil en acuarela suave, formas redondeadas y amigables, colores pastel cálidos",
    "estilo diorama de fieltro y papel recortado (papercraft), texturas artesanales suaves, colores tiernos",
    "ilustración digital estilo libro de cartón para bebés, trazos simples y limpios, colores vivos pero suaves",
  ],
  "5-8": [
    "ilustración de cuento infantil con acuarela y tinta, colores vivos y alegres, personajes expresivos",
    "ilustración 3D estilo animación familiar, colores brillantes, iluminación cálida y acogedora",
    "estilo papercraft en capas (diorama de papel), luz cálida, colores saturados y divertidos",
  ],
  "9-12": [
    "ilustración de aventuras estilo libro ilustrado juvenil, colores vívidos, composición dinámica",
    "ilustración digital semirrealista con un toque de fantasía, iluminación dramática pero amigable",
    "estilo cómic de aventuras clásico, líneas marcadas, paleta de color vibrante",
  ],
  "13-18": [
    "ilustración digital estilo portada de novela juvenil (young adult), iluminación cinematográfica, paleta de color sofisticada y con contraste",
    "arte estilo anime o manga moderno, composición dinámica, sombras marcadas",
    "pintura digital semirrealista con atmósfera evocadora, colores profundos y saturados",
  ],
  "18+": [
    "ilustración pictórica realista al estilo de portada de novela para adultos, iluminación cinematográfica dramática, atmósfera seria, sin ningún elemento infantil",
    "pintura digital oscura y atmosférica, alto contraste, paleta de color madura y sobria, sin ningún elemento infantil",
    "ilustración editorial sofisticada al estilo de una revista literaria, texturas ricas, tono serio y adulto, sin ningún elemento infantil",
  ],
};

// Reparación puntual de una escena ya publicada que ha sido detectada con un
// problema de contenido concreto (diálogo con formato de guion y/o palabras
// inválidas). A diferencia de generateSceneContentPrompt, aquí NO se genera
// contenido nuevo: se le da al modelo el texto original completo y se le
// pide que lo reescriba corrigiendo solo lo señalado, preservando hechos,
// personajes y estructura, para minimizar el riesgo de introducir una
// inconsistencia nueva en un cuento que ya está publicado.
function generateRepairPrompt({ age, text, characterNames, issues }: { age: string, text: string, characterNames: string[], issues: { invalidWords: string[], isScreenplayStyle: boolean } }) {
  const selectedAge = AGES[age as keyof typeof AGES] || AGES["9-12"];

  const reasons = [
    issues.isScreenplayStyle && 'El diálogo está escrito con formato de guion de teatro/cine (el nombre de un personaje seguido directamente de ":" o "—"). Reescribe cada línea de diálogo integrada en la narración, introducida con raya (—), indicando quién habla UNA sola vez por línea (antes o después del diálogo, nunca las dos veces a la vez ni repetido al final).',
    issues.invalidWords.length > 0 && `Contiene palabras que no existen en español o están en otro idioma: ${issues.invalidWords.join(', ')}. Sustitúyelas por palabras reales y sencillas en español que tengan sentido en ese punto de la frase.`,
  ].filter(Boolean).join('\n  - ');

  return `Esta es una escena ya publicada de ${selectedAge.type} interactivo para ${selectedAge.people} de ${selectedAge.alias} que tiene un problema concreto que hay que corregir:

  - ${reasons}

  Texto actual de la escena:
  """
  ${text}
  """

  Personajes de la historia (deben seguir apareciendo exactamente igual: mismo nombre y mismo género gramatical que ya tenían): ${characterNames.join(', ') || '(sin personajes con nombre propio en esta escena)'}.

  Reescribe el texto COMPLETO de la escena corrigiendo SOLO el/los problema(s) indicado(s) arriba. Esto es una corrección puntual, no una reescritura creativa: mantén exactamente los mismos hechos, personajes, objetos, el contenido de los diálogos y la estructura narrativa del texto original, sin añadir ni eliminar ningún acontecimiento. Usa el mismo formato HTML (<p>, <strong>, <em>...) que el original. Escribe todo en español.`
}

// Párrafo de apertura por franja de edad: fija la intensidad y el tono
// general de la imagen. Antes esto no variaba en absoluto (mismo prompt
// genérico para 3-4 y para 18+), lo que junto con el estilo plano
// producía portadas muy genéricas y "de IA" y, en 18+, con aspecto
// infantil. La energía "espectacular y cinematográfica" de 9-12/13-18 se
// suaviza para 3-4/5-8 y se vuelve seria (sin nada infantil) para 18+.
const AGE_INTROS: Record<string, string> = {
  "3-4": "Ilustración de cuento para los más pequeños, cálida, amable y reconfortante, con calidad de libro ilustrado infantil de alta gama. Crea una escena tierna y acogedora, llena de curiosidad y ternura, siempre suave y nunca intensa ni inquietante.",
  "5-8": "Ilustración editorial para cuento infantil, vívida y llena de vida, con calidad de portada de libro ilustrado premium. Crea una escena alegre, llena de aventura y sensación de descubrimiento, siempre amigable para niños.",
  "9-12": "Ilustración editorial de fantasía, espectacular y cinematográfica, con calidad de portada de libro ilustrado premium. Crea una escena visualmente impactante, llena de aventura, magia y sensación de descubrimiento.",
  "13-18": "Ilustración editorial juvenil, espectacular y cinematográfica, con calidad de portada de novela young adult. Crea una escena visualmente impactante, con emoción, tensión narrativa y sensación de descubrimiento, con un tono algo más maduro pero siempre apropiado para adolescentes.",
  "18+": "Ilustración editorial madura, cinematográfica y con calidad de portada de novela para adultos. Crea una escena visualmente impactante y con peso dramático real, sin ningún elemento infantil, manteniendo un tono serio y sofisticado.",
};

// Ánimo por categoría: una historia de 'horror'/'fear' no debería tener la
// misma atmósfera visual que una de 'princesses' o 'christmas' aunque
// compartan la misma franja de edad. Las claves coinciden con
// src/data/categories.ts.
const CATEGORY_MOODS: Record<string, string> = {
  "fantasy": "magia, mundos fantásticos y seres extraordinarios",
  "adventures": "aventura, exploración y descubrimiento de lo desconocido",
  "mystery": "misterio, pistas ocultas e intriga por resolver",
  "science-fiction": "tecnología asombrosa, mundos futuristas y maravilla espacial",
  "christmas": "calidez navideña, nieve, luces y magia festiva",
  "halloween": "misterio divertido y festivo, calabazas y un toque travieso de suspense",
  "princesses": "elegancia, castillos y cuentos de realeza",
  "animals": "ternura, naturaleza y conexión con el mundo animal",
  "horror": "suspense y tensión atmosférica",
  "love": "calidez emocional, vínculos y momentos entrañables",
  "fear": "misterio y tensión, superando lo desconocido con valentía",
  "values": "superación personal, generosidad y aprendizaje",
  "superheroes": "acción heroica, poder y determinación",
  "pirates": "aventura marítima, tesoros y mundos por descubrir",
  "mythology": "grandiosidad épica, dioses y templos antiguos",
  "history": "ambientación histórica auténtica y sentido de época",
};

// 'horror'/'fear' combinado con una edad pequeña NO es "suspense real +
// tono suave" sin más: combinar ambos a ciegas seguiría pudiendo dar una
// imagen demasiado intensa para un niño de 3-8 años. Aquí se sustituye el
// ánimo de categoría entero por una versión explícitamente desdramatizada.
const GENTLE_SCARY_OVERRIDE = "Aunque la categoría es de misterio/miedo, para esta edad el tono debe ser un misterio simpático y divertido, como una casa encantada de dibujos animados — nunca terrorífico de verdad, sin monstruos amenazantes ni imágenes que puedan asustar a un niño pequeño.";

// Núcleo fijo de composición/iluminación/fidelidad, igual para todas las
// combinaciones de edad y categoría: es la parte que ataca directamente el
// aspecto "genérico de IA" (composiciones planas, personajes posando,
// fondos vacíos) detectado en las primeras portadas generadas.
const IMAGE_PROMPT_CORE = `Interpreta la escena proporcionada y sintetízala en UN único momento visual poderoso. No intentes representar literalmente cada frase, diálogo o acción descrita: identifica el elemento más extraordinario de la escena y conviértelo en el foco principal de la composición.

La imagen debe tener una composición cinematográfica clara, con profundidad mediante primer plano, plano medio y fondo; escenario amplio y memorable; personajes integrados de forma natural en el entorno; sensación de escala; perspectiva dinámica y una lectura visual inmediata.

Usa iluminación narrativa: luz volumétrica, contraluces suaves, reflejos y partículas ambientales cuando tenga sentido, dirigiendo la mirada hacia el elemento protagonista.

Los personajes deben ser expresivos, carismáticos y claramente reconocibles, respetando estrictamente la descripción proporcionada de cada uno (especie, género, personalidad y rasgos esenciales). Sus poses y expresiones deben contar parte de la historia incluso sin leer el texto.

Prioriza: una silueta y un foco visual memorables; escenarios mucho más grandes que los personajes cuando la escena lo permita; magia o fenómenos visibles mediante luz o elementos fantásticos cuando encajen con la categoría; composición asimétrica y dinámica en vez de personajes posando; profundidad atmosférica; emoción y asombro.`;

// Para 3-4, "acuarela lavada"/"pastel sin contraste"/"estética infantil" es
// justo el aspecto que se busca (ver IMAGE_STYLES), así que esas dos
// entradas de la lista de "evitar" no aplican en esa franja; el resto
// (nada de texto, nada realmente aterrador) sí se mantiene siempre.
function buildAvoidList(age: string): string {
  const items = [
    "composiciones planas",
    "personajes alineados mirando a cámara",
    "fondos vacíos",
    "apariencia de clipart",
    "render 3D genérico",
    "exceso de elementos compitiendo entre sí",
    "cualquier representación que pueda resultar aterradora o inapropiada para niños",
  ];
  if (age !== "3-4") {
    items.push("acuarela muy lavada o colores pastel sin contraste", "estética excesivamente infantil o caricaturesca");
  }
  return `Evita: ${items.join(", ")}. No añadas texto, letras, títulos, marcos, logotipos ni elementos de interfaz dentro de la imagen.`;
}

function generateImagePrompt({ age, category, sceneText, characters }: { age: string, category: string, sceneText: string, characters: { name: string, description: string }[] }) {
  const ageIntro = AGE_INTROS[age] ?? AGE_INTROS["9-12"];
  const styles = IMAGE_STYLES[age] ?? IMAGE_STYLES["9-12"];
  const style = styles[Math.floor(Math.random() * styles.length)];

  const isGentleScaryAge = age === "3-4" || age === "5-8";
  const isScaryCategory = category === "horror" || category === "fear";
  const categoryMood = isScaryCategory && isGentleScaryAge
    ? GENTLE_SCARY_OVERRIDE
    : `Ambiente narrativo de la categoría: ${CATEGORY_MOODS[category] ?? "aventura y descubrimiento"}.`;

  const plainSceneText = sceneText.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  const charactersText = characters.map(({ name, description }) => `${name}: ${description}`).join(', ');

  return `${ageIntro}

${categoryMood}

Estética: ${style}.

${IMAGE_PROMPT_CORE}

${buildAvoidList(age)}

Escena: ${truncateString(plainSceneText, 900)}

Personajes: ${charactersText}`;
}

export { generateBlueprintPrompt, generateSceneContentPrompt, generateRepairPrompt, generateImagePrompt };

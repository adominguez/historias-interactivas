import { z } from 'zod';
import { setupCategories } from '@src/data/categories'

// const virtues = [
//   "valentía",
//   "cautela",
//   "generosidad",
//   "compasión",
//   "astucia",
//   "lealtad",
//   "sabiduría",
//   "paciencia",
//   "determinación",
//   "honestidad",
//   "humildad",
//   "justicia",
//   "perseverancia",
//   "compromiso",
//   "integridad",
//   "empatía",
//   "carisma",
//   "creatividad",
//   "confianza",
//   "autocontrol",
//   "gratitud",
//   "resiliencia",
//   "curiosidad",
//   "tolerancia",
//   "esperanza"
// ]

// Esquema para las virtudes
// Virtue debe ser una de las virtudes definidas
// const virtueSchema = z.object({
//   virtue: z.enum(virtues as [string, ...string[]]).describe("Virtud"),
//   score: z.number().int().min(1).max(10).describe("Puntuación de la virtud"),
// });


// Esquema para las opciones de navegación del esqueleto: 'next' es el ÍNDICE
// (posición en el array 'nodes') del nodo al que lleva la opción, no un slug
// de texto. Pedirle a la IA que invente un slug y lo repita carácter por
// carácter en varios sitios del JSON es la fuente más habitual de cuentos
// rotos (enlaces a slugs inexistentes, slugs duplicados); referenciar por
// índice numérico es una tarea mucho más mecánica y fiable para el modelo.
// Los slugs de verdad se calculan de forma determinista en el código a
// partir del título, una vez resuelto el grafo (ver buildAncestorSummaries
// y resolveBlueprint en utils/functions.ts).
const indexOptionSchema = z.object({
  text: z.string().describe("Texto de la opción"),
  next: z.number().int().min(0).describe("Índice (empezando en 0) del nodo del array 'nodes' al que lleva esta opción"),
});

// Esquema para los personajes
const characterSchema = z.object({
  name: z.string().describe("Nombre PROPIO del personaje (por ejemplo 'Kai', 'Mila', 'Toby'), inventado por ti y adecuado al tono del cuento — NUNCA el arquetipo o descriptor genérico de la lista de personajes disponibles (nunca uses literalmente 'Zorro de las sombras' o 'Guardiana de la estrella' como nombre: eso es su especie/rol, que va en 'description', no su nombre)."),
  description: z.string().describe("Descripción del personaje: qué es (su especie/arquetipo, tomado de la lista de personajes disponibles), aspecto, personalidad, y su género gramatical fijo (femenino o masculino; el español no tiene una forma neutra real para sustantivos como 'robot' o 'dragón', así que hay que elegir uno de los dos), que debe mantenerse igual en todo el cuento, incluidos los adjetivos que formen parte de su propio nombre."),
});

// Esquema para los metadatos
const metaSchema = z.object({
  keywords: z.array(z.string()).describe("Palabras clave relacionadas con el nodo"),
  title: z.string().describe("Título breve y descriptivo para SEO del nodo"),
  description: z.string().describe("Descripción atractiva que resuma el contenido del nodo"),
}).describe("Metadatos del nodo, necesarios para SEO");

const categoriesEnum = z.enum(Object.keys(setupCategories) as [string, ...string[]]);

// Pass 1 (esqueleto): solo estructura del grafo y un resumen de continuidad
// por escena, sin el texto final. Se valida la integridad del grafo con esto
// antes de gastar en generar texto completo o imagen.
const nodeBlueprintSchema = z.object({
  title: z.string().describe("Título breve del nodo"),
  summary: z.string().describe("Resumen de continuidad de 1-2 frases: qué ocurre en esta escena, y qué objetos/personajes/lugares relevantes aparecen, nombrados de forma exacta y reutilizable."),
  options: z.array(indexOptionSchema).describe("Opciones de navegación. Vacío ([]) si el nodo es un final."),
});

const storyBlueprintSchema = z.object({
  title: z.string().describe("Título del cuento"),
  summary: z.string().describe("Resumen de continuidad de 1-2 frases de la escena inicial, con los mismos criterios que el de los nodos."),
  options: z.array(indexOptionSchema).describe("Opciones de navegación iniciales"),
  categories: z.array(categoriesEnum).describe("Categorías relacionadas con el cuento"),
  characters: z.array(characterSchema).describe("Lista de personajes"),
  duration: z.string().nullable().describe("Duración estimada en minutos"),
});

const blueprintSchema = z.object({
  story: storyBlueprintSchema,
  nodes: z.array(nodeBlueprintSchema),
});

// Pass 2 (contenido): el texto completo de una única escena, generado ya con
// el esqueleto validado y el historial de resúmenes de su camino como contexto.
const sceneContentSchema = z.object({
  // Mínimo defensivo: sin él, un texto vacío ("") pasa la validación de
  // estructura sin problema y el nodo se persiste en blanco (ha pasado de
  // verdad en producción). No garantiza calidad, solo que no esté vacío.
  text: z.string().min(30).describe("Texto en formato HTML, usar etiquetas como <p>, <strong>, <em>... Todo lo que se necesite"),
  meta: metaSchema, // Metadatos de la escena, necesarios para SEO
});

const storyContentSchema = sceneContentSchema.extend({
  resume: z.string().min(10).describe("Resumen atractivo del cuento completo, para mostrar en las tarjetas de la biblioteca"),
});

// Reparación de una escena ya publicada: solo el texto corregido, sin tocar
// metadatos SEO ni ningún otro campo (es una corrección puntual, no una
// regeneración completa).
const repairedTextSchema = z.object({
  text: z.string().min(30).describe("Texto en formato HTML, usar etiquetas como <p>, <strong>, <em>... Todo lo que se necesite"),
});

// Diagnóstico de coherencia del reparto de un cuento ya publicado. A
// diferencia del resto de comprobaciones (grafo, diálogo, ortografía), esto
// es un juicio semántico que no se puede resolver con una regla
// determinista, así que necesita una llamada a IA de solo lectura.
const castCoherenceSchema = z.object({
  coherent: z.boolean().describe("Si el reparto de personajes tiene sentido temático en conjunto (mismo tipo de mundo y tono) para este cuento"),
  outlierCharacters: z.array(z.string()).describe("Nombres exactos (tal cual aparecen en el reparto) de los personajes que no encajan con el resto. Vacío si 'coherent' es true."),
  reason: z.string().describe("Explicación breve (1-2 frases) del veredicto"),
});

// Diagnóstico de coherencia NARRATIVA de un cuento completo (todos sus
// caminos a la vez), no de una escena suelta: terminología que cambia sin
// explicación, frases que suenan profundas pero no dicen nada concreto, y
// opciones que prometen algo distinto de lo que ocurre en la escena a la
// que llevan. Es un juicio de lectura comprensiva, no una regla mecánica,
// así que necesita una llamada a IA (ver utils/coherenceCheck.ts).
const storyCoherenceIssueSchema = z.object({
  location: z.string().describe("Dónde ocurre el problema: 'story' para la escena raíz, o el slug exacto del nodo donde se nota o se origina."),
  description: z.string().describe("Explicación breve y concreta del problema, citando la frase exacta cuando ayude a localizarlo."),
});

const storyCoherenceSchema = z.object({
  coherent: z.boolean().describe("Si el cuento, leído de principio a fin en todos sus caminos, tiene sentido narrativo y lógico"),
  issues: z.array(storyCoherenceIssueSchema).describe("Problemas de coherencia narrativa encontrados. Vacío si 'coherent' es true."),
});

export { blueprintSchema, sceneContentSchema, storyContentSchema, repairedTextSchema, castCoherenceSchema, storyCoherenceSchema };
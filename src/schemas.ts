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
  name: z.string().describe("Nombre del personaje"),
  description: z.string().describe("Descripción del personaje: aspecto, personalidad, y su género gramatical fijo (femenino, masculino o neutro), que debe mantenerse igual en todo el cuento."),
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
  text: z.string().describe("Texto en formato HTML, usar etiquetas como <p>, <strong>, <em>... Todo lo que se necesite"),
  meta: metaSchema, // Metadatos de la escena, necesarios para SEO
});

const storyContentSchema = sceneContentSchema.extend({
  resume: z.string().describe("Resumen atractivo del cuento completo, para mostrar en las tarjetas de la biblioteca"),
});

export { blueprintSchema, sceneContentSchema, storyContentSchema };
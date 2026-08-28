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


// Esquema para las opciones de navegación
const optionSchema = z.object({
  text: z.string().describe("Texto de la opción"),
  next: z.string().describe("Slug del siguiente nodo formateado como 'slug-nodo'"),
});

// Esquema para los personajes
const characterSchema = z.object({
  name: z.string().describe("Nombre del personaje"),
  description: z.string().describe("Descripción del personaje, aspecto, personalidad..."),
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
  slug: z.string().describe("Slug único del nodo"),
  backSlug: z.string().nullable().describe("Slug del nodo anterior"),
  title: z.string().describe("Título breve del nodo"),
  summary: z.string().describe("Resumen de continuidad de 1-2 frases: qué ocurre en esta escena, y qué objetos/personajes/lugares relevantes aparecen, nombrados de forma exacta y reutilizable."),
  options: z.array(optionSchema).describe("Opciones de navegación. Vacío ([]) si el nodo es un final."),
});

const storyBlueprintSchema = z.object({
  slug: z.string().describe("Slug único del cuento formato titulo-del-cuento"),
  title: z.string().describe("Título del cuento"),
  summary: z.string().describe("Resumen de continuidad de 1-2 frases de la escena inicial, con los mismos criterios que el de los nodos."),
  options: z.array(optionSchema).describe("Opciones de navegación iniciales"),
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
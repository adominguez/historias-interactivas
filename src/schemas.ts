import { z } from 'zod';
import { setupCategories } from '@src/data/categories'

const virtues = [
  "valentía",
  "cautela",
  "generosidad",
  "compasión",
  "astucia",
  "lealtad",
  "sabiduría",
  "paciencia",
  "determinación",
  "honestidad",
  "humildad",
  "justicia",
  "perseverancia",
  "compromiso",
  "integridad",
  "empatía",
  "carisma",
  "creatividad",
  "confianza",
  "autocontrol",
  "gratitud",
  "resiliencia",
  "curiosidad",
  "tolerancia",
  "esperanza"
]

// Esquema para las virtudes
// Virtue debe ser una de las virtudes definidas
const virtueSchema = z.object({
  virtue: z.enum(virtues as [string, ...string[]]).describe("Virtud"),
  score: z.number().int().min(1).max(10).describe("Puntuación de la virtud"),
});


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

// Esquema para cada nodo
const nodeSchema = z.object({
  slug: z.string().describe("Slug único del nodo"),
  backSlug: z.string().optional().describe("Slug del nodo anterior"),
  title: z.string().describe("Título del nodo"),
  text: z.string().describe("Texto en formato HTML, usar etiquetas como <p>, <strong>, <em>... Todo lo que se necesite"),
  // virtues: z.array(virtueSchema),
  options: z.array(optionSchema).optional(), // Opcional si no hay opciones (nodo final)
  meta: metaSchema, // Metadatos del nodo
});

const categoriesEnum = z.enum(Object.keys(setupCategories) as [string, ...string[]]);

// Esquema para la historia principal
const storySchema = z.object({
  slug: z.string().describe("Slug único del cuento formato titulo-del-cuento"),
  title: z.string().describe("Título del cuento"),
  resume: z.string().describe("Resumen del cuento"),
  meta: metaSchema, // Metadatos del cuento
  text: z.string().describe("Texto principal del cuento"),
  options: z.array(optionSchema), // Opciones iniciales
  categories: z.array(categoriesEnum).describe("Categorías relacionadas con el cuento"),
  characters: z.array(characterSchema).describe("Lista de personajes"),
  duration: z.string().optional().describe("Duración estimada en minutos"),
});

// Esquema completo
const fullSchema = z.object({
  story: storySchema,
  nodes: z.array(nodeSchema),
});

export { fullSchema };
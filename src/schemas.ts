import { z } from 'zod';

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
  keywords: z.array(z.string()).describe("Palabras clave del contenido"),
  title: z.string().describe("Título para SEO"),
  description: z.string().describe("Descripción para SEO"),
});

// Esquema para cada nodo
const nodeSchema = z.object({
  slug: z.string().describe("Slug único del nodo"),
  backSlug: z.string().optional().describe("Slug del nodo anterior"),
  title: z.string().describe("Título del nodo"),
  text: z.string().describe("Texto en formato HTML, usar etiquetas como <p>, <strong>, <em>... Todo lo que se necesite"),
  options: z.array(optionSchema).optional(), // Opcional si no hay opciones (nodo final)
  meta: metaSchema, // Metadatos del nodo
});

const categoriesEnum = z.enum([
  "medieval",
  "fantasy",
  "futurist",
  "mythologycal",
  "terror",
  "animals",
  "halloween",
  "christmas",
  "pirates",
  "valentin",
  "summer",
  "comedy",
]);

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
  duration: z.number().optional().describe("Duración estimada en minutos"),
});

// Esquema completo
const fullSchema = z.object({
  story: storySchema,
  nodes: z.array(nodeSchema),
});

export { fullSchema };
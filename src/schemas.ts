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
  text: z.string().describe("Texto en formato HTML"),
  options: z.array(optionSchema).optional(), // Opcional si no hay opciones (nodo final)
  meta: metaSchema, // Metadatos del nodo
});

const categoriesEnum = z.enum([
  "Fantasía",
  "Aventura",
  "Cuentos Clásicos",
  "Cuentos Infantiles",
  "Misterio",
  "Terror Ligero",
  "Comedia",
  "Educativos",
  "Ciencia Ficción",
  "Historias Medievales",
  "Fábulas",
  "Mitología",
  "Inspiración",
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
});

// Esquema completo
const fullSchema = z.object({
  story: storySchema,
  nodes: z.array(nodeSchema),
});

function generateStorySetup() {
  // Categorías con personajes expandidos
  const categories = {
    medieval: [
      "Caballero", "Princesa", "Dragón", "Bruja", "Rey", "Reina", "Guerrero", "Arquero",
      "Troll", "Duende", "Noble", "Juglar", "Monje", "Sirviente", "Alquimista",
      "Espadachín", "Ermitaño", "Hechicero", "Cazador", "Centauro"
    ],
    fantasy: [
      "Hada", "Unicornio", "Elfo", "Gnomo", "Ser del bosque", "Ninfa", "Dragón bebé",
      "Sirena", "Pegaso", "Fénix", "Genio de la lámpara", "Ser de las sombras", "Quimera",
      "Hombre lobo", "Vampiro", "Ángel", "Demonio", "Esfinge", "Tritón", "Ser de agua"
    ],
    futuristic: [
      "Robot", "Científico loco", "Extraterrestre", "Astronauta", "Navegante del tiempo",
      "Inventor del futuro", "Inteligencia artificial", "Cazador de estrellas",
      "Capitán espacial", "Alienígena amistoso", "Explorador intergaláctico", "Cyborg",
      "Ingeniero espacial", "Comerciante cósmico", "Botánicas espaciales", "Androide rebelde",
      "Médico estelar", "Guardián del universo", "Minero espacial", "Supervisor de naves"
    ],
    animals: [
      "Gato mágico", "Perro leal", "Tortuga sabia", "Panda amable", "León valiente",
      "Mono travieso", "Zorro astuto", "Delfín juguetón", "Oveja soñadora", "Pingüino aventurero",
      "Flamenco elegante", "Murciélago nocturno", "Castor constructor", "Koala pacífico",
      "Ardilla veloz", "Tigre misterioso", "Pájaro del trueno", "Rana mágica",
      "Pavo real orgulloso", "Caracol parlante"
    ],
    mythological: [
      "Minotauro", "Medusa", "Dios del trueno", "Genio de la lámpara", "Quimera", "Pegaso",
      "Esfinge", "Héroe mitológico", "Tritón", "Dios de la sabiduría", "Semidiós",
      "Dragón del hielo", "Fénix renacido", "Ninfa del bosque", "Centauro protector",
      "Titán", "Hada de la luz", "Gigante del valle", "Kraken", "Espíritu del fuego"
    ],
  };

  // Lista ampliada de escenarios
  const scenarios = [
    "Bosque encantado", "Castillo medieval", "Ciudad futurista", "Nave espacial",
    "Valle de los dragones", "Biblioteca mágica", "Pantano venenoso",
    "Planeta alienígena", "Mercado flotante", "Cueva subterránea",
    "Isla de las sirenas", "Volcán activo", "Templo antiguo", "Jardín encantado",
    "Palacio helado", "Ruinas antiguas", "Ciudad submarina", "Montaña prohibida",
    "Lago de los deseos", "Isla flotante"
  ];

  // Seleccionar un escenario aleatorio
  const randomScenario = scenarios[Math.floor(Math.random() * scenarios.length)];

  // Determinar categoría según el escenario
  let category;
  if (randomScenario.includes("medieval") || randomScenario.includes("castillo")) {
    category = "medieval";
  } else if (randomScenario.includes("futurista") || randomScenario.includes("espacial")) {
    category = "futuristic";
  } else if (randomScenario.includes("encantado") || randomScenario.includes("dragones")) {
    category = "fantasy";
  } else if (randomScenario.includes("pantano") || randomScenario.includes("sirenas")) {
    category = "animals";
  } else {
    category = "mythological";
  }

  // Seleccionar entre 2 y 3 personajes compatibles
  const characters = categories[category]
    .sort(() => 0.5 - Math.random())
    .slice(0, Math.random() < 0.5 ? 2 : 3);

  return { scenario: randomScenario, characters };
}

export { fullSchema };

// Categorías con personajes expandidos
const categories: { [key: string]: string[] } = {
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

function generateStorySetup() {

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

function truncateString(input: string | any[], maxLength = 800) {
  if (input.length <= maxLength) {
    return input; // Si el string ya está dentro del límite, se retorna tal cual
  }

  // Cortar el string al límite máximo
  let truncated = input.slice(0, maxLength);

  // Buscar el último espacio antes del límite para no cortar palabras
  const lastSpaceIndex = truncated.lastIndexOf(" ");
  if (lastSpaceIndex > 0) {
    truncated = truncated.slice(0, lastSpaceIndex);
  }

  return truncated + "..."; // Añadir "..." para indicar que el texto fue truncado
}

export { generateStorySetup, truncateString };
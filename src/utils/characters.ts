interface Category {
  [key: string]: {
    characters: string[];
    scenarios: string[];
  }
}

const sexos: { [key: string]: string } = {
  "Niño": "masculino",
  "Niña": "femenino",
  "Caballero": "masculino",
  "Princesa": "femenino",
  "Principe": "masculino",
  "Bruja": "femenino",
  "Brujo": "masculino",
  "Hombre lobo": "masculino",
  "Rey": "masculino",
  "Reina": "femenino",
  "Guerrero": "masculino",
  "Monje": "masculino",
  "Hada": "femenino",
  "Ninfa": "femenino",
  "Sirena": "femenino",
  "Fénix": "masculino",
  "Quimera": "femenino",
  "Ángel": "masculino",
  "Demonio": "masculino",
  "Esfinge": "femenino",
  "Tritón": "masculino",
  "Tortuga sabia": "femenino",
  "Oveja soñadora": "femenino",
  "Minotauro": "masculino",
  "Medusa": "femenino",
  "Dios del trueno": "masculino",
  "Dios de la sabiduría": "masculino",
  "Fénix renacido": "masculino",
  "Ninfa del bosque": "femenino",
  "Titán": "masculino",
  "Hada de la luz": "femenino",
  "Gigante del valle": "masculino",
  "Kraken": "masculino",
}

// Categorías con personajes expandidos
const categories: Category = {
  medieval: {
    characters: [
      "Caballero", "Niño", "Niña", "Princesa", "Principe", "Brujo", "Dragón", "Bruja", "Rey", "Reina", "Guerrero", "Arquero",
      "Troll", "Duende", "Noble", "Juglar", "Monje", "Sirviente", "Alquimista",
      "Espadachín", "Ermitaño", "Hechicero", "Cazador", "Centauro", "campesino",
    ],
    scenarios: [
      "Bosque encantado", "Niño", "Niña", "Castillo medieval", "Ciudad amurallada", "Taberna", "Cabaña del leñador", "Catedral",
      "Puente levadizo", "Torre del mago", "Granja", "Molino de viento", "Mercado", "Plaza del pueblo", "Cueva del dragón",
      "Murallas de la ciudad", "Foso", "Cementerio", "Bosque oscuro", "Lago encantado", "Isla misteriosa", "Templo antiguo",
      "Ruinas", "Fortaleza", "Mina abandonada", "Cueva de los bandidos", "Montaña nevada", "Valle escondido", "Cascada mágica", "Pradera",
      "Aldea de pescadores", "Cueva de los trolls", "Templo del sol", "Templo de la luna", "Bosque de los enanos",
      "Cueva de los murciélagos", "Cueva de los lobos", "Cueva de los osos", "Cueva de los goblins", "Cueva de los orcos",
      "Cueva de los ogros", "Cueva de los gigantes", "Cueva de los duendes", "Cueva de los fantasmas", "Cueva de los espectros",
      "Cueva de los vampiros", "Cueva de los licántropos"
    ]
  },
  fantasy: {
    characters: [
    "Hada", "Unicornio", "Elfo", "Gnomo", "Niño", "Niña", "Ser del bosque", "Ninfa", "Dragón bebé",
    "Sirena", "Pegaso", "Fénix", "Genio de la lámpara", "Ser de las sombras", "Quimera",
    "Hombre lobo", "Vampiro", "Ángel", "Demonio", "Esfinge", "Tritón", "Ser de agua"
    ],
    scenarios: [
      "Bosque encantado", "Cueva misteriosa", "Lago de los deseos", "Montaña prohibida",
      "Isla flotante", "Templo antiguo", "Ruinas antiguas", "Ciudad submarina", "Jardín encantado",
      "Palacio helado", "Volcán activo", "Isla de las sirenas", "Biblioteca mágica", "Valle de los dragones",
      "Pantano venenoso", "Planeta alienígena", "Mercado flotante", "Cueva subterránea", "Castillo medieval",
      "Ciudad futurista", "Nave espacial", "Valle de los dragones", "Biblioteca mágica", "Pantano venenoso",
      "Planeta alienígena", "Mercado flotante", "Cueva subterránea", "Isla de las sirenas", "Volcán activo",
      "Templo antiguo", "Jardín encantado", "Palacio helado", "Ruinas antiguas", "Ciudad submarina",
      "Montaña prohibida", "Lago de los deseos", "Isla flotante"
    ]
  },
  futuristic: {
    characters: [
      "Robot", "Científico loco", "Extraterrestre", "Niño", "Niña", "Astronauta", "Navegante del tiempo",
      "Inventor del futuro", "Inteligencia artificial", "Cazador de estrellas",
      "Capitán espacial", "Alienígena amistoso", "Explorador intergaláctico", "Cyborg",
      "Ingeniero espacial", "Comerciante cósmico", "Botánicas espaciales", "Androide rebelde",
      "Médico estelar", "Guardián del universo", "Minero espacial", "Supervisor de naves"
    ],
    scenarios: [
      "Ciudad futurista", "Nave espacial", "Planeta alienígena", "Niño", "Niña", "Mercado flotante",
      "Cueva subterránea", "Isla flotante", "Bosque encantado", "laboratio secreto", "Marte",
      "Valle de los dragones", "Biblioteca mágica", "Pantano venenoso", "Volcán activo",
      "Templo antiguo", "Jardín encantado", "Palacio helado", "Ruinas antiguas",
      "Ciudad submarina", "Montaña prohibida", "Lago de los deseos", "Isla flotante"
    ]
  },
  animals: {
    characters: [
      "Gato mágico", "Perro leal", "Tortuga sabia", "Panda amable", "León valiente",
      "Mono travieso", "Zorro astuto", "Delfín juguetón", "Oveja soñadora", "Pingüino aventurero",
      "Flamenco elegante", "Murciélago nocturno", "Castor constructor", "Koala pacífico",
      "Ardilla veloz", "Tigre misterioso", "Pájaro del trueno", "Rana mágica",
      "Pavo real orgulloso", "Caracol parlante"
    ],
    scenarios: [
      "Selva tropical", "Sabana africana", "Bosque templado", "Desierto", "Océano", "Arrecife de coral", "Montañas rocosas",
      "Pradera", "Pantano", "Río", "Lago", "Cueva", "Isla tropical", "Tundra ártica", "Bosque boreal", "Estepa",
      "Manglar", "Bosque lluvioso", "Cascada", "Volcán", "Cañón", "Glaciar", "Bosque de bambú", "Jungla", "Gran barrera de coral",
      "Selva amazónica", "Bosque de secuoyas", "Bosque de pinos", "Bosque de robles", "Bosque de abedules", "Bosque de álamos",
      "Bosque de castaños", "Bosque de hayas", "Bosque de arces", "Bosque de cedros", "Bosque de cipreses", "Bosque de eucaliptos",
      "Bosque de olmos", "Bosque de fresnos", "Bosque de nogales", "Bosque de sauces", "Bosque de tejos", "Bosque de tilos",
      "Bosque de olivos", "Bosque de almendros", "Bosque de cerezos", "Bosque de manzanos", "Bosque de perales", "Bosque de ciruelos"
  ]
  },
  mythological: {
    characters: [
      "Minotauro", "Medusa", "Dios del trueno", "Genio de la lámpara", "Quimera", "Pegaso",
      "Esfinge", "Héroe mitológico", "Tritón", "Dios de la sabiduría", "Semidiós",
      "Dragón del hielo", "Fénix renacido", "Ninfa del bosque", "Centauro protector",
      "Titán", "Hada de la luz", "Gigante del valle", "Kraken", "Espíritu del fuego"
    ],
    scenarios: [
      "Monte Olimpo", "Inframundo", "Valhalla", "Elíseo", "Bosque encantado", "Isla de Avalon", "Templo antiguo",
      "Laberinto del Minotauro", "Río Estigia", "Jardín de las Hespérides", "Cueva de Polifemo", "Monte Fuji",
      "Bosque de Broceliande", "Montaña sagrada", "Templo de Apolo", "Palacio de los dioses", "Lago Ness",
      "Isla de Circe", "Cueva de Calipso", "Campos Elíseos", "Monte Ida", "Monte Parnaso", "Monte Sinaí",
      "Templo de Zeus", "Templo de Atenea", "Templo de Poseidón", "Templo de Hades", "Templo de Hera",
      "Templo de Artemisa", "Templo de Hermes", "Templo de Dionisio", "Templo de Hefesto", "Templo de Deméter",
      "Templo de Afrodita", "Templo de Ares", "Templo de Apolo", "Templo de Hestia", "Templo de Perséfone",
      "Templo de Hécate", "Templo de Pan", "Templo de Eros", "Templo de Nike", "Templo de Selene", "Templo de Helios",
      "Templo de Hypnos", "Templo de Morfeo", "Templo de Tánatos", "Templo de Némesis", "Templo de Tyche"
    ]
  },
};

function generateStorySetup() {
  // Obtener una categoría aleatoria
  const categoriesTypes = Object.keys(categories);
  const category = categoriesTypes[Math.floor(Math.random() * categoriesTypes.length)];

  // Obtener un escenario aleatorio
  const { scenarios, characters } = categories[category];
  const randomScenario = scenarios[Math.floor(Math.random() * scenarios.length)];

  // Seleccionar entre 2 y 3 personajes compatibles
  const selectedCharacters = characters
    .sort(() => 0.5 - Math.random())
    .slice(0, Math.random() < 0.5 ? 2 : 3);
  return {
    scenario: randomScenario,
    category,
    characters: selectedCharacters.map((ch) => `${ch} (${sexos[ch] !== undefined ? sexos[ch] : Math.random() < 0.5 ? "masculino" : "femenino"})`)};
}

export { generateStorySetup };
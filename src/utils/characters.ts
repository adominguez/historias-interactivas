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
  futurist: {
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
  mythologycal: {
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
  terror: {
    characters: [
      "Fantasma", "Vampiro", "Hombre lobo", "Bruja", "Zombi", "Espectro",
      "Licántropo", "Demonio", "Ángel caído", "Cazador de monstruos", "Cazador de vampiros",
      "Cazador de demonios", "Cazador de brujas", "Cazador de fantasmas", "Cazador de zombis",
      "Cazador de licántropos", "Cazador de espectros", "Cazador de ángeles caídos", "Cazador de criaturas",
      "Cazador de seres sobrenaturales"
    ],
    scenarios: [
      "Cementerio", "Mansión abandonada", "Bosque oscuro", "Casa encantada", "Hospital psiquiátrico",
      "Asilo abandonado", "Cueva de los murciélagos", "Cueva de los vampiros", "Carretera maldita", "Isla desierta",
      "Barco fantasma", "Casa de muñecas", "Casa de espejos", "Casa de los horrores", "Casa de los sustos", "Casa embrujada",
    ]
  },
  // christmas: {
  //   characters: [
  //     "Papá Noel", "Mamá Noel", "Duende", "Renos", "Muñeco de nieve", "Árbol de Navidad",
  //     "Estrella de Belén", "Pastor", "Reyes Magos", "Ángel de la guarda", "Caramelo de jengibre", "Hada de la Navidad",
  //     "Copa de chocolate", "Bola de nieve", "Regalo de Navidad", "Trineo mágico", "Casa de jengibre", "niño", "niña"
  //   ],
  //   scenarios: [
  //     "Polo Norte", "Taller de juguetes", "Casa de Papá Noel", "Casa de Mamá Noel", "Casa de los duendes", "Casa de los renos",
  //     "Casa de los muñecos de nieve", "Casa de los caramelos", "Casa de los regalos", "Casa de las estrellas", "Casa de los pastores",
  //     "Casa de los Reyes Magos", "Casa de los ángeles", "Casa de los copos de nieve", "Casa de los trineos", "Casa de los regalos", "centro comercial", "ciudad nevada",
  //     "ciudad iluminada", "ciudad de los juguetes", "ciudad de los caramelos", "ciudad de los regalos", "ciudad de las estrellas", "ciudad de los pastores", "ciudad de los Reyes Magos",
  //   ]
  // },
  pirates: {
    characters: [
      "Pirata", "Capitán pirata", "Marinero", "Corsario", "Bucanero", "Navegante",
      "Rey de los piratas", "Reina de los piratas", "Príncipe pirata", "Princesa pirata",
      "Pata de palo", "Ojo de vidrio", "Garfio", "Loro pirata"
    ],
    scenarios: [
      "Isla del tesoro", "Barco pirata", "Taberna pirata", "Puerto pirata", "Cueva del pirata",
      "Mar de los siete mares", "Isla desierta", "Isla misteriosa", "Isla de los piratas",
      "Isla de los corsarios", "Isla de los bucaneros", "Isla de los navegantes", "Isla de los tesoros",
      "barco fantasma", "barco de los piratas", "barco de los corsarios", "barco de los bucaneros",
      "tesoro pirata", "tesoro de los piratas", "tesoro de los corsarios", "tesoro de los bucaneros",
    ]
  },
  // valentin: {
  //   characters: [
  //     "Cupido", "Pareja", "Enamorado", "Enamorada"
  //   ],
  //   scenarios: [
  //     "Carta de amor", "Cita romántica", "Cena a la luz de las velas",
  //     "Paseo por la playa", "Paseo por el parque", "Paseo en globo", "Paseo en barco", "Paseo en coche",
  //     "Paseo en moto", "Paseo en bicicleta", "Paseo en patines", "Paseo en patinete", "Paseo en patín"
  //   ]
  // },
  verano: {
    characters: [
      "Niño", "Niña", "Padre", "Madre", "Abuelo", "Abuela", "Tío", "Tía", "Primo", "Prima",
      "Amigo", "Amiga", "Vecino", "Vecina", "Perro", "Gato", "Pájaro", "Pez", "Delfín", "Tortuga",
      "Cangrejo", "Pulpo", "Medusa", "Coral", "Estrella de mar", "Caracola", "Concha", "Barco", "Velero",
      "Lancha", "Yate", "Catamarán", "Surfista", "Nadador", "Bañista", "Pescador", "Buzo", "Socorrista",
      "Vendedor de helados", "Vendedor de refrescos", "Vendedor de palomitas", "Vendedor de churros", "Vendedor de perritos calientes",
    ],
    scenarios: [
      "Playa", "Mar", "Océano", "Piscina", "Río", "Lago", "Charca", "Cascada",
      "Fuente", "Parque acuático", "Parque de atracciones", "Parque de juegos", "Parque de diversiones", "Parque temático",
      "vacaciones", "campamento", "excursión", "viaje", "paseo", "piscina", "fiesta", "barbacoa", "picnic", "merienda",
    ]
  },
  // comedy: {
  //   characters: [
  //     "Payaso",
  //     "Bufón",
  //     "Profesor despistado",
  //     "Rey ingenuo",
  //     "Caballero torpe",
  //     "Bruja olvidadiza",
  //     "Dragón miedoso",
  //     "Gigante torpe",
  //     "Aldeano chismoso",
  //     "Héroe presumido",
  //     "Gato parlante",
  //     "Inventor loco",
  //     "Cocinero exagerado",
  //     "Troll amable",
  //     "Fantasma bromista",
  //     "Pirata cobarde",
  //     "Princesa mandona",
  //     "Príncipe vanidoso",
  //     "Mago incompetente",
  //     "Explorador perdido",
  //     "Sirena cantarina",
  //     "Duende tramposo",
  //     "Monje perezoso",
  //     "Ladronzuelo desafortunado",
  //     "Caballo charlatán",
  //     "Hada distraída",
  //     "Mercader regateador",
  //     "Barquero gruñón",
  //     "Lobo vegetariano",
  //     "Cazador miope",
  //     "Conejo hiperactivo",
  //     "Pájaro charlatán",
  //     "Robot torpe",
  //     "Detective confuso",
  //     "Abuela astuta",
  //     "Vecino entrometido",
  //     "Jardinero exagerado",
  //     "Bardo desafinado",
  //     "Pez olvidadizo",
  //     "Reina paranoica"
  //   ],
  //   scenarios: [
  //     "Un banquete real que termina en desastre",
  //     "Un concurso de talentos desastroso",
  //     "Un castillo encantado lleno de trampas tontas",
  //     "Una carrera en la que todos los competidores hacen trampa",
  //     "Un bosque donde los árboles hablan demasiado",
  //     "Una boda interrumpida por un dragón vegetariano",
  //     "Un mercado lleno de regateadores exagerados",
  //     "Un torneo de caballeros donde las armas son utensilios de cocina",
  //     "Una misión para rescatar a un gato perdido",
  //     "Una cueva misteriosa con ecos que se burlan",
  //     "Un viaje en barco con una tripulación que no sabe nadar",
  //     "Una granja donde los animales lideran una revuelta",
  //     "Un carnaval donde todo sale mal",
  //     "Un laboratorio donde los experimentos siempre explotan",
  //     "Un pueblo donde todos se comunican con rimas",
  //     "Una biblioteca mágica con libros que hablan",
  //     "Un hechizo que cambia las voces de todos los personajes",
  //     "Un circo donde los actos salen mal pero divierten al público",
  //     "Una tienda de pociones con ingredientes impredecibles",
  //     "Una caza del tesoro con un mapa lleno de errores",
  //     "Un taller de inventos donde nada funciona correctamente",
  //     "Una escuela de magia con maestros muy despistados",
  //     "Un castillo en ruinas lleno de trampas absurdas",
  //     "Un festival donde todos intercambian roles",
  //     "Un puente custodiado por un troll amistoso pero hablador",
  //     "Una misión para devolver un objeto mágico que causa problemas",
  //     "Un zoológico mágico donde los animales escapan",
  //     "Un pueblo congelado donde los habitantes se deslizan constantemente",
  //     "Una tienda de dulces con caramelos que hablan",
  //     "Un concurso de cocina donde los ingredientes cobran vida",
  //     "Un estanque donde las ranas cuentan chistes",
  //     "Un reino donde todo se resuelve con concursos de baile",
  //     "Un desierto donde las dunas forman mensajes misteriosos",
  //     "Una torre donde la princesa no quiere ser rescatada",
  //     "Un pueblo donde todos tienen habilidades mágicas inútiles",
  //     "Una cueva donde el eco tiene opiniones propias",
  //     "Un volcán que erupciona confeti en lugar de lava",
  //     "Un bosque donde los animales intercambian personalidades",
  //     "Un río que fluye hacia arriba y confunde a todos",
  //     "Una posada donde los fantasmas son camareros bromistas"
  //   ]
  // }
};

function generateStorySetup(paramCategory?: string) {
  // Obtener una categoría aleatoria
  const categoriesTypes = Object.keys(categories);
  const category = paramCategory ?? categoriesTypes[Math.floor(Math.random() * categoriesTypes.length)];

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
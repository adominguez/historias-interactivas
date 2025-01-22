import { setupCategories } from "@data/categories";

interface Category {
  [key: string]: {
    [key: string]: {
      characters: string[];
      scenarios: string[];
    }
  }
}

// Categorías con personajes expandidos
const categories: Category = setupCategories;

export const ages = [
  "3-4",
  "5-8",
  "9-12",
  "13-18",
  "18+"
]

export type Age = {
  type: string;
  people: string;
  alias: string;
  words: string;
  color: string;
}

export const AGES = {
  "3-4": {
    type: "un cuento",
    people: "niños",
    alias: "3-4 años",
    words: "40-60 palabras",
    color: "bg-green-500"
  },
  "5-8": {
    type: "un cuento",
    people: "niños",
    alias: "5-8 años",
    words: "100-200 palabras",
    color: "bg-blue-500"
  },
  "9-12": {
    type: "un cuento",
    people: "niños",
    alias: "9-12 años",
    words: "200-300 palabras",
    color: "bg-yellow-500"
  },
  "13-18": {
    type: "una historia",
    people: "jóvenes",
    alias: "13-18 años",
    words: "300-500 palabras",
    color: "bg-orange-500"
  },
  "18+": {
    type: "una historia",
    people: "personas",
    alias: "18 años o más",
    words: "500-1000 palabras",
    color: "bg-red-500"
  }
} as { [key: string]: Age };

function generateStorySetup(paramCategory: string | undefined, paramAge?: string) {
  // Obtener una categoría aleatoria
  const categoriesTypes = Object.keys(categories);
  const category = paramCategory ?? categoriesTypes[Math.floor(Math.random() * categoriesTypes.length)];
  // Obtener una edad aleatoria
  const age = paramAge ?? ages[Math.floor(Math.random() * ages.length)];

  // Obtener un escenario aleatorio
  const { scenarios, characters } = categories[category][age];
  const randomScenario = scenarios[Math.floor(Math.random() * scenarios.length)];

  // Seleccionar entre 2 y 3 personajes compatibles
  const selectedCharacters = characters
    .sort(() => 0.5 - Math.random())
    .slice(0, Math.random() < 0.5 ? 2 : 3);
  return {
    age,
    scenario: randomScenario,
    category,
    characters: selectedCharacters
  };
}

export { generateStorySetup };
// Fechas señaladas para la planificación semanal de redes (ver
// socialPlanner.ts). Las fechas las pone el código, no la IA: un modelo de
// lenguaje no sabe en qué día está, y con las fechas que cambian cada año
// (Semana Santa, Carnaval, Día de la Madre, equinoccios) se equivoca o se
// las inventa. Aquí son datos: la IA recibe la lista ya resuelta y decide
// qué hacer con ella, que es para lo que sí sirve.
//
// Pensado para España y para un público de familias con niños de 3 a 12
// años: solo entran fechas con las que se puede hilar un cuento infantil.

export type SpecialDate = {
  date: string; // YYYY-MM-DD, hora de Madrid
  name: string;
  // Aviso para la IA cuando la fecha real varía (p. ej. por comunidad
  // autónoma) y no conviene afirmarla como exacta en el texto publicado.
  approximate?: boolean;
  // Categorías del catálogo (stories.categories) que encajan especialmente.
  categories?: string[];
};

type FixedDate = Omit<SpecialDate, "date"> & { month: number; day: number };

const FIXED_DATES: FixedDate[] = [
  { month: 1, day: 1, name: "Año Nuevo" },
  { month: 1, day: 6, name: "Día de Reyes", categories: ["christmas"] },
  { month: 1, day: 30, name: "Día Escolar de la No Violencia y la Paz", categories: ["values"] },
  { month: 2, day: 14, name: "San Valentín", categories: ["love"] },
  { month: 3, day: 19, name: "Día del Padre" },
  { month: 4, day: 2, name: "Día Internacional del Libro Infantil" },
  { month: 4, day: 22, name: "Día de la Tierra", categories: ["animals"] },
  { month: 4, day: 23, name: "Día del Libro (Sant Jordi)" },
  { month: 5, day: 15, name: "Día Internacional de las Familias" },
  { month: 6, day: 5, name: "Día Mundial del Medio Ambiente", categories: ["animals"] },
  { month: 6, day: 8, name: "Día Mundial de los Océanos", categories: ["pirates", "animals"] },
  { month: 6, day: 19, name: "Fin de curso escolar", approximate: true, categories: ["summer"] },
  { month: 6, day: 23, name: "Noche de San Juan", categories: ["summer"] },
  { month: 7, day: 26, name: "Día de los Abuelos" },
  { month: 7, day: 30, name: "Día Internacional de la Amistad" },
  { month: 9, day: 8, name: "Vuelta al cole", approximate: true },
  { month: 9, day: 19, name: "Día Internacional de Hablar como un Pirata", categories: ["pirates"] },
  { month: 10, day: 4, name: "Día Mundial de los Animales", categories: ["animals"] },
  { month: 10, day: 31, name: "Halloween", categories: ["halloween", "fear", "horror"] },
  { month: 11, day: 1, name: "Día de Todos los Santos", categories: ["halloween"] },
  { month: 11, day: 20, name: "Día Universal del Niño" },
  { month: 12, day: 24, name: "Nochebuena", categories: ["christmas"] },
  { month: 12, day: 25, name: "Navidad", categories: ["christmas"] },
  { month: 12, day: 28, name: "Día de los Santos Inocentes" },
  { month: 12, day: 31, name: "Nochevieja", categories: ["christmas"] },
];

const DAY_MS = 24 * 60 * 60 * 1000;

const isoDate = (ms: number) => new Date(ms).toISOString().slice(0, 10);

// Domingo de Pascua (calendario gregoriano), algoritmo anónimo de
// Meeus/Jones/Butcher. Devuelve la medianoche UTC de ese día.
export function easterSunday(year: number): number {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return Date.UTC(year, month - 1, day);
}

// Equinoccios y solsticios: fórmulas de "equinoccio medio" de Meeus
// (Astronomical Algorithms, tabla 27.C, válidas 2000-3000). Sin las
// correcciones periódicas se desvían como mucho unos minutos del instante
// real — de sobra para saber qué DÍA empieza la estación. El día se da en
// hora de Madrid: el otoño de 2026 empieza el 23 de septiembre a las 00:05
// UTC, que en UTC sería el 23 pero por muy poco; en Madrid son las 02:05.
const SEASON_COEFFICIENTS: { name: string; c: [number, number, number, number, number] }[] = [
  { name: "Empieza la primavera", c: [2451623.80984, 365242.37404, 0.05169, -0.00411, -0.00057] },
  { name: "Empieza el verano", c: [2451716.56767, 365241.62603, 0.00325, 0.00888, -0.00030] },
  { name: "Empieza el otoño", c: [2451810.21715, 365242.01767, -0.11575, 0.00337, 0.00078] },
  { name: "Empieza el invierno", c: [2451900.05952, 365242.74049, -0.06223, -0.00823, 0.00032] },
];

const madridDate = (ms: number) =>
  new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Madrid", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(ms));

export function seasonStarts(year: number): SpecialDate[] {
  const y = (year - 2000) / 1000;
  return SEASON_COEFFICIENTS.map(({ name, c }) => {
    const jde = c[0] + c[1] * y + c[2] * y ** 2 + c[3] * y ** 3 + c[4] * y ** 4;
    const ms = (jde - 2440587.5) * DAY_MS;
    return { date: madridDate(ms), name };
  });
}

function movableDates(year: number): SpecialDate[] {
  const easter = easterSunday(year);
  const firstOfMay = Date.UTC(year, 4, 1);
  const firstSundayOfMay = firstOfMay + ((7 - new Date(firstOfMay).getUTCDay()) % 7) * DAY_MS;
  return [
    { date: isoDate(easter - 47 * DAY_MS), name: "Carnaval (martes de Carnaval)" },
    { date: isoDate(easter - 7 * DAY_MS), name: "Domingo de Ramos, empieza la Semana Santa" },
    { date: isoDate(easter), name: "Domingo de Pascua" },
    { date: isoDate(firstSundayOfMay), name: "Día de la Madre" },
  ];
}

export function specialDatesOfYear(year: number): SpecialDate[] {
  const fixed = FIXED_DATES.map(({ month, day, ...rest }) => ({ ...rest, date: isoDate(Date.UTC(year, month - 1, day)) }));
  return [...fixed, ...movableDates(year), ...seasonStarts(year)].sort((a, b) => a.date.localeCompare(b.date));
}

// Fechas señaladas entre `fromIso` y `toIso`, ambas incluidas (YYYY-MM-DD).
export function specialDatesBetween(fromIso: string, toIso: string): SpecialDate[] {
  const fromYear = Number(fromIso.slice(0, 4));
  const toYear = Number(toIso.slice(0, 4));
  const all: SpecialDate[] = [];
  for (let year = fromYear; year <= toYear; year++) all.push(...specialDatesOfYear(year));
  return all.filter(({ date }) => date >= fromIso && date <= toIso);
}

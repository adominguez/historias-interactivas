// Semanas temáticas de las publicaciones automáticas (ver social-auto-post.ts).
// En vez de publicar cada día un cuento suelto sin relación con el anterior,
// cada semana (de lunes a domingo) tiene un tema, y los cuentos de esa semana
// salen de sus categorías: "semana pirata", "semana de animales"...
//
// Cada tema junta categorías afines para tener cuentos de sobra: una semana
// consume 7 (uno por día — la Story de la tarde reutiliza el cuento del feed,
// ver social-auto-post.ts), y ningún cuento puede repetirse antes de
// COOLDOWN_DAYS (35). Con 6 temas en rotación, cada uno vuelve cada 42 días,
// así que el cooldown no llega a agotar ninguno. Contado en el catálogo real
// (sept 2026, solo edades de SOCIAL_AGES), el más justo de la rotación
// (espacial) tiene 13 cuentos; Navidad 12 y Halloween 10, pero esos solo
// ocupan una semana al año.
//
// El hashtag va escrito a mano y no derivado de `label`: normalizeHashtag
// pegaría "Semana de animales" como "#Semanadeanimales", que se lee peor.
export type SocialTheme = {
  id: string;
  label: string;
  hashtag: string;
  categories: string[]; // valores de stories.categories (el "name" de generalCategories)
};

export const ROTATING_THEMES: SocialTheme[] = [
  { id: "pirates", label: "Semana pirata", hashtag: "#SemanaPirata", categories: ["pirates"] },
  { id: "animals", label: "Semana de animales", hashtag: "#SemanaDeAnimales", categories: ["animals"] },
  { id: "fantasy", label: "Semana de fantasía", hashtag: "#SemanaDeFantasía", categories: ["fantasy", "princesses"] },
  { id: "space", label: "Semana espacial", hashtag: "#SemanaEspacial", categories: ["science-fiction", "superheroes"] },
  { id: "myths", label: "Semana de mitos y leyendas", hashtag: "#MitosYLeyendas", categories: ["mythology", "history"] },
  { id: "adventures", label: "Semana de aventuras", hashtag: "#SemanaDeAventuras", categories: ["adventures", "summer"] },
];

// Fechas señaladas que mandan sobre la rotación: la semana que contiene ese
// día (mes 1-12) es la de ese tema, toque lo que toque en la rotación.
export const SEASONAL_THEMES: { month: number; day: number; theme: SocialTheme }[] = [
  { month: 10, day: 31, theme: { id: "halloween", label: "Semana de Halloween", hashtag: "#SemanaDeHalloween", categories: ["halloween", "fear", "horror"] } },
  { month: 12, day: 24, theme: { id: "christmas", label: "Semana de Navidad", hashtag: "#SemanaDeNavidad", categories: ["christmas"] } },
];

const DAY_MS = 24 * 60 * 60 * 1000;
// 5 de enero de 1970 fue lunes: contar semanas desde ahí hace que cada semana
// empiece en lunes, como en el calendario español, y no en jueves (el día de
// la semana del 1 de enero de 1970).
const FIRST_MONDAY_MS = Date.UTC(1970, 0, 5);

export type ThemeOfTheDay = {
  theme: SocialTheme;
  dayOfWeek: number; // 1 = lunes ... 7 = domingo
};

// En UTC, como el resto del calendario social (ver socialSchedule.ts): los
// crons de Vercel disparan en UTC.
export function getThemeForDate(date: Date): ThemeOfTheDay {
  const todayMs = Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
  const daysSinceFirstMonday = Math.floor((todayMs - FIRST_MONDAY_MS) / DAY_MS);
  const weekIndex = Math.floor(daysSinceFirstMonday / 7);
  const dayOfWeek = (daysSinceFirstMonday % 7) + 1;

  const mondayMs = todayMs - (dayOfWeek - 1) * DAY_MS;
  const seasonal = SEASONAL_THEMES.find(({ month, day }) => {
    // Se prueban el año del lunes y el del domingo: una semana puede cruzar
    // de año (lunes 28 de diciembre, domingo 3 de enero).
    const years = new Set([new Date(mondayMs).getUTCFullYear(), new Date(mondayMs + 6 * DAY_MS).getUTCFullYear()]);
    return [...years].some((year) => {
      const dateMs = Date.UTC(year, month - 1, day);
      return dateMs >= mondayMs && dateMs < mondayMs + 7 * DAY_MS;
    });
  });

  const theme = seasonal?.theme ?? ROTATING_THEMES[weekIndex % ROTATING_THEMES.length];
  return { theme, dayOfWeek };
}

// ¿Encaja este cuento (su columna stories.categories ya parseada) en el tema?
// Un cuento que no es del tema puede salir igualmente en su semana — uno
// nuevo, o el de la cola general si el tema se quedó sin cuentos fuera de
// cooldown —, y entonces el post no debe presentarse como parte del tema.
export function storyBelongsToTheme(storyCategories: string[], theme: SocialTheme): boolean {
  return storyCategories.some((category) => theme.categories.includes(category));
}

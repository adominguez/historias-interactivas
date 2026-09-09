import type { Option } from "@types";

// Nº de días que un cuento debe quedar en reposo tras publicarse con éxito
// antes de poder volver a elegirse (ver getNextStoryToPost en turso.ts) —
// el propio usuario pidió "evitar reutilizar un cuento durante
// aproximadamente 30-45 días".
export const COOLDOWN_DAYS = 35;

export type SocialFormatId = "recommendation" | "decision";

// Superficie donde se publica ese contenido (Fase 2 añade "story"; un futuro
// "reel" en Fase 3 se sumaría aquí sin tocar nada más de este archivo). Es
// una dimensión aparte del formato a propósito: la misma decisión editorial
// (recomendación/decisión) puede publicarse como post de feed o como Story,
// reutilizando el mismo generador de texto en vez de duplicar la disciplina
// anti-invención/anti-spoiler para cada combinación.
export type SocialSurface = "feed" | "story";

// Orden de rotación: también el orden en que se busca "el siguiente formato
// distinto" cuando el formato asignado a hoy coincidiría con el último
// publicado con éxito (ver resolveFormatForToday). Registrar un formato
// nuevo (reel, story...) en una fase futura es añadirlo aquí y en
// SOCIAL_FORMATS — el resto de esta lógica no cambia.
export const SOCIAL_FORMAT_IDS: SocialFormatId[] = ["recommendation", "decision"];

export type SocialCaptionPromptInput = {
  format: SocialFormatId;
  title: string;
  resume: string;
  characters: { name: string; description: string }[];
  categoryTitles: string[];
  age: string;
  slug: string;
  rootOptions?: Option[]; // solo lo necesita el formato 'decision'
};

type StoryRow = {
  id: number;
  slug: string;
  title: string;
  resume: string;
  characters: string; // JSON
  age: string;
};

type SocialFormatGenerator = {
  id: SocialFormatId;
  // Le dice al endpoint si tiene que resolver las opciones reales de la
  // raíz del cuento (getStoryOptions) antes de construir el prompt.
  needsRootOptions: boolean;
  buildPromptInput: (story: StoryRow, categoryTitles: string[], rootOptions: Option[] | undefined) => SocialCaptionPromptInput;
};

const buildCommonInput = (story: StoryRow, categoryTitles: string[]) => ({
  title: story.title,
  resume: story.resume,
  characters: JSON.parse(story.characters) as { name: string; description: string }[],
  categoryTitles,
  age: story.age,
  slug: story.slug,
});

export const SOCIAL_FORMATS: Record<SocialFormatId, SocialFormatGenerator> = {
  recommendation: {
    id: "recommendation",
    needsRootOptions: false,
    buildPromptInput: (story, categoryTitles) => ({
      format: "recommendation",
      ...buildCommonInput(story, categoryTitles),
    }),
  },
  decision: {
    id: "decision",
    needsRootOptions: true,
    buildPromptInput: (story, categoryTitles, rootOptions) => ({
      format: "decision",
      ...buildCommonInput(story, categoryTitles),
      rootOptions,
    }),
  },
};

// No repetir el formato inmediatamente anterior con éxito: si el formato
// que le toca a hoy (ver socialSchedule.ts) coincide con el último
// publicado, se pasa al siguiente id de la rotación en vez de publicar el
// mismo formato dos veces seguidas. Esto SÍ puede pasar con el calendario de
// la Fase 1 (viernes=recomendado seguido del lunes siguiente=recomendado,
// sin ningún día activo entre medias) — es el hueco por el que un futuro
// tercer formato entraría solo en la rotación, sin tocar esta función.
export function resolveFormatForToday(scheduled: SocialFormatId | null, lastSuccessfulFormat: string | undefined): SocialFormatId | null {
  if (!scheduled) return null;
  if (scheduled !== lastSuccessfulFormat) return scheduled;
  const index = SOCIAL_FORMAT_IDS.indexOf(scheduled);
  return SOCIAL_FORMAT_IDS[(index + 1) % SOCIAL_FORMAT_IDS.length];
}

// Facebook e Instagram terminan un hashtag en el primer carácter que no sea
// letra, número o guion bajo: "#Edad5-8" no se publica como una etiqueta, se
// publica como la etiqueta "#Edad5" seguida del texto suelto "-8". La IA
// acierta casi siempre (escribe "#Edad5a8"), pero en una prueba real generó
// justo la versión con guion, así que no puede depender de la suerte: se
// limpian aquí por código, además de pedírselo en el prompt.
//
// Se conservan tildes y ñ a propósito: esos sí funcionan en ambas redes
// ("#CuentosDeFantasía" es una etiqueta válida y es la que queremos).
export function normalizeHashtag(raw: string): string {
  const body = raw.trim().replace(/^#+/, "").replace(/[^\p{L}\p{N}_]/gu, "");
  return body ? `#${body}` : "";
}

// Además de limpiar cada etiqueta, quita las que se quedan vacías y las
// repetidas (dos hashtags distintos pueden colapsar en el mismo al limpiarlos,
// p. ej. "#Edad-5-8" y "#Edad58"), sin alterar el orden.
export function normalizeHashtags(raw: string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const tag of raw) {
    const normalized = normalizeHashtag(tag);
    if (!normalized) continue;
    const key = normalized.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(normalized);
  }
  return result;
}

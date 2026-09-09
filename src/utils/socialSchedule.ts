import type { SocialFormatId, SocialSurface } from "./socialFormats";

export type ScheduledSlot = { format: SocialFormatId; surface: SocialSurface };

// Índices de JS Date#getUTCDay(): 0=domingo ... 6=sábado. Se usa getUTCDay,
// no getDay, porque el cron de Vercel dispara en UTC — comprobar el día
// local del servidor podría no coincidir con el día que Vercel entiende que
// es cerca de la medianoche.
//
// La Fase 1 solo tenía posts de feed; la Fase 2 activa el domingo como
// Story (encaja con el "🌳 Story / pregunta a la comunidad" del calendario
// editorial original del usuario), reutilizando el formato "decision" -- ver
// el aviso en el plan de Fase 2 sobre que no es una encuesta interactiva de
// verdad, solo una pregunta incrustada en la imagen. Miércoles/Jueves/
// Sábado siguen en `null` (reservados para reel/escena/personaje, aún sin
// implementar). Añadir un generador nuevo más adelante es cambiar una
// entrada de `null` aquí, nada más de este archivo ni de socialFormats.ts
// necesita cambiar.
// Ahora se publica los siete días. Antes miércoles, jueves y sábado estaban a
// null "reservados" para reels y formatos que nunca se implementaron, así que
// en la práctica eran tres días de silencio a la semana. Un día sin publicar
// no reserva nada: simplemente no publica.
//
// La superficie de este calendario es siempre "feed". Las Stories ya no
// dependen del día de la semana: tienen su propio cron diario en vercel.json
// que llama a este mismo endpoint con ?surface=story. Repartirlo en dos
// invocaciones no es solo orden editorial — es lo que mantiene cada ejecución
// lejos del límite de 60s del plan Hobby (una sola llamada haciendo feed +
// Story serían cuatro publicaciones más la espera de Instagram).
//
// Solo hay dos formatos, así que alternan; resolveFormatForToday además evita
// repetir el último publicado con éxito, de modo que el cuento y el enfoque
// cambian aunque el formato se repita en el calendario.
export const WEEKDAY_FORMAT: Record<number, ScheduledSlot | null> = {
  0: { format: "decision", surface: "feed" },       // Domingo — "¿qué elegirías?"
  1: { format: "recommendation", surface: "feed" }, // Lunes — cuento recomendado
  2: { format: "decision", surface: "feed" },       // Martes — "¿qué elegirías?"
  3: { format: "recommendation", surface: "feed" }, // Miércoles — cuento recomendado
  4: { format: "decision", surface: "feed" },       // Jueves — "¿qué elegirías?"
  5: { format: "recommendation", surface: "feed" }, // Viernes — cuento para el fin de semana
  6: { format: "decision", surface: "feed" },       // Sábado — "¿qué elegirías?"
};

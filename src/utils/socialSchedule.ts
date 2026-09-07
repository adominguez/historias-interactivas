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
export const WEEKDAY_FORMAT: Record<number, ScheduledSlot | null> = {
  0: { format: "decision", surface: "story" }, // Domingo — Story/pregunta a la comunidad
  1: { format: "recommendation", surface: "feed" }, // Lunes — cuento recomendado
  2: { format: "decision", surface: "feed" },       // Martes — "¿qué elegirías?"
  3: null,             // Miércoles — reel (no implementado)
  4: null,             // Jueves — escena/personaje (no implementado)
  5: { format: "recommendation", surface: "feed" }, // Viernes — cuento para el fin de semana
  6: null,             // Sábado — reel/microcuento (no implementado)
};

import type { SocialFormatId } from "./socialFormats";

// Índices de JS Date#getUTCDay(): 0=domingo ... 6=sábado. Se usa getUTCDay,
// no getDay, porque el cron de Vercel dispara en UTC — comprobar el día
// local del servidor podría no coincidir con el día que Vercel entiende que
// es cerca de la medianoche.
//
// La Fase 1 solo tiene 2 de los ~6 formatos del calendario editorial que
// dio el usuario; se reutiliza su propia asignación para los días que sí
// tienen generador (Lunes/Viernes=recomendado, Martes=decisión) y se deja
// en `null` (no publica ese día) los días mapeados a formatos que aún no
// existen (reel, escena/personaje, story). Añadir un generador nuevo más
// adelante es cambiar una entrada de `null` a su id aquí, nada más de este
// archivo ni de socialFormats.ts necesita cambiar.
export const WEEKDAY_FORMAT: Record<number, SocialFormatId | null> = {
  0: null,             // Domingo — story/pregunta a la comunidad (no implementado en Fase 1)
  1: "recommendation", // Lunes — cuento recomendado
  2: "decision",       // Martes — "¿qué elegirías?"
  3: null,             // Miércoles — reel (no implementado en Fase 1)
  4: null,             // Jueves — escena/personaje (no implementado en Fase 1)
  5: "recommendation", // Viernes — cuento para el fin de semana
  6: null,             // Sábado — reel/microcuento (no implementado en Fase 1)
};

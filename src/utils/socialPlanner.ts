import { createOpenAI } from "@ai-sdk/openai";
import { generateObject } from "ai";
import type { z } from "zod";
import { socialWeekPlanSchema } from "@src/schemas";
import { generateSocialWeekPlanPrompt } from "@src/utils/prompts";
import { specialDatesBetween } from "@src/utils/socialCalendar";
import { COOLDOWN_DAYS, SOCIAL_AGES, normalizeHashtag } from "@src/utils/socialFormats";
import { getPlanCandidates, getAvailableStoryCountsByCategory, getRecentWeekThemes } from "@src/turso";
import { generalCategories } from "@src/data/categories";
import { OPENAI_API_KEY } from "astro:env/server";

// Planificación semanal de redes: cada jueves (ver vercel.json y
// pages/api/social-plan-generate.ts) una IA decide el hilo de la semana
// siguiente y qué cuento sale cada día, con qué enfoque. Reparto de papeles:
// - El código pone los HECHOS: qué fechas señaladas caen esa semana
//   (socialCalendar.ts), qué cuentos están disponibles y qué hilos se usaron
//   hace poco.
// - La IA pone el CRITERIO: con eso delante, elige. Leyendo resúmenes puede
//   ver que un cuento de hojas encaja con el inicio del otoño, algo que
//   ninguna regla por categorías podría saber.
// - El código VALIDA el resultado día a día (validateWeekPlan): un día mal
//   planificado se descarta solo, y ese día se publica con la rotación de
//   socialThemes.ts, igual que si no hubiera plan.

const openai = createOpenAI({ apiKey: OPENAI_API_KEY });

// Cuántos candidatos se le mandan. Con todos (~150) el prompt se alarga y la
// llamada se acerca al límite de 60s de la función; 120 son de sobra para
// 7 días y siguen dejando margen para encontrar el cuento que encaje con una
// fecha concreta. Van primero los que nunca se han publicado.
const MAX_CANDIDATES = 120;
const RESUME_MAX_CHARS = 180;

const DAY_MS = 24 * 60 * 60 * 1000;
const WEEKDAYS = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];

const toIso = (ms: number) => new Date(ms).toISOString().slice(0, 10);
const fromIso = (iso: string) => Date.UTC(Number(iso.slice(0, 4)), Number(iso.slice(5, 7)) - 1, Number(iso.slice(8, 10)));
export const weekdayOf = (iso: string) => WEEKDAYS[new Date(fromIso(iso)).getUTCDay()];

// Lunes de la semana de `date` (UTC, como el resto del calendario social).
export function mondayOf(date: Date): string {
  const dayMs = Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
  const daysSinceMonday = (new Date(dayMs).getUTCDay() + 6) % 7;
  return toIso(dayMs - daysSinceMonday * DAY_MS);
}

export function nextMondayOf(date: Date): string {
  return toIso(fromIso(mondayOf(date)) + 7 * DAY_MS);
}

export function isMonday(iso: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(iso) && new Date(fromIso(iso)).getUTCDay() === 1;
}

export function weekDatesFrom(weekStart: string): string[] {
  return Array.from({ length: 7 }, (_, i) => toIso(fromIso(weekStart) + i * DAY_MS));
}

type RawWeekPlan = z.infer<typeof socialWeekPlanSchema>;

export type PlannedDay = { date: string; storyId: number; format: "recommendation" | "decision"; angle: string };

// Se queda con los días válidos del plan de la IA y explica los que descarta:
// fecha fuera de la semana o repetida, cuento que no estaba en la lista de
// candidatos (inventado, o en cooldown) o repetido. Se comprueba aquí y no
// solo en el prompt porque es justo lo que un modelo hace mal de vez en
// cuando, y un cuento repetido o inexistente se publicaría de verdad.
export function validateWeekPlan(raw: RawWeekPlan, { weekDates, candidateIds }: { weekDates: string[]; candidateIds: Set<number> }) {
  const days: PlannedDay[] = [];
  const rejected: string[] = [];
  const usedDates = new Set<string>();
  const usedStories = new Set<number>();

  for (const day of raw.days) {
    if (!weekDates.includes(day.date)) rejected.push(`${day.date}: no es un día de la semana planificada`);
    else if (usedDates.has(day.date)) rejected.push(`${day.date}: día repetido`);
    else if (!candidateIds.has(day.storyId)) rejected.push(`${day.date}: el cuento ${day.storyId} no estaba entre los candidatos`);
    else if (usedStories.has(day.storyId)) rejected.push(`${day.date}: el cuento ${day.storyId} ya estaba en otro día`);
    else {
      usedDates.add(day.date);
      usedStories.add(day.storyId);
      days.push({ date: day.date, storyId: day.storyId, format: day.format, angle: day.angle.trim() });
    }
  }

  // Si la IA devuelve un hashtag inservible, se deriva del nombre del hilo
  // poniendo en mayúscula cada palabra: "Llega el otoño" → "#LlegaElOtoño".
  const themeHashtag = normalizeHashtag(raw.themeHashtag)
    || normalizeHashtag(raw.themeLabel.split(/\s+/).map((word) => word.charAt(0).toUpperCase() + word.slice(1)).join(""));

  return {
    themeLabel: raw.themeLabel.trim(),
    themeHashtag,
    rationale: raw.rationale.trim(),
    needs: raw.needs.map((need) => need.trim()).filter(Boolean),
    days: days.sort((a, b) => a.date.localeCompare(b.date)),
    rejected,
  };
}

const categoryTitle = (name: string) => generalCategories.find((category) => category.name === name)?.title ?? name;

export async function generateWeekPlan(weekStart: string) {
  const weekDates = weekDatesFrom(weekStart);
  const weekEnd = weekDates[6];
  // Cooldown contado desde el lunes: lo publicado en los 35 días anteriores
  // al inicio de la semana no es candidato para ningún día de ella.
  const cooldownCutoff = `${toIso(fromIso(weekStart) - COOLDOWN_DAYS * DAY_MS)} 00:00:00`;

  const [candidateRows, availableByCategory, recentThemes] = await Promise.all([
    getPlanCandidates(cooldownCutoff, SOCIAL_AGES, MAX_CANDIDATES),
    getAvailableStoryCountsByCategory(cooldownCutoff, SOCIAL_AGES),
    getRecentWeekThemes(weekStart, 4),
  ]);

  const candidates = candidateRows.map((row) => ({
    id: Number(row.id),
    age: row.age as string,
    categoryTitles: (JSON.parse(row.categories as string) as string[]).map(categoryTitle),
    title: row.title as string,
    resume: ((row.resume as string | null) ?? "").replace(/\s+/g, " ").slice(0, RESUME_MAX_CHARS),
  }));

  const specialDatesThisWeek = specialDatesBetween(weekStart, weekEnd);
  const upcomingSpecialDates = specialDatesBetween(toIso(fromIso(weekEnd) + DAY_MS), toIso(fromIso(weekEnd) + 56 * DAY_MS));

  const prompt = generateSocialWeekPlanPrompt({
    weekDays: weekDates.map((date) => ({ date, weekday: weekdayOf(date) })),
    specialDatesThisWeek: specialDatesThisWeek.map((special) => ({ ...special, weekday: weekdayOf(special.date), categoryTitles: (special.categories ?? []).map(categoryTitle) })),
    upcomingSpecialDates: upcomingSpecialDates.map((special) => ({ ...special, categoryTitles: (special.categories ?? []).map(categoryTitle) })),
    recentThemes: recentThemes.map(({ themeLabel }) => themeLabel),
    availableByCategory: availableByCategory.map(({ category, available }) => ({ categoryTitle: categoryTitle(category), available })),
    candidates,
  });

  // gpt-5-mini y no nano (el de los textos diarios): es una sola llamada a
  // la semana, y de ella depende todo lo que se publica esos siete días.
  const { object } = await generateObject({
    model: openai("gpt-5-mini"),
    maxOutputTokens: 12000,
    providerOptions: { openai: { reasoningEffort: "low" } },
    prompt,
    schema: socialWeekPlanSchema,
  });

  const validated = validateWeekPlan(object, { weekDates, candidateIds: new Set(candidates.map(({ id }) => id)) });

  return {
    plan: {
      weekStart,
      themeLabel: validated.themeLabel,
      themeHashtag: validated.themeHashtag,
      rationale: validated.rationale,
      needs: validated.needs,
      specialDates: specialDatesThisWeek,
      days: validated.days,
    },
    rejected: validated.rejected,
    candidates,
  };
}

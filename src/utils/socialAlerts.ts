import { describeFailure } from "@src/utils/notify";
import type { SocialSurface } from "@src/utils/socialFormats";

// Textos de los avisos por WhatsApp de las publicaciones automáticas (ver
// notify.ts). Separados del envío para poder probarlos sin mandar nada.
// WhatsApp entiende *negrita*; los emojis del principio permiten saber de un
// vistazo, sin abrir el mensaje, si es un problema (⚠️/❌) o información (🗓️).

const SURFACE_LABEL: Record<SocialSurface, string> = {
  feed: "Post del día",
  story: "Story de la tarde",
};

const MONTHS = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sept", "oct", "nov", "dic"];
const WEEKDAYS = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];

// "2026-09-21" → "Lun 21 sept"
export function shortDate(iso: string): string {
  const date = new Date(`${iso}T12:00:00Z`);
  return `${WEEKDAYS[date.getUTCDay()]} ${date.getUTCDate()} ${MONTHS[date.getUTCMonth()]}`;
}

type PlatformResult = { ok: boolean; error?: string } | null;

// Solo si falló alguna plataforma: con las dos bien no hay nada que avisar.
export function buildPublishAlert({ surface, storyTitle, facebook, instagram }: { surface: SocialSurface; storyTitle: string; facebook: PlatformResult; instagram: PlatformResult }): string | null {
  if (facebook?.ok !== false && instagram?.ok !== false) return null;
  const line = (name: string, result: PlatformResult) =>
    result?.ok ? `${name}: ✅` : `${name}: ❌ ${describeFailure(result?.error ?? "sin respuesta")}`;
  return [
    `⚠️ *${SURFACE_LABEL[surface]}*: ha fallado en alguna red`,
    `Cuento: "${storyTitle}"`,
    line("Facebook", facebook),
    line("Instagram", instagram),
  ].join("\n");
}

// La ejecución entera falló antes o durante la publicación.
export function buildCrashAlert(surface: SocialSurface | null, error: unknown): string {
  const label = surface ? SURFACE_LABEL[surface] : "Publicación en redes";
  return `❌ *${label}: no se ha publicado*\n${describeFailure(error)}`;
}

export function buildPlanAlert(plan: {
  weekStart: string;
  themeLabel: string;
  themeHashtag: string;
  needs: string[];
  days: { date: string; title?: string }[];
  rejectedCount: number;
}): string {
  const lines = [
    `🗓️ *Plan de la semana del ${shortDate(plan.weekStart).slice(4)}*`,
    `*${plan.themeLabel}* ${plan.themeHashtag}`,
    "",
    ...plan.days.map(({ date, title }) => `${shortDate(date)} · ${title ?? "(cuento sin título)"}`),
  ];
  if (plan.rejectedCount > 0) {
    lines.push("", `⚠️ ${plan.rejectedCount} día(s) sin plan válido: esos días se publica con la rotación de temas.`);
  }
  if (plan.needs.length > 0) {
    lines.push("", "✍️ *Cuentos que conviene crear:*", ...plan.needs.map((need) => `- ${need}`));
  }
  return lines.join("\n");
}

export function buildPlanFailureAlert(weekStart: string, error: unknown): string {
  return `❌ *No se ha podido generar el plan de la semana del ${shortDate(weekStart).slice(4)}*\n${describeFailure(error)}\nEsa semana se publicará con la rotación de temas.`;
}

const PLATFORM_LABEL: Record<string, string> = {
  facebook: "Post de Facebook",
  instagram: "Post de Instagram",
  facebook_story: "Story de Facebook",
  instagram_story: "Story de Instagram",
};

// Resumen del control de última hora del día (ver social-health-check.ts).
export function buildHealthAlert({ missingPlatforms, missingNextWeekPlan, metaTokenProblem }: {
  missingPlatforms: string[];
  missingNextWeekPlan: string | null; // lunes de la semana sin plan, solo se comprueba los jueves
  metaTokenProblem: string | null;
}): string | null {
  const problems: string[] = [];
  if (missingPlatforms.length > 0) {
    problems.push(`Hoy no ha salido: ${missingPlatforms.map((platform) => PLATFORM_LABEL[platform] ?? platform).join(", ")}.`);
  }
  if (missingNextWeekPlan) {
    problems.push(`No se ha generado el plan de la semana del ${shortDate(missingNextWeekPlan).slice(4)}: esa semana se publicará con la rotación de temas.`);
  }
  if (metaTokenProblem) problems.push(metaTokenProblem);
  if (problems.length === 0) return null;
  return ["🔎 *Revisión diaria de redes*", ...problems.map((problem) => `- ${problem}`)].join("\n");
}

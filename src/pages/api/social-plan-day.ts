import { getStoryById, hasWeekPlan, upsertPlanDay } from "@src/turso";
import { SOCIAL_AGES, SOCIAL_FORMAT_IDS } from "@src/utils/socialFormats";
import { mondayOf } from "@src/utils/socialPlanner";

// Cambia un día del plan semanal desde el panel /admin/redes-sociales: el
// cuento, el formato o el enfoque. El plan se publica solo, sin revisión;
// esto es lo que permite corregirlo cuando algo no convence. También sirve
// para rellenar un día que la IA dejó sin plan válido. La semana tiene que
// tener plan: una semana sin plan usa la rotación de temas.
export async function POST({ request }: { request: Request }) {
  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

  const body = await request.json().catch(() => null) as { date?: string; storyId?: number; format?: string; angle?: string } | null;
  if (!body?.date || !/^\d{4}-\d{2}-\d{2}$/.test(body.date)) return json({ error: "Fecha no válida" }, 400);
  if (!body.format || !(SOCIAL_FORMAT_IDS as string[]).includes(body.format)) return json({ error: "Formato no válido" }, 400);
  const angle = (body.angle ?? "").trim();
  if (angle.length > 200) return json({ error: "El enfoque no puede pasar de 200 caracteres" }, 400);

  const weekStart = mondayOf(new Date(`${body.date}T12:00:00Z`));
  if (!await hasWeekPlan(weekStart)) return json({ error: `La semana del ${weekStart} no tiene plan` }, 400);

  const story = body.storyId ? await getStoryById(Number(body.storyId)) : undefined;
  if (!story) return json({ error: "No existe ese cuento" }, 400);
  if (!SOCIAL_AGES.includes(story.age as string)) return json({ error: `Ese cuento es para ${story.age} años: en redes solo se publican ${SOCIAL_AGES.join(", ")}` }, 400);

  await upsertPlanDay({ date: body.date, weekStart, storyId: Number(story.id), format: body.format, angle });
  return json({ ok: true, date: body.date, storyId: Number(story.id), title: story.title, format: body.format, angle });
}

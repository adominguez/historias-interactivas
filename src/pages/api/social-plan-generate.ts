import { hasWeekPlan, saveWeekPlan } from "@src/turso";
import { generateWeekPlan, nextMondayOf, isMonday, weekdayOf } from "@src/utils/socialPlanner";
import { sendWhatsApp } from "@src/utils/notify";
import { buildPlanAlert, buildPlanFailureAlert } from "@src/utils/socialAlerts";

// Genera el plan de redes de una semana (ver utils/socialPlanner.ts). Lo
// dispara un cron cada jueves (vercel.json) para la semana SIGUIENTE: así
// queda de jueves a domingo para consultarlo (/api/social-plan) y para crear
// los cuentos que el plan diga que faltan.
//
// ?week=YYYY-MM-DD planifica esa semana (tiene que ser lunes) en vez de la
// siguiente. ?dryRun=1 genera y devuelve el plan sin guardarlo. ?force=1
// sustituye un plan que ya exista; sin él, una segunda llamada no gasta otra
// generación ni pisa el plan que ya hay.
export async function GET(request: Request) {
  const url = new URL(request.url);
  const dryRun = url.searchParams.get("dryRun") === "1";
  const force = url.searchParams.get("force") === "1";
  const weekStart = url.searchParams.get("week") ?? nextMondayOf(new Date());

  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

  if (!isMonday(weekStart)) {
    return json({ error: `"${weekStart}" no es un lunes (formato YYYY-MM-DD)` }, 400);
  }

  try {
    if (!dryRun && !force && await hasWeekPlan(weekStart)) {
      return json({ skipped: true, reason: `Ya hay plan para la semana del ${weekStart}. Usa ?force=1 para sustituirlo.`, weekStart });
    }

    const { plan, rejected, candidates } = await generateWeekPlan(weekStart);

    // Sin ningún día válido no se guarda nada: esa semana se publica con la
    // rotación de temas, igual que si el plan no existiera.
    if (plan.days.length === 0) {
      console.error("Plan semanal sin ningún día válido:", rejected);
      if (!dryRun) await sendWhatsApp(buildPlanFailureAlert(weekStart, "La IA no propuso ningún día válido."));
      return json({ error: "La IA no propuso ningún día válido", weekStart, rejected }, 500);
    }

    const titleById = new Map(candidates.map(({ id, title }) => [id, title]));

    if (!dryRun) {
      await saveWeekPlan(plan);
      // El resumen del plan llega por WhatsApp: se publica solo, sin
      // aprobarlo, así que esto es lo que permite echarle un vistazo.
      await sendWhatsApp(buildPlanAlert({
        ...plan,
        days: plan.days.map(({ date, storyId }) => ({ date, title: titleById.get(storyId) })),
        rejectedCount: rejected.length,
      }));
    }
    return json({
      dryRun,
      weekStart,
      themeLabel: plan.themeLabel,
      themeHashtag: plan.themeHashtag,
      rationale: plan.rationale,
      needs: plan.needs,
      specialDates: plan.specialDates,
      days: plan.days.map((day) => ({ ...day, weekday: weekdayOf(day.date), title: titleById.get(day.storyId) })),
      rejected,
    });
  } catch (error) {
    console.error("Fallo en social-plan-generate:", error);
    if (!dryRun) await sendWhatsApp(buildPlanFailureAlert(weekStart, error));
    return json({ error: String(error), weekStart }, 500);
  }
}

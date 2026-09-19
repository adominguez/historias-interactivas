import { hasSuccessfulPostSince, hasWeekPlan } from "@src/turso";
import { PLATFORMS_BY_SURFACE } from "@src/utils/socialFormats";
import { nextMondayOf } from "@src/utils/socialPlanner";
import { getMetaTokenProblem } from "@src/utils/metaToken";
import { buildHealthAlert } from "@src/utils/socialAlerts";
import { sendWhatsApp } from "@src/utils/notify";

// Revisión diaria de las redes, a última hora (ver vercel.json). Los avisos
// de social-auto-post.ts cubren lo que falla mientras se ejecuta; esto cubre
// lo que ninguna ejecución puede avisar porque ni siquiera ocurrió: un cron
// que Vercel no llegó a lanzar, una función que agotó sus 60s a medias, el
// plan del jueves que no se generó. Además vigila el token de Meta (ver
// utils/metaToken.ts). Si todo está bien, no manda nada.
//
// ?dryRun=1 hace la revisión y devuelve el informe sin enviar el WhatsApp.
export async function GET(request: Request) {
  const dryRun = new URL(request.url).searchParams.get("dryRun") === "1";
  const now = new Date();
  const startOfUtcDay = `${now.toISOString().slice(0, 10)} 00:00:00`;

  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

  try {
    const platforms = [...PLATFORMS_BY_SURFACE.feed, ...PLATFORMS_BY_SURFACE.story];
    const published = await Promise.all(platforms.map((platform) => hasSuccessfulPostSince(startOfUtcDay, [platform])));
    const missingPlatforms = platforms.filter((_, i) => !published[i]);

    // El plan se genera los jueves por la mañana: esta revisión, a última
    // hora del jueves, comprueba que de verdad quedó hecho.
    const nextMonday = nextMondayOf(now);
    const missingNextWeekPlan = now.getUTCDay() === 4 && !(await hasWeekPlan(nextMonday)) ? nextMonday : null;

    const metaTokenProblem = await getMetaTokenProblem(now);

    const alert = buildHealthAlert({ missingPlatforms, missingNextWeekPlan, metaTokenProblem });
    const notified = alert && !dryRun ? await sendWhatsApp(alert) : false;

    return json({ dryRun, missingPlatforms, missingNextWeekPlan, metaTokenProblem, alert, notified });
  } catch (error) {
    console.error("Fallo en social-health-check:", error);
    if (!dryRun) await sendWhatsApp(`❌ *La revisión diaria de redes ha fallado*\n${String(error).slice(0, 300)}`);
    return json({ error: String(error) }, 500);
  }
}

import { collectSocialInsights } from "@src/utils/socialInsights";
import { sendWhatsApp } from "@src/utils/notify";

// Recoge las estadísticas de redes (ver utils/socialInsights.ts). La lanza
// un cron diario a las 15:00 UTC (vercel.json): antes de la Story de las
// 16:00, para que la del día anterior tenga todavía menos de 24 horas, que
// es lo que duran los datos de una Story de Instagram. También se puede
// lanzar a mano desde el panel /admin/redes-sociales.
export async function GET() {
  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

  try {
    const report = await collectSocialInsights();
    // Un fallo suelto (una publicación borrada a mano en Instagram) no merece
    // un aviso; que no se haya podido leer NADA, sí: suele ser el token.
    if (report.errors.length > 0 && report.postsUpdated === 0 && report.followers.instagram === null) {
      await sendWhatsApp(`⚠️ *No se han podido recoger las estadísticas de redes*\n${report.errors[0]}`);
    }
    return json(report);
  } catch (error) {
    console.error("Fallo en social-insights-collect:", error);
    await sendWhatsApp(`❌ *La recogida de estadísticas de redes ha fallado*\n${String(error).slice(0, 300)}`);
    return json({ error: String(error) }, 500);
  }
}

import { sendWhatsApp } from "@src/utils/notify";

// Botón "Enviar WhatsApp de prueba" del panel /admin/redes-sociales: para
// comprobar que CALLMEBOT_PHONE / CALLMEBOT_APIKEY están bien puestas en el
// entorno donde corre la web (Vercel), no solo en local.
export async function POST() {
  const ok = await sendWhatsApp("🌳 *El Árbol de las Historias*\nMensaje de prueba enviado desde el panel de redes sociales. Los avisos funcionan.");
  return new Response(JSON.stringify({ ok }), {
    status: ok ? 200 : 500,
    headers: { "Content-Type": "application/json" },
  });
}

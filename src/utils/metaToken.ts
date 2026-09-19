import { FACEBOOK_API_TOKEN, FACEBOOK_API_VERSION } from "astro:env/server";

// Estado del token de Meta, para la revisión diaria (ver
// pages/api/social-health-check.ts). El token de página no caduca, pero Meta
// corta el ACCESO A LOS DATOS cada 90 días si nadie vuelve a autorizar la app
// ("data_access_expires_at"): a partir de ese día las publicaciones fallan
// sin más aviso. Ya pasó una vez (7 sept 2026). Esto avisa con antelación.

// Días antes del corte en que se avisa: lo bastante pronto para no ir con
// prisas, sin mandar un recordatorio diario durante tres semanas.
const REMINDER_DAYS = new Set([21, 14, 7, 3, 2, 1]);
const REQUIRED_SCOPES = ["pages_manage_posts", "instagram_content_publish"];
const DAY_MS = 24 * 60 * 60 * 1000;

type DebugTokenData = {
  is_valid?: boolean;
  data_access_expires_at?: number; // segundos Unix; 0 o ausente = sin fecha
  scopes?: string[];
  error?: { message?: string };
};

export function metaTokenProblemFrom(data: DebugTokenData, now: Date): string | null {
  if (!data.is_valid) {
    return `El token de Meta no es válido${data.error?.message ? ` (${data.error.message})` : ""}. Hay que regenerarlo y actualizar FACEBOOK_API_TOKEN en Vercel.`;
  }

  const missingScopes = REQUIRED_SCOPES.filter((scope) => !data.scopes?.includes(scope));
  if (missingScopes.length > 0) {
    return `Al token de Meta le faltan permisos para publicar: ${missingScopes.join(", ")}.`;
  }

  if (data.data_access_expires_at) {
    const daysLeft = Math.ceil((data.data_access_expires_at * 1000 - now.getTime()) / DAY_MS);
    if (daysLeft <= 0) {
      return "Meta ha cortado el acceso a los datos del token: las publicaciones van a fallar. Hay que volver a generar el token (Graph API Explorer).";
    }
    if (REMINDER_DAYS.has(daysLeft)) {
      const date = new Date(data.data_access_expires_at * 1000).toISOString().slice(0, 10);
      return `Quedan ${daysLeft} día(s) para que Meta corte el acceso del token (${date}). Regenéralo antes en el Graph API Explorer o las publicaciones dejarán de salir.`;
    }
  }

  return null;
}

// Permisos que usa el sistema además de los de publicar: sin ellos todo
// sigue publicándose, pero el panel se queda sin estadísticas.
export const INSIGHTS_SCOPES = ["instagram_manage_insights", "read_insights"];

// Lo que devuelve Meta sobre el token, tal cual (para el panel
// /admin/redes-sociales). Lanza si Meta no responde.
export async function getMetaTokenInfo(): Promise<DebugTokenData & { type?: string; expires_at?: number }> {
  const url = `https://graph.facebook.com/${FACEBOOK_API_VERSION}/debug_token?input_token=${FACEBOOK_API_TOKEN}&access_token=${FACEBOOK_API_TOKEN}`;
  const response = await fetch(url, { signal: AbortSignal.timeout(15000) });
  const body = await response.json() as { data?: DebugTokenData & { type?: string; expires_at?: number }; error?: { message?: string } };
  return body.data ?? { is_valid: false, error: body.error };
}

export async function getMetaTokenProblem(now: Date): Promise<string | null> {
  try {
    return metaTokenProblemFrom(await getMetaTokenInfo(), now);
  } catch (error) {
    // Que Meta no responda a esta consulta no es motivo para dar la alarma
    // del token: si el token falla de verdad, lo dirá la publicación.
    console.error("No se pudo consultar el estado del token de Meta:", error);
    return null;
  }
}

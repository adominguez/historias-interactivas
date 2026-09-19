import { CALLMEBOT_PHONE, CALLMEBOT_APIKEY } from "astro:env/server";

// Avisos por WhatsApp al dueño del proyecto, vía CallMeBot: una petición GET
// a su API con el texto en la URL, y el mensaje llega al móvil. Se usa para
// lo que requiere que alguien haga algo (una publicación que falla, el saldo
// de OpenAI agotado, el token de Meta caducado, un día sin publicar) y para
// el resumen del plan semanal de los jueves — nada más, para que los avisos
// no acaben ignorándose por ruido.
//
// Regla de oro: avisar NUNCA puede romper lo que avisa. sendWhatsApp no
// lanza nunca; si CallMeBot falla o tarda, se deja constancia en el log y
// sigue todo igual.

const CALLMEBOT_URL = "https://api.callmebot.com/whatsapp.php";
const CALLMEBOT_TIMEOUT_MS = 10000;
// CallMeBot mete el texto en la URL: un mensaje enorme (p. ej. un error con
// una respuesta HTML entera dentro) podría superar el largo máximo de URL.
const MAX_MESSAGE_CHARS = 1500;

export async function sendWhatsApp(text: string): Promise<boolean> {
  if (!CALLMEBOT_PHONE || !CALLMEBOT_APIKEY) {
    console.warn("Aviso por WhatsApp no enviado: faltan CALLMEBOT_PHONE / CALLMEBOT_APIKEY.", text);
    return false;
  }

  const message = text.length > MAX_MESSAGE_CHARS ? `${text.slice(0, MAX_MESSAGE_CHARS - 1)}…` : text;
  const url = `${CALLMEBOT_URL}?phone=${encodeURIComponent(CALLMEBOT_PHONE)}&text=${encodeURIComponent(message)}&apikey=${encodeURIComponent(CALLMEBOT_APIKEY)}`;

  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(CALLMEBOT_TIMEOUT_MS) });
    // CallMeBot contesta 200 también cuando rechaza el envío (clave
    // incorrecta, número no registrado...): el único indicio fiable de éxito
    // es el texto "Message queued" de su respuesta.
    const body = await response.text();
    if (!response.ok || !/queued/i.test(body)) {
      console.error(`CallMeBot no aceptó el aviso (${response.status}):`, body.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").slice(0, 500));
      return false;
    }
    return true;
  } catch (error) {
    console.error("No se pudo enviar el aviso por WhatsApp:", error);
    return false;
  }
}

// Traduce un fallo técnico a una frase que diga qué ha pasado y, si se sabe,
// qué hacer. Acepta tanto los errores que se lanzan (OpenAI, timeouts) como
// los textos de error que devuelven postToFacebook/postToInstagram, que son
// la respuesta JSON de la Graph API de Meta tal cual.
export function describeFailure(failure: unknown): string {
  const text = failure instanceof Error
    ? `${failure.name}: ${failure.message} ${String((failure as { responseBody?: unknown }).responseBody ?? "")}`
    : typeof failure === "string" ? failure : JSON.stringify(failure);

  if (/insufficient_quota|exceeded your current quota/i.test(text)) {
    return "Se ha acabado el saldo de OpenAI. Recárgalo en platform.openai.com → Billing.";
  }
  if (/invalid_api_key|Incorrect API key/i.test(text)) {
    return "La clave de OpenAI no es válida (OPENAI_API_KEY).";
  }

  const metaError = parseMetaError(text);
  if (metaError) {
    const { code, error_subcode: subcode, message } = metaError;
    if (code === 190) {
      return "El token de Meta ha caducado o ya no es válido. Hay que regenerarlo en el Graph API Explorer y actualizar FACEBOOK_API_TOKEN en Vercel.";
    }
    if (subcode === 2207052) {
      return "Instagram no pudo descargar la imagen, ni reintentándolo. Suele ser un fallo puntual de Instagram.";
    }
    if (code === 10 || code === 200 || code === 3) {
      return `Al token de Meta le falta un permiso: ${message}`;
    }
    if (code === 4 || code === 17 || code === 32 || code === 613) {
      return "Meta está limitando las peticiones por exceso de llamadas. Se puede reintentar más tarde.";
    }
    return `Meta respondió: ${message}`;
  }

  if (/TimeoutError|AbortError|timed out|aborted due to timeout/i.test(text)) {
    return "Una llamada tardó demasiado y se cortó (timeout).";
  }

  return text.length > 300 ? `${text.slice(0, 300)}…` : text;
}

type MetaError = { message: string; code?: number; error_subcode?: number };

function parseMetaError(text: string): MetaError | undefined {
  const start = text.indexOf('{"error"');
  if (start === -1) return undefined;
  try {
    const parsed = JSON.parse(text.slice(start)) as { error?: MetaError };
    return parsed.error?.message ? parsed.error : undefined;
  } catch {
    return undefined;
  }
}

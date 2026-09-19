import { defineMiddleware } from "astro:middleware";
import { isAuthorized, isAuthorizedCron } from "@src/utils/auth";

// Endpoints de /api que usa el propio sitio público (buscador, valorar un
// cuento) y por tanto NO deben pedir usuario/contraseña. Todo lo demás bajo
// /admin y /api se protege por defecto: así un endpoint nuevo que se añada
// mañana queda protegido automáticamente en vez de quedar abierto por
// olvido (el fallo seguro es "pide login", no "lo dejo público").
const PUBLIC_API_PATHS = new Set([
  "/api/search-story",
  "/api/update-rating",
]);

// Los endpoints que disparan los crons de Vercel (ver vercel.json): la
// publicación diaria y la planificación semanal. Siguen exigiendo Basic Auth
// como cualquier otro endpoint de /api para quien los llame a mano (útil
// para probar en local con ?dryRun=1) — solo ganan una SEGUNDA vía de
// entrada válida (el bearer del cron, ver isAuthorizedCron), nunca quedan en
// PUBLIC_API_PATHS.
const CRON_PATHS = new Set([
  "/api/social-auto-post",
  "/api/social-plan-generate",
]);

const needsAuth = (pathname: string) =>
  pathname.startsWith("/admin") || (pathname.startsWith("/api/") && !PUBLIC_API_PATHS.has(pathname));

export const onRequest = defineMiddleware((context, next) => {
  if (CRON_PATHS.has(context.url.pathname) && isAuthorizedCron(context.request)) {
    return next();
  }

  if (!needsAuth(context.url.pathname)) {
    return next();
  }

  if (!isAuthorized(context.request)) {
    return new Response("Autenticación requerida", {
      status: 401,
      headers: { "WWW-Authenticate": 'Basic realm="Admin"' },
    });
  }

  return next();
});

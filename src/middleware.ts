import { defineMiddleware } from "astro:middleware";
import { isAuthorized } from "@src/utils/auth";

// Endpoints de /api que usa el propio sitio público (buscador, valorar un
// cuento) y por tanto NO deben pedir usuario/contraseña. Todo lo demás bajo
// /admin y /api se protege por defecto: así un endpoint nuevo que se añada
// mañana queda protegido automáticamente en vez de quedar abierto por
// olvido (el fallo seguro es "pide login", no "lo dejo público").
const PUBLIC_API_PATHS = new Set([
  "/api/search-story",
  "/api/update-rating",
]);

const needsAuth = (pathname: string) =>
  pathname.startsWith("/admin") || (pathname.startsWith("/api/") && !PUBLIC_API_PATHS.has(pathname));

export const onRequest = defineMiddleware((context, next) => {
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

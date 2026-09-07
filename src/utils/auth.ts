import { ADMIN_USERNAME, ADMIN_PASSWORD, CRON_SECRET } from "astro:env/server";

// Comprueba las credenciales HTTP Basic de una petición (ver
// src/middleware.ts, que usa esto para proteger /admin y /api). Se exporta
// aparte para que las páginas públicas también puedan comprobar "¿este
// visitante ya está logado como admin?" y mostrar acciones de edición solo
// en ese caso — los navegadores reenvían las credenciales cacheadas del
// mismo origen aunque la página en sí no las exija.
export const isAuthorized = (request: Request) => {
  const header = request.headers.get("authorization");
  if (!header?.startsWith("Basic ")) return false;

  const decoded = atob(header.slice("Basic ".length));
  const separatorIndex = decoded.indexOf(":");
  if (separatorIndex === -1) return false;

  const user = decoded.slice(0, separatorIndex);
  const pass = decoded.slice(separatorIndex + 1);
  return user === ADMIN_USERNAME && pass === ADMIN_PASSWORD;
};

// Comprueba si una petición trae el secreto del cron de Vercel (ver
// src/middleware.ts). Vercel añade automáticamente la cabecera
// "Authorization: Bearer $CRON_SECRET" a las peticiones que dispara su
// propio cron, y no puede mandar Basic Auth — así que el único endpoint que
// el cron llama (/api/social-auto-post) necesita esta segunda vía de
// entrada, aparte de isAuthorized, sin debilitarlo: esto NO sirve como login
// general, solo se comprueba desde ese path concreto.
export const isAuthorizedCron = (request: Request) => {
  const header = request.headers.get("authorization");
  return header === `Bearer ${CRON_SECRET}`;
};

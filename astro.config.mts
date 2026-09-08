// @ts-check
// @ts-check
import { defineConfig, envField } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import vercel from '@astrojs/vercel';
import react from '@astrojs/react';
import tailwind from '@astrojs/tailwind';
import { loadEnv } from "vite";
const { TURSO_DATABASE_URL, TURSO_AUTH_TOKEN } = loadEnv(process.env.NODE_ENV as string, process.cwd(), "");
import { createClient } from "@libsql/client/web";

const turso = createClient({
  url: TURSO_DATABASE_URL,
  authToken: TURSO_AUTH_TOKEN,
});

const getStoriesList = async () => {
  const result = await turso.execute({
    sql: `
      SELECT * FROM stories;
    `,
    args: [],
  });
  return result.rows;
}

export const getCategories = async () => {
  const result = await turso.execute({
    sql: `
      SELECT * FROM categories;
    `,
    args: [],
  });

  return result.rows;
}

// Solo cuentos (raíz) y categorías. Las páginas de nodo (/{cuento}/{rama})
// NO van al sitemap: se sirven con noindex,follow (ver BaseHead.astro) porque
// eran ~1.200 de las ~1.400 URLs del sitio sin ninguna intención de búsqueda
// propia, y ese volumen de contenido fino lastraba al dominio entero.
let customPages: string[] = [];
try {
  const stories = await getStoriesList();
  const categories = await getCategories();
  const customStories = stories.map(({ slug }) => `https://elarboldelashistorias.com/${slug}`);
  const customCategories = categories.map(({ slug }) => `https://elarboldelashistorias.com/cuentos/${slug}`);
  customPages = [...customStories, ...customCategories];
} catch (error) {
  console.warn("No se pudieron cargar las páginas dinámicas para el sitemap desde Turso, se omitirán en este build:", error);
}

// https://astro.build/config
export default defineConfig({
  site: 'https://elarboldelashistorias.com',
  integrations: [sitemap({
    // Las páginas de /admin (protegidas por Basic Auth, nunca indexables)
    // se colaban en el sitemap público -- @astrojs/sitemap las descubre
    // solo por existir como páginas reales de Astro, sin pasar por
    // customPages, así que hay que filtrarlas aquí explícitamente en vez
    // de simplemente no añadirlas a customPages.
    filter: (page) => !page.includes("/admin"),
    serialize(item) {
      const lastCharacter = item.url.slice(-1);
      if (lastCharacter === "/") {
        item.url = item.url.slice(0, -1);
      }
      return item;
    },
    customPages
  }), tailwind(), react()],
  output: 'server',
  adapter: vercel({
    edgeMiddleware: true,
    // El plan de Vercel es Hobby: el límite duro de maxDuration ahí es 60s
    // (un valor mayor hace que TODO el deploy falle con
    // "invalid_max_duration", no solo la función afectada). /api/social-auto-post
    // puede acercarse a ese límite en el peor caso (IA + Facebook + espera
    // de Instagram), así que un timeout ocasional ahí es un riesgo aceptado
    // por ahora -- si vuelve a dar problemas, hay que optimizar esa ruta o
    // pasar a plan Pro (hasta 300s) en vez de subir este número.
    maxDuration: 60,
  }),
  vite: {
    ssr: {
      // dictionary-es usa top-level await para leer sus ficheros (aff/dic)
      // con node:fs/promises; solo se usa en servidor, así que dejamos que
      // Node lo cargue de forma nativa en vez de que esbuild lo empaquete
      // para un target de navegador que no soporta top-level await.
      external: ['dictionary-es'],
    },
    optimizeDeps: {
      // El pre-empaquetado de dependencias de Vite en dev usa esbuild con el
      // mismo target de navegador y falla igual si no lo excluimos aquí también.
      exclude: ['dictionary-es'],
    },
  },
  env: {
    schema: {
      TURSO_DATABASE_URL: envField.string({ context: "server", access: "secret" }),
      TURSO_AUTH_TOKEN: envField.string({ context: "server", access: "secret" }),
      OPENAI_API_KEY: envField.string({ context: "server", access: "secret" }),
      PUBLIC_CLOUDINARY_CLOUD_NAME: envField.string({ context: "server", access: "public" }),
      PUBLIC_CLOUDINARY_API_KEY: envField.string({ context: "server", access: "public" }),
      CLOUDINARY_API_SECRET: envField.string({ context: "server", access: "secret" }),
      FACEBOOK_API_TOKEN: envField.string({ context: "server", access: "secret" }),
      FACEBOOK_PAGE_ID: envField.string({ context: "server", access: "public" }),
      FACEBOOK_API_VERSION: envField.string({ context: "server", access: "public" }),
      INSTAGRAM_PAGE_ID: envField.string({ context: "server", access: "public" }),
      SITE_URL: envField.string({ context: "server", access: "secret" }),
      ADMIN_USERNAME: envField.string({ context: "server", access: "secret" }),
      ADMIN_PASSWORD: envField.string({ context: "server", access: "secret" }),
      CRON_SECRET: envField.string({ context: "server", access: "secret" }),
    }
  }
});
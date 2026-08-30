// @ts-check
// @ts-check
import { defineConfig, envField } from 'astro/config';
import mdx from '@astrojs/mdx';
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

export const getTotalNodes = async () => {
  const result = await turso.execute({
    sql: `
      SELECT * FROM nodes;
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

const stories = await getStoriesList();
const nodes = await getTotalNodes();
const categories = await getCategories();
const customStories = stories.map(({ slug }) => `https://elarboldelashistorias.com/${slug}`);
const customNodes = nodes.map(({ slug, parent_slug }) => `https://elarboldelashistorias.com/${parent_slug}/${slug}`);
const customCategories = categories.map(({ slug }) => `https://elarboldelashistorias.com/cuentos/${slug}`);

const customPages = [...customStories, ...customNodes, ...customCategories];

// https://astro.build/config
export default defineConfig({
  site: 'https://elarboldelashistorias.com',
  integrations: [mdx(), sitemap({
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
    }
  }
});
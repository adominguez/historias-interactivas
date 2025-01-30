// @ts-check
// @ts-check
import { defineConfig, envField } from 'astro/config';
import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';
import vercel from '@astrojs/vercel';
import react from '@astrojs/react';

import tailwind from '@astrojs/tailwind';

// https://astro.build/config
export default defineConfig({
    site: 'https://example.com',
    integrations: [mdx(), sitemap(), tailwind(), react()],
    output: 'server',
    adapter: vercel({
        edgeMiddleware: true,
    }),
    env: {
        schema: {
            TURSO_DATABASE_URL: envField.string({ context: "server", access: "secret" }),
            TURSO_AUTH_TOKEN: envField.string({ context: "server", access: "secret" }),
            OPENAI_API_KEY: envField.string({ context: "server", access: "secret" }),
            PUBLIC_CLOUDINARY_CLOUD_NAME: envField.string({ context: "server", access: "public" }),
            PUBLIC_CLOUDINARY_API_KEY: envField.string({ context: "server", access: "public" }),
            CLOUDINARY_API_SECRET: envField.string({ context: "server", access: "secret" }),
            SITE_URL: envField.string({ context: "server", access: "secret" }),
        }
    }
});
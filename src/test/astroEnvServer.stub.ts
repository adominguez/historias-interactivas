// Doble de prueba del módulo virtual `astro:env/server`.
//
// Ese módulo lo genera Astro en tiempo de build a partir del `env.schema` de
// astro.config.mts, así que fuera de Astro (es decir, bajo vitest) no existe
// y cualquier test que importe, aun indirectamente, un fichero que lo use
// falla al resolverlo. vitest.config.ts lo apunta aquí con un alias.
//
// Están declaradas TODAS las claves del esquema, no solo las que usa el test
// de hoy: así, cuando mañana se testee otro módulo que lea una variable
// distinta, no hay que volver a tocar este fichero. Los valores son
// deliberadamente falsos y evidentes -- nada aquí debe parecerse a un secreto
// real ni servir para hablar con un servicio de verdad.
export const TURSO_DATABASE_URL = "libsql://base-de-datos-de-prueba";
export const TURSO_AUTH_TOKEN = "token-de-prueba";
export const OPENAI_API_KEY = "clave-openai-de-prueba";
export const PUBLIC_CLOUDINARY_CLOUD_NAME = "cloud-de-prueba";
export const PUBLIC_CLOUDINARY_API_KEY = "clave-cloudinary-de-prueba";
export const CLOUDINARY_API_SECRET = "secreto-cloudinary-de-prueba";
export const FACEBOOK_API_TOKEN = "token-facebook-de-prueba";
export const FACEBOOK_PAGE_ID = "000000000000000";
export const FACEBOOK_API_VERSION = "v21.0";
export const INSTAGRAM_PAGE_ID = "111111111111111";
export const SITE_URL = "https://ejemplo-de-prueba.invalid";
export const ADMIN_USERNAME = "usuario-de-prueba";
export const ADMIN_PASSWORD = "contrasena-de-prueba";
export const CRON_SECRET = "secreto-de-cron-de-prueba";

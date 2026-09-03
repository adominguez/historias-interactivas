import { v2 as cloudinary } from "cloudinary";
import { writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

// Las portadas de categoría (cuentos-interactivos/categories/{name}_cat) no
// llevan versión en la URL que genera Categories.astro, así que al
// resubir una imagen el CDN de Cloudinary (y el propio navegador) puede
// seguir sirviendo la versión cacheada durante horas pese a invalidate:true.
// Este script vuelca a JSON la versión actual de cada portada para que
// Categories.astro la pase explícitamente a CldImage (mismo patrón que
// stories.image_version en LayoutStory.astro) y así cada resubida rompa
// la caché de verdad.
const cloudName = process.env.PUBLIC_CLOUDINARY_CLOUD_NAME;
const apiKey = process.env.PUBLIC_CLOUDINARY_API_KEY;
const apiSecret = process.env.CLOUDINARY_API_SECRET;
if (!cloudName || !apiKey || !apiSecret) {
  console.error("Faltan credenciales de Cloudinary (usa: node --env-file=.env scripts/fetch-category-cover-versions.mjs).");
  process.exit(1);
}

cloudinary.config({ cloud_name: cloudName, api_key: apiKey, api_secret: apiSecret });

const CATEGORY_NAMES = [
  "fantasy", "pirates", "mystery", "science-fiction", "love", "fear", "halloween",
  "superheroes", "horror", "adventures", "princesses", "christmas", "history",
  "mythology", "animals", "values", "children", "kids", "teens", "adults",
];

const versions = {};
for (const name of CATEGORY_NAMES) {
  const publicId = `cuentos-interactivos/categories/${name}_cat`;
  const result = await cloudinary.api.resource(publicId);
  versions[name] = result.version;
  console.log(`${name}: v${result.version}`);
}

const outPath = join(dirname(fileURLToPath(import.meta.url)), "..", "src", "data", "categoryCoverVersions.json");
writeFileSync(outPath, JSON.stringify(versions, null, 2) + "\n");
console.log(`Guardado en ${outPath}`);

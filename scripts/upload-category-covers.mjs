import { v2 as cloudinary } from "cloudinary";
import { readdirSync } from "node:fs";
import { join, dirname, basename, extname } from "node:path";
import { fileURLToPath } from "node:url";

// Sube las portadas de categoría generadas manualmente (vía ChatGPT, revisadas
// en category-covers-preview/) a Cloudinary, en
// cuentos-interactivos/categories/{name}_cat -- mismo public_id que ya usa
// Categories.astro.
const cloudName = process.env.PUBLIC_CLOUDINARY_CLOUD_NAME;
const apiKey = process.env.PUBLIC_CLOUDINARY_API_KEY;
const apiSecret = process.env.CLOUDINARY_API_SECRET;
if (!cloudName || !apiKey || !apiSecret) {
  console.error("Faltan credenciales de Cloudinary (usa: node --env-file=.env scripts/upload-category-covers.mjs).");
  process.exit(1);
}

cloudinary.config({ cloud_name: cloudName, api_key: apiKey, api_secret: apiSecret });

const SRC_DIR = join(dirname(fileURLToPath(import.meta.url)), "..", "category-covers-preview");

// Nombre de fichero -> nombre de categoría real (el name de la tabla categories).
const RENAME = {
  mithology: "mythology",
};

const files = readdirSync(SRC_DIR).filter((f) => extname(f).toLowerCase() === ".png");

for (const file of files) {
  const stem = basename(file, extname(file)).replace(/_cat$/, "");
  const targetName = RENAME[stem] ?? stem;
  const publicId = `cuentos-interactivos/categories/${targetName}_cat`;
  process.stdout.write(`Subiendo ${file} -> ${publicId}... `);
  const result = await cloudinary.uploader.upload(join(SRC_DIR, file), {
    public_id: publicId,
    overwrite: true,
    invalidate: true,
  });
  console.log(`ok (v${result.version})`);
}

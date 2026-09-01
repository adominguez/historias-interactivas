import OpenAI from "openai";
import { writeFileSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

// Genera un puñado de assets decorativos estáticos (esquinas de enredadera
// dorada) para el rediseño visual del sitio. No forma parte del pipeline de
// generación de cuentos (create-story.ts) -- es un script de un solo uso,
// se ejecuta a mano y se descarta.
const apiKey = process.env.OPENAI_API_KEY;
if (!apiKey) {
  console.error("Falta OPENAI_API_KEY en el entorno (usa: node --env-file=.env scripts/generate-decorative-assets.mjs).");
  process.exit(1);
}

const ia = new OpenAI({ apiKey });

const OUT_DIR = join(dirname(fileURLToPath(import.meta.url)), "..", "public", "decorative");
mkdirSync(OUT_DIR, { recursive: true });

const STYLE = "Antique gold botanical vine and leaf ornament, hand-painted storybook illustration style, delicate curling ivy branch with small leaves and tiny berries, warm metallic gold linework with soft painterly shading and subtle depth, isolated on a fully transparent background, no text, no watermark, no frame, no background color of any kind -- pure PNG transparency. Elegant fairytale aesthetic matching a dark forest-green and antique-gold color palette, in the style of vintage hardcover book cover filigree.";

const assets = [
  {
    file: "corner-ornament-large.png",
    size: "1024x1024",
    transparent: true,
    prompt: `${STYLE} Corner flourish composition: a bold, dense vine cluster anchored in the top-left, tapering off diagonally toward the bottom-right corner.`,
  },
  {
    file: "corner-sprig-small.png",
    size: "1024x1024",
    transparent: true,
    prompt: `${STYLE} Corner flourish composition: a single slender leafy sprig, minimal and delicate, anchored in the top-left corner.`,
  },
  {
    file: "bg-forest-texture.png",
    size: "1536x1024",
    transparent: false,
    prompt: "A dark, atmospheric hand-painted fantasy forest background texture, deep near-black forest green tones (#0B120D to #1C3524), soft glowing warm golden light filtering through unseen leaves toward the center, subtle magical dust particles floating in the air, painterly storybook illustration style, moody and mysterious atmosphere. No characters, no people, no faces, no text, no logos, no watermark. Dark vignette fading to near-black at all four edges, golden glow concentrated only toward the center. Suitable as a full-bleed website background -- no focal subject, just atmosphere and texture.",
  },
  {
    file: "bg-parchment-texture.png",
    size: "1024x1024",
    transparent: false,
    prompt: "A seamless, tileable texture of aged cream parchment paper, subtle fiber grain, warm ivory and light tan tones (#F6EEDD to #EAD9B4), soft mottled aging spots evenly distributed, very gentle and uniform lighting with no strong directional shadows or vignette. Flat, edge-to-edge texture designed to tile seamlessly when repeated in a grid -- no text, no illustrations, no borders, no darkened corners, no single focal point.",
  },
];

// ONLY_ASSETS=bg-forest-texture.png,bg-parchment-texture.png node --env-file=.env scripts/generate-decorative-assets.mjs
// para regenerar solo un subconjunto sin repetir (y pagar) los que ya están bien.
const only = process.env.ONLY_ASSETS?.split(",").map(s => s.trim());
const toGenerate = only ? assets.filter(a => only.includes(a.file)) : assets;

for (const { file, size, prompt, transparent } of toGenerate) {
  console.log(`Generando ${file}...`);
  const response = await ia.images.generate({
    model: "gpt-image-2",
    prompt,
    n: 1,
    size,
    quality: "high",
    ...(transparent ? { background: "transparent" } : {}),
  });
  const base64 = response.data?.[0]?.b64_json;
  if (!base64) {
    console.error(`  Sin imagen devuelta para ${file}, saltando.`);
    continue;
  }
  writeFileSync(join(OUT_DIR, file), Buffer.from(base64, "base64"));
  console.log(`  Guardado en public/decorative/${file}`);
}

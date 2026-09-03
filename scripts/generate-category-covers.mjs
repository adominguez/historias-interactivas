import OpenAI from "openai";
import { writeFileSync, mkdirSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

// Regenera las portadas de categoría (cuentos-interactivos/categories/{name}_cat
// en Cloudinary) con un estilo de "portada de libro ilustrada" -- escena
// pintada con el marco dorado ornamentado incluido en la propia imagen, en
// vez del estilo de emblema plano que tenían antes. Genera a local para
// revisión; la subida a Cloudinary es un paso aparte y manual.
const apiKey = process.env.OPENAI_API_KEY;
if (!apiKey) {
  console.error("Falta OPENAI_API_KEY (usa: node --env-file=.env scripts/generate-category-covers.mjs).");
  process.exit(1);
}

const ia = new OpenAI({ apiKey });
const OUT_DIR = join(dirname(fileURLToPath(import.meta.url)), "..", "category-covers-preview");
mkdirSync(OUT_DIR, { recursive: true });

const STYLE = "Richly painted fantasy storybook book cover illustration. The illustration ITSELF includes an ornate antique-gold decorative border and corner filigree, painted as an integral part of the artwork -- like a vintage leather-bound hardcover book, complete with a visible book spine along the left edge, not a flat sticker or icon. Rich jewel-toned colors (deep forest greens, navy blues, warm ambers, burgundy), painterly depth, atmospheric cinematic lighting, a real illustrated SCENE (not a flat emblem, logo, or symbol on a plain background). Portrait book-cover composition. No text, no title lettering, no watermark, no logos.";

const categories = [
  { name: "fantasy", scene: "a majestic ancient castle glowing with warm light, nestled at the edge of an enchanted forest at dusk, a winding path leading toward it" },
  { name: "pirates", scene: "a weathered pirate ship sailing rough seas under a dramatic stormy sky, sails full, a distant island silhouette on the horizon" },
  { name: "mystery", scene: "a candlelit detective's study at night, an old map and magnifying glass on a wooden desk, fog pressing against a rain-streaked window, deep shadows" },
  { name: "science-fiction", scene: "a lone astronaut silhouette gazing at a massive ringed planet and distant nebula from a starship observation deck" },
  { name: "love", scene: "two silhouettes standing beneath a blossoming tree at sunset, warm pink and gold sky, flower petals drifting in the air" },
  { name: "fear", scene: "a twisted dark forest path at night, gnarled bare trees, a pair of glowing eyes watching from the shadows, eerie fog" },
  { name: "halloween", scene: "a glowing jack-o-lantern patch under a giant full moon, bats flying across the sky, a crooked wooden fence" },
  { name: "superheroes", scene: "a caped hero silhouette standing atop a rooftop gargoyle, overlooking a glowing city skyline at dusk" },
  { name: "horror", scene: "an abandoned Victorian mansion with broken windows faintly glowing from within, dead trees, thick fog, a full moon behind storm clouds" },
  { name: "adventures", scene: "a hot air balloon soaring over dramatic mountain peaks and a sea of clouds at golden sunrise" },
  { name: "princesses", scene: "a fairytale tower window with a silhouette looking out over a kingdom at dusk, climbing roses and doves around the window" },
  { name: "christmas", scene: "a cozy snow-covered cottage with warm glowing windows, pine trees dusted with snow, gentle snowfall under a starry sky" },
  { name: "history", scene: "ancient Roman colosseum ruins bathed in golden hour light, weathered stone columns, a bird flying overhead" },
  { name: "mythology", scene: "a phoenix rising in flame above ancient temple ruins, dramatic storm clouds and lightning in the sky" },
  { name: "animals", scene: "a gentle deer and forest animals gathered in a sunlit enchanted glade, soft dappled light through the trees" },
  { name: "values", scene: "a glowing lantern being passed from one silhouetted hand to another across a warm golden bridge of light, starry dusk sky" },
  { name: "children", scene: "a cozy pastel nursery reading nook at night, soft star-shaped lights, plush toys, a crescent moon visible through the window" },
  { name: "kids", scene: "a cheerful treehouse in a sunny meadow, a rope ladder, butterflies and bright blue sky with fluffy clouds" },
  { name: "teens", scene: "a lone figure standing at the edge of a cliff at moody twilight, wind-swept hair and cloak, a mystical glowing city far below" },
  { name: "adults", scene: "a sophisticated dimly lit private library at night, towering bookshelves, a single reading lamp casting warm light, rain on the window" },
];

const only = process.env.ONLY?.split(",").map(s => s.trim());
const toGenerate = only ? categories.filter(c => only.includes(c.name)) : categories;

for (const { name, scene } of toGenerate) {
  const outPath = join(OUT_DIR, `${name}_cat.png`);
  if (existsSync(outPath) && !process.env.FORCE) {
    console.log(`Ya existe ${name}_cat.png, saltando (usa FORCE=1 para regenerar).`);
    continue;
  }
  console.log(`Generando ${name}_cat.png...`);
  const response = await ia.images.generate({
    model: "gpt-image-2",
    prompt: `${STYLE} Scene: ${scene}.`,
    n: 1,
    size: "1024x1536",
    quality: "high",
  });
  const base64 = response.data?.[0]?.b64_json;
  if (!base64) {
    console.error(`  Sin imagen para ${name}_cat.png`);
    continue;
  }
  writeFileSync(outPath, Buffer.from(base64, "base64"));
  console.log(`  Guardado en category-covers-preview/${name}_cat.png`);
}

import { v2 as cloudinary } from "cloudinary";
import { PUBLIC_CLOUDINARY_CLOUD_NAME, PUBLIC_CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET } from "astro:env/server";

cloudinary.config({
  cloud_name: PUBLIC_CLOUDINARY_CLOUD_NAME,
  api_key: PUBLIC_CLOUDINARY_API_KEY,
  api_secret: CLOUDINARY_API_SECRET,
  secure: true,
});

// A diferencia de getStoryCoverImageUrl (utils/functions.ts), que concatena
// el string de transformación a mano -- seguro solo mientras nada de lo que
// lleva dentro es texto dinámico -- aquí el storyHook viene en español, con
// "¿", "?", comas..., y una capa de texto de Cloudinary necesita ese texto
// bien codificado dentro de la propia transformación. Montarlo a mano sería
// buscarse un bug de encoding; el builder cloudinary.url() lo hace bien por
// construcción, así que esta es la única función del proyecto que construye
// una URL de Cloudinary así en vez de con el patrón de string de siempre.
//
// Ni Instagram ni Facebook exponen un enlace pulsable de verdad en su API de
// publicación (el sticker de enlace / editor de enlaces son solo funciones
// manuales de cada app, confirmado por su propia documentación) -- lo más
// honesto que se puede ofrecer es la web escrita como texto legible, no un
// enlace real.
//
// El gancho va arriba (pequeño) y la web abajo (texto de la marca de agua),
// dejando margen a las zonas donde Instagram/Facebook superponen su propia
// interfaz (cabecera con usuario/progreso arriba, caja de respuesta abajo)
// para que ningún texto quede tapado.
// Importante (perdido varias horas hasta dar con esto, confirmado contra la
// documentación oficial de Cloudinary): la gravedad y el desplazamiento
// (x/y) de una capa de texto NO van en el mismo componente que define el
// overlay (l_text/color/background/width/crop) -- puestos ahí se ignoran
// por completo y la capa siempre queda centrada, sin error visible. Van en
// el componente SIGUIENTE, junto a "flags: layer_apply". Por eso cada capa
// de texto de abajo son DOS objetos de transformación, no uno.
export const buildStoryImageUrl = ({ slug, imageVersion, hookText }: { slug: string; imageVersion: number | null; hookText: string }) =>
  cloudinary.url(`cuentos-interactivos/${slug}/${slug}`, {
    version: imageVersion ?? undefined,
    transformation: [
      { width: 1080, height: 1920, crop: "fill", gravity: "auto" },
      {
        overlay: {
          font_family: "arial",
          font_weight: "bold",
          font_size: 48,
          text: hookText,
        },
        color: "#FFFFFF",
        background: "rgb:00000099",
        width: 900,
        crop: "fit",
      },
      { flags: "layer_apply", gravity: "north", y: 280 },
      {
        // Ni Instagram ni Facebook ofrecen un enlace pulsable de verdad vía
        // API (confirmado contra la lista completa de parámetros de Meta:
        // no existe ningún campo de sticker/enlace/CTA al crear una Story).
        // Las dos cuentas SÍ tienen ya la web puesta como enlace de perfil
        // ("bio"), que es real y pulsable -- así que el texto apunta ahí en
        // vez de mostrar la URL en crudo, que no se puede tocar.
        overlay: {
          font_family: "arial",
          font_weight: "bold",
          font_size: 40,
          text: "Enlace en la bio ⤴",
        },
        color: "#FFFFFF",
        background: "rgb:00000099",
        width: 900,
        crop: "fit",
      },
      { flags: "layer_apply", gravity: "south", y: 220 },
    ],
  });

// Imagen para que el propio lector comparta el camino que ha recorrido, al
// llegar a un final (ver Options.astro) -- mismo formato 9:16 que las
// Stories automáticas (útil también si el lector la comparte a mano en su
// Instagram/Facebook), pero con el remate del cuento en vez del gancho del
// día. `steps` son los mismos objetos que ya devuelve getStoryPathToNode
// (turso.ts) / usa StoryPath.astro -- si el camino es muy largo se recortan
// los primeros pasos (se conserva el final, que es lo más relevante del
// remate) y se marca con "...".
const RECAP_STEP_LIMIT = 4;

export const buildPathRecapImageUrl = ({
  slug,
  imageVersion,
  storyTitle,
  steps,
}: {
  slug: string;
  imageVersion: number | null;
  storyTitle: string;
  steps: { text: string }[];
}) => {
  const trimmedSteps = steps.length > RECAP_STEP_LIMIT ? steps.slice(-RECAP_STEP_LIMIT) : steps;
  const numberedSteps = trimmedSteps
    .map((step, index) => `${index + 1}. ${step.text}`)
    .join("\n");
  const recapText = steps.length > RECAP_STEP_LIMIT ? `...\n${numberedSteps}` : numberedSteps;

  return cloudinary.url(`cuentos-interactivos/${slug}/${slug}`, {
    version: imageVersion ?? undefined,
    transformation: [
      { width: 1080, height: 1920, crop: "fill", gravity: "auto" },
      {
        overlay: {
          font_family: "arial",
          font_weight: "bold",
          font_size: 56,
          text: storyTitle,
        },
        color: "#FFFFFF",
        background: "rgb:00000099",
        width: 900,
        crop: "fit",
      },
      { flags: "layer_apply", gravity: "north", y: 200 },
      {
        overlay: {
          font_family: "arial",
          font_weight: "bold",
          font_size: 34,
          text: `Tu camino:\n${recapText}`,
        },
        color: "#FFFFFF",
        background: "rgb:00000099",
        width: 900,
        crop: "fit",
      },
      { flags: "layer_apply", gravity: "south", y: 300 },
    ],
  });
};

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
export const buildStoryImageUrl = ({ slug, imageVersion, hookText }: { slug: string; imageVersion: number | null; hookText: string }) =>
  cloudinary.url(`cuentos-interactivos/${slug}/${slug}`, {
    version: imageVersion ?? undefined,
    transformation: [
      { width: 1080, height: 1920, crop: "fill", gravity: "auto" },
      {
        overlay: {
          font_family: "arial",
          font_weight: "bold",
          font_size: 64,
          text: hookText,
        },
        color: "#FFFFFF",
        background: "rgb:00000099",
        width: 900,
        crop: "fit",
        gravity: "south",
        y: 160,
      },
      { flags: "layer_apply" },
    ],
  });

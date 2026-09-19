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
// Rótulo opcional — "¡CUENTO NUEVO!" (ver NEW_STORY_WINDOW_DAYS en
// socialFormats.ts) o el de la semana temática ("SEMANA PIRATA", ver
// socialThemes.ts) —: ocupa el sitio de arriba y el gancho baja debajo. Es de
// UNA sola línea y tamaño fijo, así que su alto es conocido y el gancho se
// puede colocar justo debajo con un desplazamiento fijo — al revés no se
// podría, porque el gancho ocupa un número variable de líneas según su
// longitud. Sin emoji: Arial en
// Cloudinary no los dibuja de forma fiable, y "⤴" de abajo es un símbolo
// tipográfico, no un emoji. El borde del mismo color que el fondo hace de
// relleno interior (las capas de texto de Cloudinary no tienen "padding").
export const NEW_STORY_LABEL = "¡CUENTO NUEVO!";
const HOOK_Y = 280;
const HOOK_Y_BELOW_LABEL = 390;

export const buildStoryImageUrl = ({ slug, imageVersion, hookText, label }: { slug: string; imageVersion: number | null; hookText: string; label?: string }) =>
  cloudinary.url(`cuentos-interactivos/${slug}/${slug}`, {
    version: imageVersion ?? undefined,
    // Las portadas son PNG y la API de publicación de Instagram solo acepta
    // JPEG (ver la nota de INSTAGRAM_IMAGE_TRANSFORMATION en
    // pages/api/social-auto-post.ts, donde un post de feed llegó a fallar
    // por esto). Puestos aquí arriba y no dentro de "transformation", el
    // builder los aplica al final de la cadena: la extensión .jpg en la URL
    // y q_auto como último componente, ya con las capas de texto pegadas.
    format: "jpg",
    quality: "auto",
    transformation: [
      { width: 1080, height: 1920, crop: "fill", gravity: "auto" },
      ...(label
        ? [
            {
              overlay: {
                font_family: "arial",
                font_weight: "bold",
                font_size: 52,
                text: label,
              },
              color: "#2B2118",
              background: "rgb:E8C468",
              border: "18px_solid_rgb:E8C468",
            },
            { flags: "layer_apply", gravity: "north", y: HOOK_Y },
          ]
        : []),
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
      { flags: "layer_apply", gravity: "north", y: label ? HOOK_Y_BELOW_LABEL : HOOK_Y },
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

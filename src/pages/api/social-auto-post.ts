import { getNextStoryToPost, getLastSuccessfulSocialFormat, getStoryOptions, insertSocialPost } from "@src/turso";
import { SOCIAL_FORMATS, SOCIAL_FORMAT_IDS, COOLDOWN_DAYS, resolveFormatForToday, type SocialFormatId, type SocialSurface } from "@src/utils/socialFormats";
import { WEEKDAY_FORMAT } from "@src/utils/socialSchedule";
import { generateSocialCaption } from "@src/utils/socialCaption";
import { getStoryCoverImageUrl } from "@src/utils/functions";
import { buildStoryImageUrl } from "@src/utils/socialStoryImage";
import { generalCategories } from "@src/data/categories";
import { postToFacebook, postFacebookStory } from "@src/pages/api/post-facebook";
import { postToInstagram, postInstagramStory } from "@src/pages/api/post-instagram";
import { PUBLIC_CLOUDINARY_CLOUD_NAME } from "astro:env/server";

// Las portadas se generan en 1536x1024 (3:2) — Instagram lo acepta (su rango
// válido es 4:5 a 1.91:1) pero no es su formato recomendado (4:5 vertical,
// que ocupa más pantalla en el feed). g_auto pide a Cloudinary un recorte
// con detección de contenido en vez de recortar siempre por el centro.
const INSTAGRAM_IMAGE_TRANSFORMATION = "c_fill,w_1080,h_1350,g_auto";

type PostResult = { ok: boolean; postId?: string; error?: string };

// Orquesta la publicación automática diaria en Facebook + Instagram (ver
// vercel.json para el cron y src/middleware.ts / src/utils/auth.ts para su
// autenticación). Cada llamada: decide el formato y la superficie de hoy
// según el día de la semana (no-op si hoy no toca nada), elige un cuento no
// publicado recientemente, genera el texto con IA, publica (en el feed o
// como Story, según toque) y deja constancia (éxito o fallo) en
// 'social_posts'.
//
// ?dryRun=1 hace todo lo anterior EXCEPTO publicar de verdad y sin tocar la
// base de datos. ?surface=feed|story y ?format=recommendation|decision
// fuerzan la superficie/formato de hoy (para poder probar el camino de
// Story sin esperar a un domingo real) — mismo nivel de protección que
// dryRun, no abren ninguna vía de autenticación nueva.
export async function GET(request: Request) {
  const url = new URL(request.url);
  const dryRun = url.searchParams.get("dryRun") === "1";

  const surfaceOverride = url.searchParams.get("surface");
  const formatOverride = url.searchParams.get("format");

  try {
    const weekday = new Date().getUTCDay();
    const scheduled = WEEKDAY_FORMAT[weekday];

    const surface: SocialSurface | null =
      surfaceOverride === "feed" || surfaceOverride === "story" ? surfaceOverride : (scheduled?.surface ?? null);
    const scheduledFormat: SocialFormatId | null =
      formatOverride && (SOCIAL_FORMAT_IDS as string[]).includes(formatOverride) ? (formatOverride as SocialFormatId) : (scheduled?.format ?? null);

    const lastFormat = await getLastSuccessfulSocialFormat();
    const format = resolveFormatForToday(scheduledFormat, lastFormat);

    if (!format || !surface) {
      return new Response(JSON.stringify({ skipped: true, reason: "Hoy no toca publicar (día sin formato asignado)", weekday }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    const cooldownCutoffIso = new Date(Date.now() - COOLDOWN_DAYS * 24 * 60 * 60 * 1000).toISOString().slice(0, 19).replace("T", " ");
    const story = await getNextStoryToPost(cooldownCutoffIso);

    if (!story) {
      return new Response(JSON.stringify({ skipped: true, reason: "No hay ningún cuento en la base de datos" }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }

    const storyId = story.id as number;
    let generator = SOCIAL_FORMATS[format];
    let rootOptions = generator.needsRootOptions ? await getStoryOptions(storyId) : undefined;

    // El formato "decision" solo tiene sentido si el cuento presenta un
    // dilema real (2+ opciones en la raíz) — con una sola opción no hay
    // nada que "elegir", y citarla igualmente daría un post confuso.
    // Comprobado en vivo: al menos un cuento real tiene una única opción de
    // entrada. En vez de publicar eso, se cae al formato "recommendation"
    // para este cuento.
    if (format === "decision" && (rootOptions?.length ?? 0) < 2) {
      generator = SOCIAL_FORMATS.recommendation;
      rootOptions = undefined;
    }

    const rawCategories = JSON.parse(story.categories as string) as string[];
    const categoryTitles = rawCategories.map(
      (value) => generalCategories.find((category) => category.name === value)?.title ?? value
    );

    const promptInput = generator.buildPromptInput(
      { id: storyId, slug: story.slug as string, title: story.title as string, resume: story.resume as string, characters: story.characters as string, age: story.age as string },
      categoryTitles,
      rootOptions
    );

    const { facebookCaption, instagramCaption, hashtags, storyHook } = await generateSocialCaption(promptInput);
    const hashtagsLine = hashtags.join(" ");

    const summary = {
      dryRun,
      format: generator.id,
      surface,
      story: { id: storyId, slug: story.slug, title: story.title },
      facebookCaption,
      instagramCaption,
      hashtags,
      storyHook,
      imageUrl: null as string | null,
      instagramImageUrl: null as string | null,
      storyImageUrl: null as string | null,
      facebook: null as PostResult | null,
      instagram: null as PostResult | null,
    };

    if (surface === "story") {
      const storyImageUrl = buildStoryImageUrl({ slug: story.slug as string, imageVersion: story.image_version as number | null, hookText: storyHook });
      summary.storyImageUrl = storyImageUrl;

      if (!dryRun) {
        const fb = await postFacebookStory(storyImageUrl);
        await insertSocialPost({
          storyId,
          format: generator.id,
          platform: "facebook_story",
          status: fb.ok ? "success" : "failure",
          caption: storyHook,
          externalPostId: fb.ok ? fb.postId : null,
          errorMessage: fb.ok ? null : fb.error,
        });
        summary.facebook = fb;

        const ig = await postInstagramStory(storyImageUrl);
        await insertSocialPost({
          storyId,
          format: generator.id,
          platform: "instagram_story",
          status: ig.ok ? "success" : "failure",
          caption: storyHook,
          externalPostId: ig.ok ? ig.postId : null,
          errorMessage: ig.ok ? null : ig.error,
        });
        summary.instagram = ig;
      }
    } else {
      const imageUrl = getStoryCoverImageUrl(PUBLIC_CLOUDINARY_CLOUD_NAME, story.slug as string, story.image_version as number | null);
      const instagramImageUrl = getStoryCoverImageUrl(PUBLIC_CLOUDINARY_CLOUD_NAME, story.slug as string, story.image_version as number | null, INSTAGRAM_IMAGE_TRANSFORMATION);
      summary.imageUrl = imageUrl;
      summary.instagramImageUrl = instagramImageUrl;

      if (!dryRun) {
        const fb = await postToFacebook(imageUrl, `${facebookCaption}\n\n${hashtagsLine}`);
        await insertSocialPost({
          storyId,
          format: generator.id,
          platform: "facebook",
          status: fb.ok ? "success" : "failure",
          caption: facebookCaption,
          externalPostId: fb.ok ? fb.postId : null,
          errorMessage: fb.ok ? null : fb.error,
        });
        summary.facebook = fb;

        const ig = await postToInstagram(instagramImageUrl, `${instagramCaption}\n\n${hashtagsLine}`);
        await insertSocialPost({
          storyId,
          format: generator.id,
          platform: "instagram",
          status: ig.ok ? "success" : "failure",
          caption: instagramCaption,
          externalPostId: ig.ok ? ig.postId : null,
          errorMessage: ig.ok ? null : ig.error,
        });
        summary.instagram = ig;
      }
    }

    return new Response(JSON.stringify(summary), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    // Un fallo aquí (p.ej. la IA no devuelve un objeto válido) no debe
    // desaparecer sin dejar rastro solo porque no llegó a intentar publicar
    // en ninguna plataforma todavía — se registran los logs del propio
    // Vercel Cron, y se responde con detalle en vez de un 500 opaco.
    console.error("Fallo en social-auto-post:", error);
    return new Response(JSON.stringify({ error: String(error) }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}

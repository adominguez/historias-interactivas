import { FACEBOOK_API_TOKEN, FACEBOOK_API_VERSION, FACEBOOK_PAGE_ID, INSTAGRAM_PAGE_ID } from "astro:env/server";
import { getPostsForMetrics, upsertPostMetrics, upsertAccountDaily, getAccountDaysWithReach, type PostMetrics } from "@src/turso";

// Recogida diaria de estadísticas de redes (ver pages/api/social-insights-collect.ts
// y el panel /admin/redes-sociales). Qué se puede leer, comprobado en vivo con
// el token actual (sept 2026):
// - Posts de Instagram: alcance, vistas, guardados, compartidos, me gusta y
//   comentarios.
// - Stories de Instagram: solo si las vieron al menos 5 personas (si no,
//   Meta responde "Not enough viewers") y solo durante sus 24 horas de vida.
// - Posts de Facebook: me gusta y comentarios. El alcance no: falta el
//   permiso read_insights, que la app no tenía disponible.
// - Stories de Facebook: nada.
// - Cuenta de Instagram, por día: alcance, visitas al perfil, clics en el
//   enlace de la bio y cuentas que interactuaron. Los seguidores se guardan
//   como foto diaria: su evolución la da Meta solo a partir de 100.

const GRAPH_TIMEOUT_MS = 15000;
const DAY_MS = 24 * 60 * 60 * 1000;
// Las métricas de un post siguen creciendo los primeros días; pasado un mes
// ya no cambian y no merece la pena seguir pidiéndolas.
const POST_METRICS_WINDOW_DAYS = 30;
// Meta tarda en consolidar los totales de un día: los de los últimos días se
// vuelven a pedir aunque ya estén guardados.
const ACCOUNT_REFRESH_DAYS = 3;
const ACCOUNT_BACKFILL_DAYS = 30;
const CONCURRENCY = 4;

type GraphError = { message?: string; code?: number; error_subcode?: number };
type GraphResponse = { error?: GraphError; [key: string]: unknown };

async function graph(path: string): Promise<GraphResponse> {
  const separator = path.includes("?") ? "&" : "?";
  const response = await fetch(`https://graph.facebook.com/${FACEBOOK_API_VERSION}/${path}${separator}access_token=${FACEBOOK_API_TOKEN}`, {
    signal: AbortSignal.timeout(GRAPH_TIMEOUT_MS),
  });
  return response.json() as Promise<GraphResponse>;
}

// Las métricas de /insights llegan como [{ name, values: [{ value }] }] (por
// publicación) o [{ name, total_value: { value } }] (por cuenta y día).
function insightsToMap(response: GraphResponse): Record<string, number> {
  const data = (response.data ?? []) as { name: string; values?: { value: number }[]; total_value?: { value: number } }[];
  return Object.fromEntries(data.map(({ name, values, total_value }) => [name, Number(values?.[0]?.value ?? total_value?.value ?? 0)]));
}

async function mapWithConcurrency<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let next = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (next < items.length) {
      const index = next++;
      results[index] = await fn(items[index]);
    }
  });
  await Promise.all(workers);
  return results;
}

const emptyMetrics = (): PostMetrics => ({ reach: null, views: null, likes: null, comments: null, saved: null, shares: null, permalink: null, note: null });

// Métricas de una publicación, o null si esa publicación no tiene métricas
// que leer (Story de Facebook, Story de Instagram de hace más de 24 horas).
export async function fetchPostMetrics(post: { platform: string; externalPostId: string; createdAt: string }, now: Date): Promise<PostMetrics | null> {
  const id = post.externalPostId;

  if (post.platform === "instagram") {
    const [fields, insights] = await Promise.all([
      graph(`${id}?fields=like_count,comments_count,permalink`),
      graph(`${id}/insights?metric=reach,views,saved,shares`),
    ]);
    if (fields.error) throw new Error(JSON.stringify({ error: fields.error }));
    const values = insightsToMap(insights);
    return {
      ...emptyMetrics(),
      reach: insights.error ? null : values.reach ?? null,
      views: insights.error ? null : values.views ?? null,
      saved: insights.error ? null : values.saved ?? null,
      shares: insights.error ? null : values.shares ?? null,
      likes: Number(fields.like_count ?? 0),
      comments: Number(fields.comments_count ?? 0),
      permalink: (fields.permalink as string | undefined) ?? null,
      note: insights.error ? `Sin alcance: ${insights.error.message}` : null,
    };
  }

  if (post.platform === "instagram_story") {
    const ageMs = now.getTime() - new Date(`${post.createdAt.replace(" ", "T")}Z`).getTime();
    if (ageMs > DAY_MS) return null;
    const insights = await graph(`${id}/insights?metric=reach,views,shares`);
    if (insights.error?.code === 10) {
      return { ...emptyMetrics(), note: "Menos de 5 espectadores: Instagram no da estadísticas de esta Story." };
    }
    if (insights.error) throw new Error(JSON.stringify({ error: insights.error }));
    const values = insightsToMap(insights);
    return { ...emptyMetrics(), reach: values.reach ?? null, views: values.views ?? null, shares: values.shares ?? null };
  }

  if (post.platform === "facebook") {
    const fields = await graph(`${id}?fields=likes.summary(true),comments.summary(true),link`);
    if (fields.error) throw new Error(JSON.stringify({ error: fields.error }));
    const summary = (key: string) => Number((fields[key] as { summary?: { total_count?: number } } | undefined)?.summary?.total_count ?? 0);
    return {
      ...emptyMetrics(),
      likes: summary("likes"),
      comments: summary("comments"),
      permalink: (fields.link as string | undefined) ?? null,
    };
  }

  return null;
}

const toIsoDate = (ms: number) => new Date(ms).toISOString().slice(0, 10);

async function collectInstagramDay(date: string) {
  const since = Math.floor(Date.parse(`${date}T00:00:00Z`) / 1000);
  const until = since + DAY_MS / 1000;
  const response = await graph(`${INSTAGRAM_PAGE_ID}/insights?metric=reach,profile_views,website_clicks,accounts_engaged&period=day&metric_type=total_value&since=${since}&until=${until}`);
  if (response.error) throw new Error(JSON.stringify({ error: response.error }));
  const values = insightsToMap(response);
  await upsertAccountDaily({
    date,
    platform: "instagram",
    reach: values.reach ?? 0,
    profileViews: values.profile_views ?? 0,
    websiteClicks: values.website_clicks ?? 0,
    accountsEngaged: values.accounts_engaged ?? 0,
  });
}

export async function collectSocialInsights(now = new Date()) {
  const errors: string[] = [];
  const today = toIsoDate(now.getTime());

  // 1. Seguidores de hoy, en las dos cuentas.
  const [instagramAccount, facebookPage] = await Promise.all([
    graph(`${INSTAGRAM_PAGE_ID}?fields=followers_count`),
    graph(`${FACEBOOK_PAGE_ID}?fields=followers_count`),
  ]);
  const followers = {
    instagram: instagramAccount.error ? null : Number(instagramAccount.followers_count),
    facebook: facebookPage.error ? null : Number(facebookPage.followers_count),
  };
  if (instagramAccount.error) errors.push(`Seguidores de Instagram: ${instagramAccount.error.message}`);
  if (facebookPage.error) errors.push(`Seguidores de Facebook: ${facebookPage.error.message}`);
  if (followers.instagram !== null) await upsertAccountDaily({ date: today, platform: "instagram", followers: followers.instagram });
  if (followers.facebook !== null) await upsertAccountDaily({ date: today, platform: "facebook", followers: followers.facebook });

  // 2. Totales diarios de la cuenta de Instagram: los días que falten del
  //    último mes (la primera vez, el mes entero) más los últimos días, que
  //    Meta aún puede estar consolidando. Hoy no: el día no ha terminado.
  const days = Array.from({ length: ACCOUNT_BACKFILL_DAYS }, (_, i) => toIsoDate(now.getTime() - (i + 1) * DAY_MS));
  const alreadyCollected = await getAccountDaysWithReach("instagram", days[days.length - 1]);
  const daysToCollect = days.filter((date, i) => i < ACCOUNT_REFRESH_DAYS || !alreadyCollected.has(date));
  await mapWithConcurrency(daysToCollect, CONCURRENCY, async (date) => {
    try {
      await collectInstagramDay(date);
    } catch (error) {
      errors.push(`Cuenta de Instagram, ${date}: ${String(error).slice(0, 200)}`);
    }
  });

  // 3. Métricas de cada publicación del último mes.
  const since = new Date(now.getTime() - POST_METRICS_WINDOW_DAYS * DAY_MS).toISOString().slice(0, 19).replace("T", " ");
  const posts = await getPostsForMetrics(since);
  let postsUpdated = 0;
  await mapWithConcurrency(posts, CONCURRENCY, async (post) => {
    try {
      const metrics = await fetchPostMetrics(post, now);
      if (metrics) {
        await upsertPostMetrics(post.id, metrics);
        postsUpdated++;
      }
    } catch (error) {
      errors.push(`Publicación ${post.id} (${post.platform}): ${String(error).slice(0, 200)}`);
    }
  });

  return { followers, accountDaysCollected: daysToCollect.length, postsChecked: posts.length, postsUpdated, errors };
}

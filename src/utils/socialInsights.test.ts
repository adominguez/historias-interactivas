import { describe, it, expect, vi, afterEach } from 'vitest';
import { fetchPostMetrics } from './socialInsights';

// Respuestas de Meta con la forma real observada en vivo (sept 2026).
const respond = (routes: [RegExp, unknown][]) => vi.fn(async (url: string) => {
  const match = routes.find(([pattern]) => pattern.test(url));
  return new Response(JSON.stringify(match ? match[1] : { error: { message: 'ruta no simulada' } }));
});
const now = new Date('2026-09-20T15:00:00Z');

describe('fetchPostMetrics', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('lee alcance e interacciones de un post de Instagram', async () => {
    vi.stubGlobal('fetch', respond([
      [/\/insights\?/, { data: [{ name: 'reach', values: [{ value: 5 }] }, { name: 'views', values: [{ value: 7 }] }, { name: 'saved', values: [{ value: 1 }] }, { name: 'shares', values: [{ value: 0 }] }] }],
      [/fields=like_count/, { like_count: 2, comments_count: 1, permalink: 'https://www.instagram.com/p/abc/' }],
    ]));
    const metrics = await fetchPostMetrics({ platform: 'instagram', externalPostId: '1', createdAt: '2026-09-19 09:27:19' }, now);
    expect(metrics).toMatchObject({ reach: 5, views: 7, saved: 1, shares: 0, likes: 2, comments: 1, permalink: 'https://www.instagram.com/p/abc/', note: null });
  });

  it('explica por qué una Story con pocos espectadores no tiene datos', async () => {
    vi.stubGlobal('fetch', respond([[/\/insights\?/, { error: { message: 'Not enough viewers for the media to show insights', code: 10 } }]]));
    const metrics = await fetchPostMetrics({ platform: 'instagram_story', externalPostId: '2', createdAt: '2026-09-19 16:15:57' }, now);
    expect(metrics?.reach).toBeNull();
    expect(metrics?.note).toContain('Menos de 5 espectadores');
  });

  it('no pide nada de una Story de más de 24 horas', async () => {
    const fetchMock = respond([]);
    vi.stubGlobal('fetch', fetchMock);
    expect(await fetchPostMetrics({ platform: 'instagram_story', externalPostId: '3', createdAt: '2026-09-18 16:15:00' }, now)).toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('lee me gusta y comentarios de Facebook, sin alcance', async () => {
    vi.stubGlobal('fetch', respond([[/fields=likes/, { likes: { summary: { total_count: 3 } }, comments: { summary: { total_count: 1 } }, link: 'https://www.facebook.com/photo.php?fbid=1' }]]));
    const metrics = await fetchPostMetrics({ platform: 'facebook', externalPostId: '4', createdAt: '2026-09-19 09:27:09' }, now);
    expect(metrics).toMatchObject({ likes: 3, comments: 1, reach: null, permalink: 'https://www.facebook.com/photo.php?fbid=1' });
  });

  it('las Stories de Facebook no tienen métricas', async () => {
    expect(await fetchPostMetrics({ platform: 'facebook_story', externalPostId: '5', createdAt: '2026-09-19 16:15:49' }, now)).toBeNull();
  });
});

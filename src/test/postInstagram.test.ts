// Vive aquí y no junto a post-instagram.ts: cualquier fichero dentro de
// src/pages/ lo convierte Astro en una ruta, y un test acabaría publicado
// como endpoint.
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { postInstagramStory, MEDIA_FETCH_ERROR_SUBCODE, MEDIA_FETCH_RETRY_DELAY_MS } from '@src/pages/api/post-instagram';

const json = (body: unknown) => Promise.resolve({ json: () => Promise.resolve(body) } as Response);
const fetchFailure = { error: { message: 'Only photo or video can be accepted as media type.', code: 9004, error_subcode: MEDIA_FETCH_ERROR_SUBCODE } };

// Enruta cada llamada según su URL: crear contenedor (/media), consultar su
// estado (?fields=status_code) o publicarlo (/media_publish).
const mockGraphApi = (containerResponses: unknown[]) => {
  const queue = [...containerResponses];
  return vi.fn((url: string) => {
    if (url.includes('/media_publish')) return json({ id: 'post-1' });
    if (url.includes('fields=status_code')) return json({ status_code: 'FINISHED' });
    return json(queue.shift());
  });
};

const containerCalls = (fetchMock: ReturnType<typeof mockGraphApi>) =>
  fetchMock.mock.calls.filter(([url]) => url.endsWith('/media')).length;

describe('postInstagramStory', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('reintenta una vez si Instagram no pudo descargar la imagen, y publica', async () => {
    const fetchMock = mockGraphApi([fetchFailure, { id: 'container-2' }]);
    vi.stubGlobal('fetch', fetchMock);

    const pending = postInstagramStory('https://imagen.invalid/a.jpg');
    await vi.advanceTimersByTimeAsync(MEDIA_FETCH_RETRY_DELAY_MS);

    expect(await pending).toEqual({ ok: true, postId: 'post-1' });
    expect(containerCalls(fetchMock)).toBe(2);
  });

  it('no reintenta más de una vez', async () => {
    const fetchMock = mockGraphApi([fetchFailure, fetchFailure, { id: 'nunca' }]);
    vi.stubGlobal('fetch', fetchMock);

    const pending = postInstagramStory('https://imagen.invalid/a.jpg');
    await vi.advanceTimersByTimeAsync(MEDIA_FETCH_RETRY_DELAY_MS);

    const result = await pending;
    expect(result.ok).toBe(false);
    expect(containerCalls(fetchMock)).toBe(2);
  });

  it('no reintenta otros errores, como un token caducado', async () => {
    const fetchMock = mockGraphApi([{ error: { message: 'Session has expired', code: 190, error_subcode: 463 } }]);
    vi.stubGlobal('fetch', fetchMock);

    const result = await postInstagramStory('https://imagen.invalid/a.jpg');

    expect(result.ok).toBe(false);
    expect(containerCalls(fetchMock)).toBe(1);
  });
});

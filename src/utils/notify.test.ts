import { describe, it, expect, vi, afterEach } from 'vitest';
import { sendWhatsApp, describeFailure } from './notify';

describe('describeFailure', () => {
  const meta = (error: object) => JSON.stringify({ error: { message: 'x', ...error } });

  it('reconoce el saldo de OpenAI agotado', () => {
    const error = Object.assign(new Error('You exceeded your current quota'), { responseBody: '{"error":{"code":"insufficient_quota"}}' });
    expect(describeFailure(error)).toContain('saldo de OpenAI');
  });

  it('reconoce el token de Meta caducado (código 190)', () => {
    expect(describeFailure(meta({ code: 190, error_subcode: 463 }))).toContain('token de Meta ha caducado');
  });

  it('reconoce el fallo de descarga de Instagram', () => {
    expect(describeFailure(meta({ code: 9004, error_subcode: 2207052 }))).toContain('Instagram no pudo descargar');
  });

  it('reconoce un permiso que falta', () => {
    expect(describeFailure(meta({ code: 10, message: 'falta pages_read_user_content' }))).toContain('falta un permiso');
  });

  it('reconoce un timeout', () => {
    expect(describeFailure(new DOMException('The operation was aborted due to timeout', 'TimeoutError'))).toContain('timeout');
  });

  it('recorta un error desconocido muy largo', () => {
    expect(describeFailure('a'.repeat(1000)).length).toBeLessThanOrEqual(301);
  });
});

describe('sendWhatsApp', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('manda el texto codificado en la URL de CallMeBot', async () => {
    const fetchMock = vi.fn(async (_url: string) => new Response('Message queued. You will receive it in a few seconds.'));
    vi.stubGlobal('fetch', fetchMock);

    expect(await sendWhatsApp('Hola & adiós\n¿qué tal?')).toBe(true);
    const url = String(fetchMock.mock.calls[0][0]);
    expect(url).toContain('text=Hola%20%26%20adi%C3%B3s%0A%C2%BFqu%C3%A9%20tal%3F');
    expect(url).toContain('apikey=');
  });

  it('da el envío por fallido si CallMeBot no lo pone en cola, aunque responda 200', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('APIKey is invalid')));
    expect(await sendWhatsApp('hola')).toBe(false);
  });

  it('nunca lanza, aunque la red falle', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => { throw new Error('sin red'); }));
    await expect(sendWhatsApp('hola')).resolves.toBe(false);
  });
});

import { describe, it, expect } from 'vitest';
import { isAuthorized, isAuthorizedCron } from './auth';
import { ADMIN_USERNAME, ADMIN_PASSWORD, CRON_SECRET } from 'astro:env/server';

// Las credenciales salen del mismo doble de prueba que consume auth.ts (ver
// src/test/astroEnvServer.stub.ts), no de literales repetidos aquí: así el
// test comprueba el comportamiento, no que dos ficheros digan lo mismo.
const basic = (user: string, pass: string) =>
  requestWith(`Basic ${btoa(`${user}:${pass}`)}`);

const requestWith = (authorization: string | null) =>
  new Request('https://ejemplo.invalid/admin', {
    headers: authorization === null ? {} : { authorization },
  });

describe('isAuthorized', () => {
  it('acepta las credenciales correctas', () => {
    expect(isAuthorized(basic(ADMIN_USERNAME, ADMIN_PASSWORD))).toBe(true);
  });

  it('rechaza una contraseña incorrecta', () => {
    expect(isAuthorized(basic(ADMIN_USERNAME, 'otra-cosa'))).toBe(false);
  });

  it('rechaza un usuario incorrecto', () => {
    expect(isAuthorized(basic('otro-usuario', ADMIN_PASSWORD))).toBe(false);
  });

  it('rechaza si no hay cabecera Authorization', () => {
    expect(isAuthorized(requestWith(null))).toBe(false);
  });

  it('rechaza un esquema que no sea Basic', () => {
    expect(isAuthorized(requestWith(`Bearer ${CRON_SECRET}`))).toBe(false);
  });

  // La regresión que motivó el try/catch de auth.ts: atob lanza con base64
  // inválido, la excepción subía por el middleware y Astro respondía 500 en
  // vez de 401. Los escáneres que sondean /admin mandan esto a diario.
  it('rechaza (sin lanzar) una cabecera Basic que no es base64 válido', () => {
    expect(() => isAuthorized(requestWith('Basic @@@no-es-base64@@@'))).not.toThrow();
    expect(isAuthorized(requestWith('Basic @@@no-es-base64@@@'))).toBe(false);
  });

  it('rechaza un Basic vacío', () => {
    expect(isAuthorized(requestWith('Basic '))).toBe(false);
  });

  it('rechaza un base64 válido que no lleva ningún ":"', () => {
    expect(isAuthorized(requestWith(`Basic ${btoa('solousuario')}`))).toBe(false);
  });

  // Una contraseña con ":" dentro es legal en Basic Auth: solo separa el
  // PRIMER ":", el resto es parte de la contraseña.
  it('trata como contraseña todo lo que va tras el primer ":"', () => {
    const request = requestWith(`Basic ${btoa(`${ADMIN_USERNAME}:a:b:c`)}`);
    expect(isAuthorized(request)).toBe(false);
  });
});

describe('isAuthorizedCron', () => {
  it('acepta el bearer del cron de Vercel', () => {
    expect(isAuthorizedCron(requestWith(`Bearer ${CRON_SECRET}`))).toBe(true);
  });

  it('rechaza un bearer distinto', () => {
    expect(isAuthorizedCron(requestWith('Bearer secreto-equivocado'))).toBe(false);
  });

  it('rechaza si no hay cabecera Authorization', () => {
    expect(isAuthorizedCron(requestWith(null))).toBe(false);
  });

  // El bypass del cron no puede colarse por la puerta del Basic Auth ni al
  // revés: son dos vías separadas a propósito (ver src/middleware.ts).
  it('no acepta las credenciales de admin como si fueran el bearer del cron', () => {
    expect(isAuthorizedCron(basic(ADMIN_USERNAME, ADMIN_PASSWORD))).toBe(false);
  });
});

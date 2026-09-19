import { describe, it, expect } from 'vitest';
import { metaTokenProblemFrom } from './metaToken';

const now = new Date('2026-09-19T20:00:00Z');
const inDays = (days: number) => Math.floor(now.getTime() / 1000) + days * 24 * 60 * 60 - 60;
const ok = { is_valid: true, scopes: ['pages_manage_posts', 'instagram_content_publish'] };

describe('metaTokenProblemFrom', () => {
  it('sin problemas lejos de la fecha de corte', () => {
    expect(metaTokenProblemFrom({ ...ok, data_access_expires_at: inDays(40) }, now)).toBeNull();
  });

  it('avisa en los días de recordatorio, no todos los días', () => {
    expect(metaTokenProblemFrom({ ...ok, data_access_expires_at: inDays(14) }, now)).toContain('Quedan 14 día(s)');
    expect(metaTokenProblemFrom({ ...ok, data_access_expires_at: inDays(13) }, now)).toBeNull();
  });

  it('avisa si el acceso ya se cortó', () => {
    expect(metaTokenProblemFrom({ ...ok, data_access_expires_at: inDays(-1) }, now)).toContain('ha cortado el acceso');
  });

  it('avisa si el token no es válido o le faltan permisos de publicar', () => {
    expect(metaTokenProblemFrom({ is_valid: false }, now)).toContain('no es válido');
    expect(metaTokenProblemFrom({ is_valid: true, scopes: ['pages_manage_posts'] }, now)).toContain('instagram_content_publish');
  });
});

import { describe, it, expect } from 'vitest';
import { resolveFormatForToday } from './socialFormats';

describe('resolveFormatForToday', () => {
  it('no publica nada si hoy no tiene formato asignado', () => {
    expect(resolveFormatForToday(null, 'recommendation')).toBeNull();
  });

  it('usa el formato de hoy si no coincide con el último publicado', () => {
    expect(resolveFormatForToday('decision', 'recommendation')).toBe('decision');
  });

  it('pasa al siguiente formato de la rotación si hoy coincidiría con el último publicado (viernes→lunes)', () => {
    expect(resolveFormatForToday('recommendation', 'recommendation')).toBe('decision');
  });

  it('usa el formato de hoy si nunca se ha publicado nada todavía', () => {
    expect(resolveFormatForToday('recommendation', undefined)).toBe('recommendation');
  });
});

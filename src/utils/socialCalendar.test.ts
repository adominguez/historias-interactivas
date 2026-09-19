import { describe, it, expect } from 'vitest';
import { easterSunday, seasonStarts, specialDatesBetween } from './socialCalendar';

const iso = (ms: number) => new Date(ms).toISOString().slice(0, 10);

describe('easterSunday', () => {
  it('coincide con las fechas reales de Pascua', () => {
    expect(iso(easterSunday(2024))).toBe('2024-03-31');
    expect(iso(easterSunday(2025))).toBe('2025-04-20');
    expect(iso(easterSunday(2026))).toBe('2026-04-05');
    expect(iso(easterSunday(2027))).toBe('2027-03-28');
  });
});

describe('seasonStarts', () => {
  it('da el día real (en Madrid) de cada estación de 2026', () => {
    expect(seasonStarts(2026).map(({ date }) => date)).toEqual(['2026-03-20', '2026-06-21', '2026-09-23', '2026-12-21']);
  });
});

describe('specialDatesBetween', () => {
  const names = (from: string, to: string) => specialDatesBetween(from, to).map(({ date, name }) => `${date} ${name}`);

  it('incluye las fechas móviles bien calculadas', () => {
    expect(names('2026-02-01', '2026-05-31')).toEqual(expect.arrayContaining([
      '2026-02-17 Carnaval (martes de Carnaval)',
      '2026-03-29 Domingo de Ramos, empieza la Semana Santa',
      '2026-05-03 Día de la Madre',
    ]));
  });

  it('incluye los dos extremos del rango y nada de fuera', () => {
    expect(names('2026-10-31', '2026-11-01')).toEqual(['2026-10-31 Halloween', '2026-11-01 Día de Todos los Santos']);
  });

  it('funciona en un rango que cruza de año', () => {
    expect(names('2026-12-31', '2027-01-06')).toEqual(['2026-12-31 Nochevieja', '2027-01-01 Año Nuevo', '2027-01-06 Día de Reyes']);
  });
});

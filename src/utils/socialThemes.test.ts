import { describe, it, expect } from 'vitest';
import { getThemeForDate, storyBelongsToTheme, ROTATING_THEMES } from './socialThemes';

const utc = (y: number, m: number, d: number) => new Date(Date.UTC(y, m - 1, d, 9));

describe('getThemeForDate', () => {
  it('las semanas empiezan en lunes', () => {
    expect(getThemeForDate(utc(2026, 9, 21)).dayOfWeek).toBe(1); // lunes
    expect(getThemeForDate(utc(2026, 9, 27)).dayOfWeek).toBe(7); // domingo
  });

  it('todos los días de una semana comparten tema', () => {
    const monday = getThemeForDate(utc(2026, 9, 21)).theme.id;
    for (let day = 22; day <= 27; day++) {
      expect(getThemeForDate(utc(2026, 9, day)).theme.id).toBe(monday);
    }
  });

  it('semanas seguidas recorren toda la rotación sin repetir', () => {
    const ids = Array.from({ length: ROTATING_THEMES.length }, (_, week) =>
      getThemeForDate(utc(2026, 1, 5 + week * 7)).theme.id);
    expect(new Set(ids).size).toBe(ROTATING_THEMES.length);
  });

  it('la semana que contiene el 31 de octubre es la de Halloween, de lunes a domingo', () => {
    expect(getThemeForDate(utc(2026, 10, 26)).theme.id).toBe('halloween'); // lunes
    expect(getThemeForDate(utc(2026, 11, 1)).theme.id).toBe('halloween');  // domingo
    expect(getThemeForDate(utc(2026, 10, 25)).theme.id).not.toBe('halloween');
    expect(getThemeForDate(utc(2026, 11, 2)).theme.id).not.toBe('halloween');
  });

  it('la semana que contiene el 24 de diciembre es la de Navidad', () => {
    expect(getThemeForDate(utc(2026, 12, 21)).theme.id).toBe('christmas');
    expect(getThemeForDate(utc(2026, 12, 27)).theme.id).toBe('christmas');
    expect(getThemeForDate(utc(2026, 12, 28)).theme.id).not.toBe('christmas');
  });
});

describe('storyBelongsToTheme', () => {
  const pirates = ROTATING_THEMES.find(({ id }) => id === 'pirates')!;

  it('encaja si alguna categoría del cuento es del tema', () => {
    expect(storyBelongsToTheme(['adventures', 'pirates'], pirates)).toBe(true);
  });

  it('no encaja si ninguna lo es', () => {
    expect(storyBelongsToTheme(['animals'], pirates)).toBe(false);
  });
});

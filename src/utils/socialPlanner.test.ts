import { describe, it, expect } from 'vitest';
import { mondayOf, nextMondayOf, isMonday, weekDatesFrom, validateWeekPlan } from './socialPlanner';

const at = (iso: string) => new Date(`${iso}T09:00:00Z`);

describe('fechas de la semana', () => {
  it('mondayOf devuelve el lunes de esa semana, también en domingo', () => {
    expect(mondayOf(at('2026-09-21'))).toBe('2026-09-21'); // lunes
    expect(mondayOf(at('2026-09-24'))).toBe('2026-09-21'); // jueves
    expect(mondayOf(at('2026-09-27'))).toBe('2026-09-21'); // domingo
  });

  it('nextMondayOf devuelve el lunes siguiente (lo que planifica el cron del jueves)', () => {
    expect(nextMondayOf(at('2026-09-24'))).toBe('2026-09-28');
  });

  it('isMonday valida formato y día', () => {
    expect(isMonday('2026-09-21')).toBe(true);
    expect(isMonday('2026-09-22')).toBe(false);
    expect(isMonday('21-09-2026')).toBe(false);
  });

  it('weekDatesFrom da los 7 días, también cruzando de mes', () => {
    expect(weekDatesFrom('2026-09-28')).toEqual(['2026-09-28', '2026-09-29', '2026-09-30', '2026-10-01', '2026-10-02', '2026-10-03', '2026-10-04']);
  });
});

describe('validateWeekPlan', () => {
  const weekDates = weekDatesFrom('2026-09-21');
  const candidateIds = new Set([1, 2, 3, 4, 5, 6, 7, 8]);
  const day = (date: string, storyId: number) => ({ date, storyId, format: 'recommendation' as const, angle: ' Hoy empieza el otoño ' });
  const raw = (days: ReturnType<typeof day>[], overrides = {}) => ({
    themeLabel: 'Llega el otoño', themeHashtag: '#LlegaElOtoño', rationale: 'Empieza el otoño el miércoles.', needs: [], days, ...overrides,
  });

  it('acepta un plan correcto y lo ordena por fecha', () => {
    const result = validateWeekPlan(raw(weekDates.map((date, i) => day(date, i + 1)).reverse()), { weekDates, candidateIds });
    expect(result.days.map(({ date }) => date)).toEqual(weekDates);
    expect(result.days[0].angle).toBe('Hoy empieza el otoño');
    expect(result.rejected).toEqual([]);
  });

  it('descarta un cuento que no estaba entre los candidatos', () => {
    const result = validateWeekPlan(raw([day('2026-09-21', 99)]), { weekDates, candidateIds });
    expect(result.days).toEqual([]);
    expect(result.rejected[0]).toContain('no estaba entre los candidatos');
  });

  it('descarta un cuento repetido y un día repetido, quedándose con el primero', () => {
    const result = validateWeekPlan(raw([day('2026-09-21', 1), day('2026-09-22', 1), day('2026-09-21', 2)]), { weekDates, candidateIds });
    expect(result.days).toEqual([expect.objectContaining({ date: '2026-09-21', storyId: 1 })]);
    expect(result.rejected).toHaveLength(2);
  });

  it('descarta un día fuera de la semana', () => {
    const result = validateWeekPlan(raw([day('2026-09-28', 1)]), { weekDates, candidateIds });
    expect(result.days).toEqual([]);
  });

  it('deriva el hashtag del hilo si la IA lo devuelve inservible', () => {
    expect(validateWeekPlan(raw([], { themeHashtag: '#' }), { weekDates, candidateIds }).themeHashtag).toBe('#LlegaElOtoño');
  });
});

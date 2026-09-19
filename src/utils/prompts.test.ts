import { describe, it, expect } from 'vitest';
import { generateSocialCaptionPrompt } from './prompts';

const input = {
  format: 'recommendation' as const,
  title: 'El tesoro de la isla',
  resume: 'Dos amigos encuentran un mapa.',
  characters: [],
  categoryTitles: ['Cuentos de Piratas'],
  age: '5-8',
  slug: 'el-tesoro-de-la-isla',
};

describe('generateSocialCaptionPrompt (semana temática)', () => {
  it('sin tema no menciona ninguna semana', () => {
    expect(generateSocialCaptionPrompt(input)).not.toContain('Semana');
  });

  it('con tema pide mencionarlo', () => {
    const prompt = generateSocialCaptionPrompt({ ...input, theme: { label: 'Semana pirata', dayOfWeek: 3 } });
    expect(prompt).toContain('"Semana pirata"');
    expect(prompt).toContain('día intermedio');
  });

  it('el lunes lo presenta como arranque y el domingo como cierre', () => {
    expect(generateSocialCaptionPrompt({ ...input, theme: { label: 'Semana pirata', dayOfWeek: 1 } })).toContain('arranca');
    expect(generateSocialCaptionPrompt({ ...input, theme: { label: 'Semana pirata', dayOfWeek: 7 } })).toContain('último día');
  });
});

describe('generateSocialCaptionPrompt (enfoque del plan semanal)', () => {
  it('incluye el enfoque del día si lo hay', () => {
    const prompt = generateSocialCaptionPrompt({ ...input, angle: 'Hoy empieza el otoño' });
    expect(prompt).toContain('"Hoy empieza el otoño"');
  });

  it('no habla de enfoque si no lo hay', () => {
    expect(generateSocialCaptionPrompt(input)).not.toContain('Enfoque de hoy');
  });
});

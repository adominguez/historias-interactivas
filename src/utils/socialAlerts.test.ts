import { describe, it, expect } from 'vitest';
import { buildPublishAlert, buildPlanAlert, buildHealthAlert, shortDate } from './socialAlerts';

describe('shortDate', () => {
  it('formatea en español', () => {
    expect(shortDate('2026-09-21')).toBe('Lun 21 sept');
  });
});

describe('buildPublishAlert', () => {
  it('no avisa si las dos redes fueron bien', () => {
    expect(buildPublishAlert({ surface: 'feed', storyTitle: 'X', facebook: { ok: true }, instagram: { ok: true } })).toBeNull();
  });

  it('avisa de la red que falló, con el motivo', () => {
    const alert = buildPublishAlert({
      surface: 'story', storyTitle: 'El faro', facebook: { ok: true },
      instagram: { ok: false, error: JSON.stringify({ error: { message: 'x', code: 190 } }) },
    });
    expect(alert).toContain('Story de la tarde');
    expect(alert).toContain('Facebook: ✅');
    expect(alert).toContain('Instagram: ❌ El token de Meta ha caducado');
  });
});

describe('buildPlanAlert', () => {
  const plan = {
    weekStart: '2026-09-21', themeLabel: 'Bienvenido otoño', themeHashtag: '#BienvenidoOtoño',
    needs: ['8 cuentos de Halloween'], days: [{ date: '2026-09-23', title: 'La pradera infinita' }], rejectedCount: 0,
  };

  it('resume el hilo, los días y lo que falta', () => {
    const alert = buildPlanAlert(plan);
    expect(alert).toContain('semana del 21 sept');
    expect(alert).toContain('Mié 23 sept · La pradera infinita');
    expect(alert).toContain('- 8 cuentos de Halloween');
    expect(alert).not.toContain('sin plan válido');
  });

  it('avisa de los días descartados', () => {
    expect(buildPlanAlert({ ...plan, rejectedCount: 2 })).toContain('2 día(s) sin plan válido');
  });
});

describe('buildHealthAlert', () => {
  it('no avisa si todo está bien', () => {
    expect(buildHealthAlert({ missingPlatforms: [], missingNextWeekPlan: null, metaTokenProblem: null })).toBeNull();
  });

  it('junta todos los problemas en un solo mensaje', () => {
    const alert = buildHealthAlert({ missingPlatforms: ['instagram', 'facebook_story'], missingNextWeekPlan: '2026-09-28', metaTokenProblem: 'Quedan 7 días' });
    expect(alert).toContain('Post de Instagram, Story de Facebook');
    expect(alert).toContain('semana del 28 sept');
    expect(alert).toContain('Quedan 7 días');
  });
});

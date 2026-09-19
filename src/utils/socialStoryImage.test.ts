import { describe, it, expect } from 'vitest';
import { buildStoryImageUrl, NEW_STORY_LABEL } from './socialStoryImage';

const base = { slug: 'el-faro-del-fenix', imageVersion: 1788187448, hookText: '¿Qué elegirías?' };

describe('buildStoryImageUrl', () => {
  it('sin rótulo, el gancho va arriba', () => {
    const url = buildStoryImageUrl(base);
    expect(url).not.toContain('CUENTO%20NUEVO');
    expect(url).toContain('fl_layer_apply,g_north,y_280/');
  });

  it('con rótulo, lo pone arriba y baja el gancho debajo', () => {
    const url = buildStoryImageUrl({ ...base, label: NEW_STORY_LABEL });
    const labelAt = url.indexOf('CUENTO%20NUEVO');
    const hookAt = url.indexOf('%C2%BFQu%C3%A9%20elegir%C3%ADas');
    expect(labelAt).toBeGreaterThan(-1);
    expect(labelAt).toBeLessThan(hookAt);
    expect(url).toContain('fl_layer_apply,g_north,y_280/');
    expect(url).toContain('fl_layer_apply,g_north,y_390/');
  });

  it('entrega JPEG en ambos casos (Instagram solo acepta JPEG)', () => {
    expect(buildStoryImageUrl(base)).toMatch(/\.jpg(\?|$)/);
    expect(buildStoryImageUrl({ ...base, label: NEW_STORY_LABEL })).toMatch(/\.jpg(\?|$)/);
  });

  it('acepta el rótulo de la semana temática', () => {
    expect(buildStoryImageUrl({ ...base, label: 'SEMANA PIRATA' })).toContain('SEMANA%20PIRATA');
  });
});

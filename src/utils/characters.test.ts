import { describe, it, expect } from 'vitest';
import { generateStorySetup, ages } from './characters';
import { setupCategories } from '@data/categories';

describe('generateStorySetup', () => {
  it('devuelve una configuración válida para cada categoría y edad reales', () => {
    for (const category of Object.keys(setupCategories)) {
      for (const age of ages) {
        const setup = generateStorySetup(category, age);
        expect(setup.category).toBe(category);
        expect(setup.age).toBe(age);
        expect(typeof setup.scenario).toBe('string');
        expect(setup.scenario.length).toBeGreaterThan(0);
        expect(setup.characterOptions.length).toBeGreaterThan(0);
        expect(setup.characterOptions.length).toBeLessThanOrEqual(8);
        // Sin personajes repetidos dentro del mismo grupo de candidatos
        expect(new Set(setup.characterOptions).size).toBe(setup.characterOptions.length);
      }
    }
  });

  it('elige categoría y edad al azar cuando no se especifican', () => {
    const setup = generateStorySetup(undefined, undefined);
    expect(Object.keys(setupCategories)).toContain(setup.category);
    expect(ages).toContain(setup.age);
  });
});

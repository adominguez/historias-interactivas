import { describe, it, expect } from 'vitest';
import { validateStoryIntegrity, resolveBlueprint, truncateString, hasScreenplayStyleDialogue } from './functions';

describe('hasScreenplayStyleDialogue', () => {
  const names = ['Niña del océano', 'Corsario del viento', 'Delfín guardián'];

  it('detecta "Nombre: texto"', () => {
    expect(hasScreenplayStyleDialogue('— Niña del océano: vamos a avanzar despacio.', names)).toBe(true);
  });

  it('detecta "Nombre —" (etiqueta de hablante con raya)', () => {
    expect(hasScreenplayStyleDialogue('<strong>Corsario del viento</strong> — Con la brasa en la mano...', names)).toBe(true);
  });

  it('detecta "Nombre dice: texto" (verbo de habla entre el nombre y los dos puntos)', () => {
    expect(hasScreenplayStyleDialogue('— Niña del océano dice: Las plataformas ya están más fuertes.', names)).toBe(true);
  });

  it('no marca una frase narrativa normal que empieza por el nombre', () => {
    expect(hasScreenplayStyleDialogue('El Corsario del viento asiente y ajusta las velas.', names)).toBe(false);
  });

  it('no marca un diálogo bien construido con raya y atribución natural', () => {
    expect(hasScreenplayStyleDialogue('—Vamos a avanzar con calma —dijo la Niña del océano.', names)).toBe(false);
  });
});

describe('validateStoryIntegrity', () => {
  it('detecta un enlace roto desde las opciones iniciales de la historia', () => {
    const result = validateStoryIntegrity(
      { slug: 'el-bosque', options: [{ text: 'Entrar', next: 'camino-inexistente' }] },
      [{ slug: 'final-feliz', options: [] } as any]
    );
    expect(result.isValidated).toBe(false);
    expect(result.errors.some(e => e.type === 'broken-link')).toBe(true);
  });

  it('detecta un nodo huérfano', () => {
    const result = validateStoryIntegrity(
      { slug: 'el-bosque', options: [{ text: 'Entrar', next: 'camino-a' }] },
      [
        { slug: 'camino-a', options: [] } as any,
        { slug: 'nodo-perdido', options: [] } as any,
      ]
    );
    expect(result.isValidated).toBe(false);
    expect(result.errors).toContainEqual({ type: 'orphan-node', slug: 'nodo-perdido' });
  });

  it('detecta que el cuento nunca termina', () => {
    const result = validateStoryIntegrity(
      { slug: 'el-bosque', options: [{ text: 'Entrar', next: 'camino-a' }] },
      [{ slug: 'camino-a', options: [{ text: 'Seguir', next: 'camino-a' }] } as any]
    );
    expect(result.isValidated).toBe(false);
    expect(result.errors.some(e => e.type === 'no-ending')).toBe(true);
  });

  it('detecta slugs duplicados entre nodos', () => {
    const result = validateStoryIntegrity(
      { slug: 'el-bosque', options: [{ text: 'Entrar', next: 'camino-a' }] },
      [
        { slug: 'camino-a', options: [] } as any,
        { slug: 'camino-a', options: [] } as any,
      ]
    );
    expect(result.isValidated).toBe(false);
    expect(result.errors.some(e => e.type === 'duplicate-slug')).toBe(true);
  });

  it('no da falsos positivos en un cuento válido', () => {
    const result = validateStoryIntegrity(
      { slug: 'el-bosque', options: [{ text: 'Entrar', next: 'camino-a' }, { text: 'Volver', next: 'camino-b' }] },
      [
        { slug: 'camino-a', options: [{ text: 'Seguir', next: 'final-a' }] } as any,
        { slug: 'camino-b', options: [] } as any,
        { slug: 'final-a', options: [] } as any,
      ]
    );
    expect(result.isValidated).toBe(true);
    expect(result.errors).toHaveLength(0);
  });
});

const characters = [{ name: 'Ana', description: 'curiosa' }];
const baseStory = { categories: ['fantasy'], characters, duration: null };

describe('resolveBlueprint', () => {
  it('descarta un nodo huérfano sin rechazar el resto del cuento', () => {
    const result = resolveBlueprint(
      { ...baseStory, title: 'El Bosque Mágico', summary: 'inicio', options: [{ text: 'Ir', next: 0 }] },
      [
        { title: 'Camino A', summary: 'a', options: [{ text: 'Seguir', next: 1 }] },
        { title: 'Final Feliz', summary: 'b', options: [] },
        { title: 'Nadie me referencia', summary: 'huerfano', options: [] },
      ]
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.nodes).toHaveLength(2);
    expect(result.nodes.map(n => n.title)).not.toContain('Nadie me referencia');
  });

  it('rechaza un índice de opción fuera de rango', () => {
    const result = resolveBlueprint(
      { ...baseStory, title: 'Historia rota', summary: 's', options: [{ text: 'Ir', next: 5 }] },
      [{ title: 'Nodo', summary: 's', options: [] }]
    );
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.errors[0].type).toBe('invalid-index');
  });

  it('rechaza un cuento sin ningún final entre los nodos alcanzables', () => {
    const result = resolveBlueprint(
      { ...baseStory, title: 'Bucle infinito', summary: 's', options: [{ text: 'Ir', next: 0 }] },
      [{ title: 'Nodo', summary: 's', options: [{ text: 'Seguir', next: 0 }] }]
    );
    expect(result.ok).toBe(false);
    // El bucle sobre sí mismo se detecta antes que la ausencia de final.
    if (result.ok) return;
    expect(['no-ending', 'self-loop']).toContain(result.errors[0].type);
  });

  it('desambigua slugs cuando dos nodos comparten título', () => {
    const result = resolveBlueprint(
      { ...baseStory, title: 'Cuento', summary: 's', options: [{ text: 'A', next: 0 }, { text: 'B', next: 1 }] },
      [
        { title: 'Final', summary: 's', options: [] },
        { title: 'Final', summary: 's', options: [] },
      ]
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.nodes.map(n => n.slug)).toEqual(['final', 'final-2']);
  });

  it('calcula back_slug y el historial de continuidad encadenados', () => {
    const result = resolveBlueprint(
      { ...baseStory, title: 'Aventura del Río', summary: 'resumen inicial', options: [{ text: 'Ir', next: 0 }] },
      [
        { title: 'Nudo con la moneda dorada', summary: 'encuentra la moneda dorada', options: [{ text: 'Seguir', next: 1 }] },
        { title: 'Desenlace con la moneda', summary: 'usa la moneda dorada', options: [] },
      ]
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const [first, last] = result.nodes;
    expect(first.backSlug).toBe(result.story.slug);
    expect(last.backSlug).toBe(first.slug);
    expect(result.historyBySlug.get(last.slug)).toEqual(['encuentra la moneda dorada']);
    expect(result.story.options).toEqual([{ text: 'Ir', next: first.slug }]);
  });

  it('el grafo resuelto pasa siempre validateStoryIntegrity (correcto por construcción)', () => {
    const result = resolveBlueprint(
      { ...baseStory, title: 'Cuento válido', summary: 's', options: [{ text: 'A', next: 0 }, { text: 'B', next: 1 }] },
      [
        { title: 'Camino A', summary: 's', options: [{ text: 'Seguir', next: 2 }] },
        { title: 'Camino B', summary: 's', options: [] },
        { title: 'Final A', summary: 's', options: [] },
      ]
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const sanity = validateStoryIntegrity({ slug: result.story.slug, options: result.story.options }, result.nodes as any);
    expect(sanity.isValidated).toBe(true);
  });

  it('rechaza una decisión de mentira (todas las opciones llevan al mismo nodo)', () => {
    const result = resolveBlueprint(
      { ...baseStory, title: 'Cuento', summary: 's', options: [{ text: 'A', next: 0 }] },
      [{ title: 'Nodo con decisión falsa', summary: 's', options: [{ text: 'X', next: 1 }, { text: 'Y', next: 1 }] },
       { title: 'Final', summary: 's', options: [] }]
    );
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.errors[0].type).toBe('pointless-choice');
  });

  it('rechaza un nodo que se referencia a sí mismo', () => {
    const result = resolveBlueprint(
      { ...baseStory, title: 'Cuento', summary: 's', options: [{ text: 'A', next: 0 }] },
      [{ title: 'Nodo con bucle', summary: 's', options: [{ text: 'X', next: 0 }, { text: 'Y', next: 1 }] },
       { title: 'Final', summary: 's', options: [] }]
    );
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.errors[0].type).toBe('self-loop');
  });

  it('rechaza que varios caminos distintos confluyan en el mismo nodo', () => {
    const result = resolveBlueprint(
      { ...baseStory, title: 'Cuento', summary: 's', options: [{ text: 'A', next: 0 }, { text: 'B', next: 1 }, { text: 'C', next: 2 }] },
      [
        { title: 'Camino A', summary: 'a', options: [{ text: 'Ir', next: 3 }] },
        { title: 'Camino B', summary: 'b', options: [{ text: 'Ir', next: 3 }] },
        { title: 'Camino C', summary: 'c', options: [{ text: 'Ir', next: 3 }] },
        { title: 'Final único', summary: 'f', options: [] },
      ]
    );
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.errors[0].type).toBe('convergent-node');
  });
});

describe('truncateString', () => {
  it('no corta el texto si ya cabe dentro del límite', () => {
    expect(truncateString('hola mundo', 800)).toBe('hola mundo');
  });

  it('corta en el último espacio antes del límite y añade "..."', () => {
    const input = 'una palabra muy larga que seguro que se pasa del límite establecido para la prueba';
    const result = truncateString(input, 20);
    expect(result).toBe('una palabra muy...');
  });
});

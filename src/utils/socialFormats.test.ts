import { describe, it, expect } from 'vitest';
import { resolveFormatForToday, normalizeHashtags, buildFacebookMessage, buildInstagramMessage } from './socialFormats';

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

describe('normalizeHashtags', () => {
  it('quita el guion que rompería la etiqueta en Facebook e Instagram', () => {
    expect(normalizeHashtags(['#Edad5-8'])).toEqual(['#Edad58']);
  });

  it('conserva tildes y ñ, que sí son válidas', () => {
    expect(normalizeHashtags(['#CuentosDeFantasía', '#Niños'])).toEqual(['#CuentosDeFantasía', '#Niños']);
  });

  it('añade la almohadilla si falta y quita las repetidas', () => {
    expect(normalizeHashtags(['LecturaInfantil', '#LecturaInfantil'])).toEqual(['#LecturaInfantil']);
  });

  it('quita espacios y signos de puntuación intermedios', () => {
    expect(normalizeHashtags(['#Lectura 5 a 8 años', '#cuentos,infantiles'])).toEqual(['#Lectura5a8años', '#cuentosinfantiles']);
  });

  it('descarta una etiqueta que se queda vacía al limpiarla', () => {
    expect(normalizeHashtags(['#', '#---', '#Válido'])).toEqual(['#Válido']);
  });

  it('colapsa dos etiquetas que limpian al mismo texto', () => {
    expect(normalizeHashtags(['#Edad-5-8', '#Edad58'])).toEqual(['#Edad58']);
  });
});

describe('buildFacebookMessage', () => {
  it('añade el enlace real al cuento en su propia línea, entre el texto y los hashtags', () => {
    const message = buildFacebookMessage('Un gancho.', 'bosque-estrellado', '#Cuentos #Lectura');
    expect(message).toBe(
      'Un gancho.\n\n👉 Léelo aquí: https://elarboldelashistorias.com/bosque-estrellado\n\n#Cuentos #Lectura'
    );
  });

  it('nunca usa localhost: el dominio sale de la configuración del sitio, no de SITE_URL', () => {
    expect(buildFacebookMessage('x', 'slug', '#y')).not.toContain('localhost');
  });
});

describe('buildInstagramMessage', () => {
  it('apunta al enlace de la bio, que es la única vía pulsable en Instagram', () => {
    const message = buildInstagramMessage('Un gancho.', '#Cuentos #Lectura');
    expect(message).toBe('Un gancho.\n\n🔗 Enlace en la bio para leerlo entero.\n\n#Cuentos #Lectura');
  });

  it('no incluye ninguna URL, porque Instagram no las hace clicables', () => {
    expect(buildInstagramMessage('Un gancho.', '#Cuentos')).not.toContain('http');
  });
});

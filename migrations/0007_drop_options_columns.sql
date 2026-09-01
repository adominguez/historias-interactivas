-- El grafo real de un cuento vive en 'edges' desde la migración 0006, y se
-- verificó (migrate-to-edges.mjs / verify-edges-migration.mjs) que todas las
-- filas coinciden byte a byte con el JSON viejo antes de dar por buena la
-- migración. Nada en el código vuelve a leer stories.options / nodes.options
-- (confirmado por auditoría completa del repo): ya solo quedan como
-- placeholders muertos. Las borramos.
ALTER TABLE stories DROP COLUMN options;
ALTER TABLE nodes DROP COLUMN options;

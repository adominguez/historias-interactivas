-- 'nodes' no tenía ningún índice más allá de la clave primaria, pese a que
-- todas sus consultas reales filtran por 'story_id' (deleteNodesByStoryId) o
-- por 'parent_slug' junto con 'slug' (getNodesByParentSlug,
-- getNodeBySlugAndParent, que es como se resuelve cada página de nodo). Con
-- 1283 filas todavía no se nota, pero sin índice es un table scan de texto
-- en cada carga de página de nodo, y crecerá con cada cuento nuevo.
CREATE INDEX IF NOT EXISTS idx_nodes_story_id ON nodes (story_id);
CREATE INDEX IF NOT EXISTS idx_nodes_parent_slug_slug ON nodes (parent_slug, slug);

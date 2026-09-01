-- El grafo de un cuento (qué opción lleva a qué escena) vivía como JSON de
-- texto libre dentro de stories.options / nodes.options: un "next" ahí
-- dentro es solo una cadena que SE PARECE a un slug real, pero SQLite no
-- tiene forma de comprobar que apunte a un nodo que exista de verdad. Por
-- eso ha hecho falta construir toda una capa de validación en la aplicación
-- (resolveBlueprint, validateStoryIntegrity, la herramienta de diagnóstico)
-- para cazar enlaces rotos y nodos huérfanos DESPUÉS de que ya se hayan
-- podido guardar.
--
-- Esta tabla mueve esa relación a filas reales con claves foráneas de
-- verdad. Turso SÍ aplica foreign_keys (comprobado en vivo: un INSERT con un
-- to_node_id inexistente lo rechaza con SQLITE_CONSTRAINT), así que un
-- enlace roto pasa de ser "algo que detectamos después" a "algo que la base
-- de datos no deja guardar".
--
-- from_node_id es NULL para las opciones iniciales del propio cuento (la
-- raíz no es una fila de 'nodes'); 'position' conserva el orden de las
-- opciones dentro de un mismo nodo/raíz.
CREATE TABLE edges (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  story_id INTEGER NOT NULL,
  from_node_id INTEGER,
  to_node_id INTEGER NOT NULL,
  text TEXT NOT NULL,
  position INTEGER NOT NULL,
  FOREIGN KEY (story_id) REFERENCES stories (id),
  FOREIGN KEY (from_node_id) REFERENCES nodes (id),
  FOREIGN KEY (to_node_id) REFERENCES nodes (id)
);

CREATE INDEX idx_edges_from ON edges (story_id, from_node_id);

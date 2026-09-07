-- Historial de publicaciones automáticas en redes sociales (ver
-- src/pages/api/social-auto-post.ts). Una fila por intento de publicación en
-- UNA plataforma (una ejecución diaria produce hasta 2 filas: Facebook +
-- Instagram del mismo cuento/formato), con éxito o fallo. status='failure'
-- existe para que un fallo (p.ej. un token de la Graph API caducado) quede
-- visible en la base de datos en vez de desaparecer, y para que NO cuente
-- como "ya publicado" a la hora de elegir el siguiente cuento (ver
-- getNextStoryToPost en src/turso.ts) — un intento fallido no debe quemar el
-- cooldown del cuento.
--
-- 'format' y 'platform' son texto libre a propósito (no CHECK/enum): añadir
-- un formato nuevo (reel, story...) más adelante no requiere ninguna
-- migración, solo un valor nuevo.
CREATE TABLE social_posts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  story_id INTEGER NOT NULL,
  format TEXT NOT NULL,
  platform TEXT NOT NULL,
  status TEXT NOT NULL,
  caption TEXT,
  external_post_id TEXT,
  error_message TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (story_id) REFERENCES stories (id)
);

CREATE INDEX idx_social_posts_story_status ON social_posts (story_id, status, created_at);
CREATE INDEX idx_social_posts_status_created ON social_posts (status, created_at);

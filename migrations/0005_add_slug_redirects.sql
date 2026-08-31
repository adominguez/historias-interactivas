-- Cuando se regenera un cuento en el mismo sitio (regenerate-story), hasta
-- ahora se forzaba a mantener el slug viejo para siempre, aunque el título
-- cambiase por completo (p. ej. "El Templo de Zeus" -> "El Faro del Fénix"
-- siguió viviendo en /el-templo-de-zeus). Es mejor SEO usar un slug que
-- coincida con el contenido real y dejar aquí registrada la redirección
-- 301 permanente desde el slug viejo, en vez de congelar la URL para
-- siempre o dar un 404 cuando cambie.
CREATE TABLE IF NOT EXISTS slug_redirects (
  old_slug TEXT PRIMARY KEY,
  story_id INTEGER NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (story_id) REFERENCES stories (id)
);

-- stories.dateModified en el schema.org de LayoutStory.astro era una copia
-- exacta de datePublished porque no existía ninguna columna que registrara
-- cuándo se había editado de verdad una historia (updateStoryText() cambia
-- el texto pero nunca tocaba ninguna fecha).
-- SQLite no permite DEFAULT CURRENT_TIMESTAMP en ALTER TABLE ADD COLUMN (solo
-- admite defaults constantes ahí), así que la fecha se fija desde el código
-- al insertar/editar (ver insertNewStory y updateStoryText en src/turso.ts).
ALTER TABLE stories ADD COLUMN updated_at DATETIME;

-- Para las historias ya existentes, "nunca editada" equivale a "modificada
-- por última vez cuando se creó".
UPDATE stories SET updated_at = created_at WHERE updated_at IS NULL;

-- Elimina dos tablas sin ningún uso en el código (confirmado con grep sobre src/):
--
-- story_categories: relación muchos-a-muchos categorías<->historias que nunca
-- llegó a usarse; las categorías de una historia se guardan en la práctica
-- como JSON en stories.categories (ver src/turso.ts). Sus 6 filas son
-- residuo de las dos historias de ejemplo del seed.sql original.
--
-- tblCategories: versión anterior y más pequeña de la tabla `categories`
-- actual (le faltan las columnas type/sort). Sus 16 slugs están todos ya
-- presentes en `categories`, así que no hay pérdida de datos.
DROP TABLE IF EXISTS story_categories;
DROP TABLE IF EXISTS tblCategories;

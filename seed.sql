-- Referencia del esquema real de la base de datos (Turso/libSQL), no un seed
-- que se ejecute automáticamente en ningún sitio. Se generó a partir del
-- esquema en vivo (sqlite_master) para que deje de estar desincronizado con
-- la realidad. Las migraciones nuevas viven en migrations/ y se aplican con
-- `npm run db:migrate`.

CREATE TABLE stories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,           -- Identificador único de la historia
    slug TEXT UNIQUE NOT NULL,                      -- Slug único del cuento
    title TEXT NOT NULL,                            -- Título del cuento
    description TEXT,                               -- Descripción del cuento
    keywords TEXT,                                  -- JSON con palabras clave
    text TEXT NOT NULL,                             -- Texto del nodo principal en formato HTML
    options TEXT NOT NULL,                          -- JSON con las opciones iniciales
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,  -- Fecha de creación
    categories TEXT,                                -- JSON con las categorías (fuente de verdad; ver nota abajo)
    resume TEXT,                                    -- Resumen del cuento
    characters TEXT,                                -- JSON con los personajes
    image TEXT,                                     -- Ruta de la imagen en Cloudinary
    age TEXT,                                       -- Edad recomendada
    duration TEXT,                                  -- Duración estimada
    rating REAL,                                    -- Calificación media
    rating_count INTEGER DEFAULT 0,                 -- Número de calificaciones
    updated_at DATETIME,                            -- Última edición real (ver updateStoryText en src/turso.ts); se fija desde el código, no con un DEFAULT
    image_version INTEGER                           -- Versión real de Cloudinary de 'image' (para construir una URL que cambie de verdad al regenerar la imagen); NULL en filas antiguas
);

CREATE TABLE nodes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    story_id INTEGER NOT NULL,
    slug TEXT NOT NULL,
    parent_slug TEXT,      -- Slug de la historia a la que pertenece el nodo
    back_slug TEXT,        -- Slug del nodo anterior en el camino
    text TEXT NOT NULL,
    options TEXT,          -- JSON con las opciones de navegación
    title TEXT,
    description TEXT,
    keywords TEXT,          -- JSON con palabras clave
    FOREIGN KEY (story_id) REFERENCES stories (id)
);

CREATE INDEX idx_nodes_story_id ON nodes (story_id);
CREATE INDEX idx_nodes_parent_slug_slug ON nodes (parent_slug, slug);

CREATE TABLE categories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    slug TEXT UNIQUE,
    name TEXT,              -- Nombre en inglés, es el valor que se guarda dentro de stories.categories
    title TEXT,
    meta_title TEXT,
    meta_description TEXT,
    content_by_age TEXT,    -- JSON
    initial_content TEXT,
    type TEXT,              -- 'general' | 'age'
    sort INTEGER DEFAULT 0
);

-- Nota: stories.categories es la única fuente de verdad para la relación
-- historia<->categoría (JSON array de `categories.name`, consultado con
-- json_each en src/turso.ts). No existe ninguna tabla de relación: la
-- tabla story_categories que hubo aquí antes nunca se llegó a usar y se
-- eliminó en migrations/0001_drop_dead_category_tables.sql.

-- Tabla de control de migraciones (la crea scripts/migrate.mjs si no existe).
CREATE TABLE schema_migrations (
    name TEXT PRIMARY KEY,
    applied_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

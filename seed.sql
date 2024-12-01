-- Crear tablas
CREATE TABLE stories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    slug TEXT UNIQUE NOT NULL,   -- Slug único del cuento
    title TEXT NOT NULL,         -- Título del cuento
    description TEXT,            -- Descripción del cuento
    keywords TEXT,               -- Palabras clave separadas por comas
    text TEXT NOT NULL,          -- Texto del nodo principal en formato HTML
    options TEXT NOT NULL,       -- JSON con las opciones iniciales
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP -- Fecha de creación
);

CREATE TABLE nodes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    story_id INTEGER NOT NULL,
    slug TEXT NOT NULL,
    parent_slug TEXT,
    back_slug TEXT,
    text TEXT NOT NULL,
    options TEXT,
    FOREIGN KEY (story_id) REFERENCES stories (id)
);

CREATE TABLE categories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT UNIQUE NOT NULL
);

CREATE TABLE story_categories (
    story_id INTEGER NOT NULL,
    category_id INTEGER NOT NULL,
    PRIMARY KEY (story_id, category_id),
    FOREIGN KEY (story_id) REFERENCES stories (id),
    FOREIGN KEY (category_id) REFERENCES categories (id)
);

-- Insertar categorías
INSERT INTO categories (name) VALUES ('Fantasía'), ('Aventuras'), ('Piratas'), ('Misterio'), ('Valores');

-- Insertar historias
INSERT INTO stories (slug, title, description, keywords)
VALUES
('la-ciudad-perdida-de-luzdor', 'La Ciudad Perdida de Luzdor', 'Descubre cómo Leo se embarca en una emocionante búsqueda para encontrar la mítica Ciudad Perdida de Luzdor. ¿Logrará superar los desafíos?', 'cuentos interactivos, aventuras infantiles, ciudad perdida, valentía, misterio'),
('la-isla-de-las-tortugas-doradas', 'La Isla de las Tortugas Doradas', 'Descubre cómo el pequeño Jack y el loro Max encuentran un mapa que los lleva a una isla mágica llena de tortugas doradas.', 'cuentos interactivos, piratas, tortugas doradas, niños 5-8 años');

-- Relacionar historias con categorías
INSERT INTO story_categories (story_id, category_id)
VALUES
(1, 1), (1, 2), (1, 4), -- La Ciudad Perdida de Luzdor
(2, 2), (2, 3), (2, 5); -- La Isla de las Tortugas Doradas

-- Insertar nodos
INSERT INTO nodes (story_id, slug, parent_slug, back_slug, text, options)
VALUES
(1, 'camino-del-rio', 'la-ciudad-perdida-de-luzdor', 'la-ciudad-perdida-de-luzdor', '<p>El <strong>camino del río</strong> era hermoso...</p>', '[{"text": "Escoger el cántaro como respuesta.", "next": "respuesta-correcta"}, {"text": "Escoger la caja como respuesta.", "next": "respuesta-incorrecta"}]'),
(1, 'respuesta-correcta', 'la-ciudad-perdida-de-luzdor', 'camino-del-rio', '<p>Leo escogió el <strong>cántaro</strong>...</p>', '[{"text": "Seguir el camino del río hacia Luzdor.", "next": "luzdor-cercano"}]');

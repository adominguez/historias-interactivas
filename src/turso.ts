import { createClient } from "@libsql/client/web";
import { TURSO_DATABASE_URL, TURSO_AUTH_TOKEN } from "astro:env/server";

export const turso = createClient({
  url: TURSO_DATABASE_URL,
  authToken: TURSO_AUTH_TOKEN,
});

export const insertNewStory = async (storyParams: (string | number | null)[]) => {
  // RETURNING en vez de una consulta separada a last_insert_rowid(): así el
  // id viene garantizado de la MISMA sentencia que hizo el insert, sin
  // depender de que una consulta aparte se resuelva en la misma sesión (con
  // el transporte HTTP de Turso, eso no está garantizado).
  const result = await turso.execute({
    sql: `
      INSERT INTO stories (title, slug, resume, text, description, keywords, categories, characters, image, age, duration, rating, image_version, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
      RETURNING id;
    `,
    args: storyParams,
  });

  const insertedId = result.rows[0]?.id as number;
  return { insertedId };
}

// Devuelve los id reales insertados, en el mismo orden que 'records', para
// poder construir después las filas de 'edges' (que referencian nodos por
// su id, no por su slug). RETURNING en vez de last_insert_rowid() por el
// mismo motivo que en insertNewStory.
export const insertNewNodes = async (records: any[]): Promise<number[]> => {
  const insertedIds: number[] = [];
  for (const record of records) {
    const result = await turso.execute({
      sql: `
        INSERT INTO nodes (story_id, slug, parent_slug, back_slug, text, title, description, keywords)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        RETURNING id;
      `,
      args: record,
    });
    insertedIds.push(result.rows[0].id as number);
  }
  return insertedIds;
}

// El grafo real de un cuento (ver migrations/0006_add_edges_table.sql):
// 'edges' es [storyId, fromNodeId (null = raíz del cuento), toNodeId, text,
// position]. Se hace en una transacción porque, si un solo edge fallara a
// mitad (p. ej. una foreign key rota), no queremos dejar el grafo del
// cuento a medio guardar.
export const insertEdges = async (edges: [number, number | null, number, string, number][]) => {
  const statements = edges.map(([storyId, fromNodeId, toNodeId, text, position]) => ({
    sql: "INSERT INTO edges (story_id, from_node_id, to_node_id, text, position) VALUES (?, ?, ?, ?, ?);",
    args: [storyId, fromNodeId, toNodeId, text, position],
  }));
  if (statements.length > 0) {
    await turso.batch(statements, "write");
  }
}

// Las opciones iniciales de un cuento (la raíz no es una fila de 'nodes'),
// resueltas a Option[] ({text, next: slug}) para que el resto de la
// aplicación (Options.astro, LayoutStory.astro...) siga trabajando igual
// que cuando venían de JSON.parse(stories.options).
export const getStoryOptions = async (storyId: number) => {
  const result = await turso.execute({
    sql: `
      SELECT e.text AS text, n.slug AS next
      FROM edges e
      JOIN nodes n ON n.id = e.to_node_id
      WHERE e.story_id = ? AND e.from_node_id IS NULL
      ORDER BY e.position;
    `,
    args: [storyId],
  });
  return result.rows as unknown as { text: string; next: string }[];
}

// Las opciones de un nodo concreto, resueltas igual que getStoryOptions.
export const getNodeOptions = async (nodeId: number) => {
  const result = await turso.execute({
    sql: `
      SELECT e.text AS text, n.slug AS next
      FROM edges e
      JOIN nodes n ON n.id = e.to_node_id
      WHERE e.from_node_id = ?
      ORDER BY e.position;
    `,
    args: [nodeId],
  });
  return result.rows as unknown as { text: string; next: string }[];
}

// Trae TODAS las edges de golpe (con el slug de destino ya resuelto), para
// el diagnóstico masivo (diagnose-stories.ts): evita tener que hacer una
// consulta por cada nodo/historia de las 175 que hay.
export const getAllEdgesResolved = async () => {
  const result = await turso.execute(`
    SELECT e.story_id AS story_id, e.from_node_id AS from_node_id, e.text AS text, n.slug AS next, e.position AS position
    FROM edges e
    JOIN nodes n ON n.id = e.to_node_id
    ORDER BY e.story_id, e.from_node_id, e.position;
  `);
  return result.rows as unknown as { story_id: number; from_node_id: number | null; text: string; next: string; position: number }[];
}

export const deleteEdgesByStoryId = async (storyId: number) => {
  await turso.execute({
    sql: "DELETE FROM edges WHERE story_id = ?;",
    args: [storyId],
  });
}

export const getNodesByParentSlug = async (slug: string) => {
  const result = await turso.execute({
    sql: `
      SELECT * FROM nodes WHERE parent_slug = ?;
    `,
    args: [slug],
  });

  return result.rows;
}

export const getNodeBySlugAndParent = async (slug: string, parentSlug: string) => {
  const result = await turso.execute({
    sql: "SELECT * FROM nodes WHERE slug = ? AND parent_slug = ?;",
    args: [slug, parentSlug],
  });

  return result.rows;
}

export const getTotalNodes = async () => {
  const result = await turso.execute({
    sql: `
      SELECT * FROM nodes;
    `,
    args: [],
  });

  return result.rows;
}

export const getStoryBySlug = async (slug: string) => {
  const result = await turso.execute({
    sql: "SELECT * FROM stories WHERE slug = ?;",
    args: [slug as string],
  });

  return result.rows;
}

// Registra que 'oldSlug' ya no es el slug real de esta historia (ver
// regenerateStory en create-story.ts, que cambia el slug para que coincida
// con el título nuevo tras una regeneración).
export const insertSlugRedirect = async (oldSlug: string, storyId: number) => {
  await turso.execute({
    sql: `
      INSERT INTO slug_redirects (old_slug, story_id)
      VALUES (?, ?)
      ON CONFLICT (old_slug) DO UPDATE SET story_id = excluded.story_id;
    `,
    args: [oldSlug, storyId],
  });
}

// Dado un slug que ya no existe como historia real, busca a qué slug actual
// hay que redirigir (301). Devuelve undefined si no hay redirección
// registrada para ese slug.
export const getRedirectTargetSlug = async (oldSlug: string): Promise<string | undefined> => {
  const result = await turso.execute({
    sql: `
      SELECT s.slug AS current_slug
      FROM slug_redirects r
      JOIN stories s ON s.id = r.story_id
      WHERE r.old_slug = ?;
    `,
    args: [oldSlug],
  });
  return result.rows[0]?.current_slug as string | undefined;
}

export const getStoriesList = async () => {
  const result = await turso.execute({
    sql: `
      SELECT * FROM stories;
    `,
    args: [],
  });
  return result.rows;
}

export const getFeaturedStoriesList = async () => {
  const result = await turso.execute({
    sql: `
    SELECT
      id,
      slug,
      title,
      description,
      created_at,
      resume,
      rating,
      rating_count,
      age,
      (rating * 0.7 + rating_count * 0.3) AS score
    FROM
      stories
    ORDER BY
      score DESC
    LIMIT 12;
  `,
    args: [],
  });
  return result.rows;
}

export const getStoryOrderByDate = async () => {
  const result = await turso.execute({
    sql: `
      SELECT * FROM stories ORDER BY created_at DESC LIMIT 12;
    `,
    args: [],
  });
  return result.rows;
}



export const getLittleStoriesList = async () => {
  const result = await turso.execute({
    sql: 'SELECT id, slug, title, description, created_at, resume, rating, rating_count, age, image_version FROM stories;',
    args: [],
  });
  return result.rows;
}

export const getSearchStories = async (query: string) => {
  const results = await turso.execute({
    sql: `
      SELECT title, slug, description
      FROM stories
      WHERE title LIKE ? OR keywords LIKE ? OR description LIKE ?
      LIMIT 5;
    `,
    args: [`%${query}%`, `%${query}%`, `%${query}%`],
  });

  return results.rows;
}


export const getRelatedStoriesBySlug = async (storySlug: string) => {
  const query = `
    WITH story_details AS (
      SELECT id, slug, age, json(keywords) AS keywords, json(categories) AS categories
      FROM stories
      WHERE slug = ?
    ),
    story_keywords AS (
      SELECT json_each.value AS keyword
      FROM story_details, json_each(story_details.keywords)
    ),
    related_stories AS (
      SELECT
        s.id,
        s.slug,
        s.title,
        s.description,
        s.created_at,
        s.resume,
        s.age,
        COUNT(DISTINCT sk.keyword) AS matching_keywords,
        (
          SELECT COUNT(*)
          FROM json_each(json(s.categories)) sc
          WHERE sc.value IN (
            SELECT value
            FROM story_details, json_each(story_details.categories)
          )
        ) AS matching_categories
      FROM stories s
      LEFT JOIN story_keywords sk
        ON sk.keyword IN (
          SELECT value
          FROM json_each(json(s.keywords))
        )
      WHERE s.slug <> (SELECT slug FROM story_details) -- Excluye la historia actual
        AND (
          s.age = (SELECT age FROM story_details) -- Coincide por edad
          OR matching_categories > 0 -- O categorías coincidentes
        )
      GROUP BY s.id
      ORDER BY matching_keywords DESC, matching_categories DESC, s.created_at DESC
    )
    SELECT
      related_stories.id,
      related_stories.slug,
      related_stories.title,
      related_stories.description,
      related_stories.created_at,
      related_stories.resume,
      related_stories.age
    FROM related_stories
    LIMIT 3;
  `;

  const result = await turso.execute({
    sql: query,
    args: [storySlug],
  });

  return result.rows;
};

export const getStoriesByCategory = async (category: string) => {
  const query = `
    SELECT
      s.id,
      s.slug,
      s.title,
      s.description,
      s.created_at,
      s.resume,
      s.age,
      s.rating,
      s.rating_count,
      s.image_version
    FROM
      stories s,
      json_each(json(s.categories)) c
    WHERE
      c.value = ? -- Coincidencia exacta con la categoría
    ORDER BY
      s.created_at DESC;
  `;

  const result = await turso.execute({
    sql: query,
    args: [category],
  });

  return result.rows;
};

export const getStoriesByAge = async (ages: string | string[]) => {
  // Asegúrate de que las edades sean un array
  const ageList = Array.isArray(ages) ? ages : [ages];

  // Generar placeholders dinámicos para cada edad
  const placeholders = ageList.map(() => '?').join(', ');

  const query = `
    SELECT
      s.id,
      s.slug,
      s.title,
      s.description,
      s.created_at,
      s.resume,
      s.age,
      s.rating,
      s.rating_count,
      s.image_version
    FROM
      stories s
    WHERE
      s.age IN (${placeholders})
    ORDER BY
      s.created_at DESC;
  `;

  const result = await turso.execute({
    sql: query,
    args: ageList,
  });

  return result.rows;
};

export const getRatingStoryBySlug = async (slug: string) => {
  const results = await turso.execute({
    sql: `
      SELECT rating, rating_count FROM stories WHERE slug = ?;
    `,
    args: [slug],
  });

  const [result] = results.rows;
  const { rating, rating_count: ratingCount } = result;
  return { rating, ratingCount };
}

export const updateStoryRating = async (slug: string, newRating: number, isRated: boolean) => {
  try {
    // Iniciar una transacción para garantizar consistencia
    const result = await turso.execute({
      sql: isRated ? `
        UPDATE stories
        SET rating = (
          (rating * rating_count + ?) / (rating_count + 1)
        )
        WHERE slug = ?;
      ` : `
        UPDATE stories
        SET rating = (
          (rating * rating_count + ?) / (rating_count + 1)
        ),
        rating_count = rating_count + 1
        WHERE slug = ?;
      `,
      args: [newRating, slug],
    });

    // Verificar si la actualización fue exitosa
    if (result.rowsAffected > 0) {
      const { rating, ratingCount } = await getRatingStoryBySlug(slug);
      console.log(`Rating actualizado correctamente: ${rating} (${ratingCount})`)
      return { success: true, message: 'Rating actualizado correctamente', rating, ratingCount };
    } else {
      console.error(`No se encontró ninguna historia con el slug: ${slug}`);
      return { success: false, message: 'No se encontró la historia' };
    }
  } catch (error) {
    console.error('Error al actualizar el rating:', error);
    return { success: false, message: 'Error al actualizar el rating' };
  }
};

export const insertNewCategory = async (categoryParams: (string)[]) => {
  await turso.execute({
    sql: `
      INSERT INTO categories (slug, name, title, initial_content, meta_title, meta_description, type, content_by_age)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?);
    `,
    args: categoryParams,
  });
}

export const getCategoriesByType = async (type: string) => {
  const result = await turso.execute({
    sql: `
      SELECT * FROM categories where type = ? ORDER BY
      sort;
    `,
    args: [type],
  });
  return result.rows;
}

export const getCategoryBySlug = async (slug: string) => {
  const result = await turso.execute({
    sql: `
      SELECT * FROM categories WHERE slug = ?;
    `,
    args: [slug],
  });
  return result.rows[0];
}

export const updateStoryText = async (id: number, text: string) => {
  await turso.execute({
    sql: `
      UPDATE stories
      SET text = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?;
    `,
    args: [text, id],
  });
}

// Edición manual desde /admin/editar-historia: a diferencia de las
// reparaciones con IA (que solo tocan 'text'), aquí la persona también
// puede corregir el título a mano.
export const updateStoryTitleAndText = async (id: number, title: string, text: string) => {
  await turso.execute({
    sql: `
      UPDATE stories
      SET title = ?, text = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?;
    `,
    args: [title, text, id],
  });
}

export const updateStory = async (id: number, fields: {
  slug: string;
  title: string;
  resume: string;
  text: string;
  description: string;
  keywords: string;
  categories: string;
  characters: string;
  age: string;
  duration: string;
  imageVersion: number | null;
}) => {
  await turso.execute({
    sql: `
      UPDATE stories
      SET slug = ?, title = ?, resume = ?, text = ?, description = ?, keywords = ?, categories = ?, characters = ?, age = ?, duration = ?, image_version = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?;
    `,
    args: [
      fields.slug,
      fields.title,
      fields.resume,
      fields.text,
      fields.description,
      fields.keywords,
      fields.categories,
      fields.characters,
      fields.age,
      fields.duration,
      fields.imageVersion,
      id,
    ],
  });
}

export const updateStoryImageVersion = async (id: number, imageVersion: number | null) => {
  await turso.execute({
    sql: `
      UPDATE stories
      SET image_version = ?
      WHERE id = ?;
    `,
    args: [imageVersion, id],
  });
}

export const updateNodeText = async (id: number, text: string) => {
  await turso.execute({
    sql: `
      UPDATE nodes
      SET text = ?
      WHERE id = ?;
    `,
    args: [text, id],
  });
}

// Edición manual desde /admin/editar-historia (ver updateStoryTitleAndText).
export const updateNodeTitleAndText = async (id: number, title: string, text: string) => {
  await turso.execute({
    sql: `
      UPDATE nodes
      SET title = ?, text = ?
      WHERE id = ?;
    `,
    args: [title, text, id],
  });
}

export const deleteStory = async (id: number) => {
  await turso.execute({
    sql: `
      DELETE FROM stories WHERE id = ?;
    `,
    args: [id],
  });
}

export const deleteNodesByStoryId = async (storyId: number) => {
  await turso.execute({
    sql: `
      DELETE FROM nodes WHERE story_id = ?;
    `,
    args: [storyId],
  });
}

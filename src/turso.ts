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
// El camino narrativo hasta un nodo: recorre back_slug hacia atrás desde el
// nodo objetivo hasta la raíz del cuento, devolviendo en orden (raíz →
// actual) el texto de la opción elegida en cada paso. Trae TODOS los nodos y
// TODAS las opciones del cuento de una vez (2 consultas, no 2 por nivel de
// profundidad) y hace el recorrido en memoria — un cuento típico tiene pocas
// decenas de nodos como mucho, así que es barato traerlo entero.
export const getStoryPathToNode = async (storyId: number, storySlug: string, targetNodeSlug: string) => {
  const [nodesResult, edgesResult] = await Promise.all([
    turso.execute({
      sql: "SELECT id, slug, back_slug FROM nodes WHERE story_id = ?;",
      args: [storyId],
    }),
    turso.execute({
      sql: "SELECT to_node_id, text FROM edges WHERE story_id = ?;",
      args: [storyId],
    }),
  ]);

  const nodeBySlug = new Map(nodesResult.rows.map((row) => [row.slug as string, row]));
  const edgeTextByToNodeId = new Map(edgesResult.rows.map((row) => [row.to_node_id as number, row.text as string]));

  const steps: { text: string; slug: string }[] = [];
  let slug = targetNodeSlug;

  while (true) {
    const node = nodeBySlug.get(slug);
    if (!node) break;

    steps.unshift({ text: edgeTextByToNodeId.get(node.id as number) ?? "", slug });

    const backSlug = node.back_slug as string | null;
    if (!backSlug || backSlug === storySlug) break; // el paso anterior es la raíz del cuento
    slug = backSlug;
  }

  return steps;
};

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

export const updateStoryRating = async (slug: string, newRating: number, previousRating?: number) => {
  try {
    // Si el navegador ya había votado antes (previousRating viene de su
    // localStorage), hay que sustituir esa contribución por la nueva en la
    // media, SIN tocar rating_count (sigue siendo el mismo votante). Si
    // rating_count es 0 (p. ej. localStorage dice "ya votó" pero la fila no
    // tiene votos reales, tras un reseteo de datos) se trata como voto nuevo.
    const result = await turso.execute({
      sql: previousRating !== undefined ? `
        UPDATE stories
        SET rating = CASE
            WHEN rating_count > 0 THEN (rating * rating_count - ? + ?) / rating_count
            ELSE ?
          END,
          rating_count = CASE WHEN rating_count > 0 THEN rating_count ELSE 1 END
        WHERE slug = ?;
      ` : `
        UPDATE stories
        SET rating = (
          (rating * rating_count + ?) / (rating_count + 1)
        ),
        rating_count = rating_count + 1
        WHERE slug = ?;
      `,
      args: previousRating !== undefined ? [previousRating, newRating, newRating, slug] : [newRating, slug],
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

export const insertSocialPost = async (row: {
  storyId: number;
  format: string;
  platform: string;
  status: "success" | "failure";
  caption: string | null;
  externalPostId: string | null;
  errorMessage: string | null;
}) => {
  await turso.execute({
    sql: `
      INSERT INTO social_posts (story_id, format, platform, status, caption, external_post_id, error_message)
      VALUES (?, ?, ?, ?, ?, ?, ?);
    `,
    args: [row.storyId, row.format, row.platform, row.status, row.caption, row.externalPostId, row.errorMessage],
  });
}

// ¿Ya se publicó hoy con éxito en alguna de estas plataformas? Sirve de
// freno al endpoint del cron (ver social-auto-post.ts): una segunda invocación
// el mismo día -- el navegador reenviando la petición con el Basic Auth
// cacheado, un reintento manual, un clic de más -- publicaría otra vez de
// verdad en Facebook/Instagram y gastaría otra generación de IA.
//
// Solo cuentan las filas 'success': si el intento de hoy falló (token de la
// Graph API caducado, timeout), el freno NO se activa y se puede reintentar,
// que es justo lo que se quiere. Si fue un éxito parcial (Facebook sí,
// Instagram no) el freno sí salta -- reintentar volvería a publicar en
// Facebook -- y para ese caso está ?force=1.
export const hasSuccessfulPostSince = async (sinceIso: string, platforms: string[]): Promise<boolean> => {
  if (platforms.length === 0) return false;
  const placeholders = platforms.map(() => "?").join(", ");
  const result = await turso.execute({
    sql: `
      SELECT 1 FROM social_posts
      WHERE status = 'success' AND created_at >= ? AND platform IN (${placeholders})
      LIMIT 1;
    `,
    args: [sinceIso, ...platforms],
  });
  return result.rows.length > 0;
}

export const getLastSuccessfulSocialFormat = async (): Promise<string | undefined> => {
  const result = await turso.execute(`
    SELECT format FROM social_posts WHERE status = 'success' ORDER BY created_at DESC LIMIT 1;
  `);
  return result.rows[0]?.format as string | undefined;
}

// Cuento elegible para publicar hoy: el primero que NO se haya publicado con
// éxito en los últimos COOLDOWN_DAYS días (ver src/utils/socialFormats.ts),
// o, si TODOS estuvieran en cooldown (llegará a pasar con ~175 cuentos y
// varias publicaciones/semana), el que lleve más tiempo sin publicarse con
// éxito — evita fallar la ejecución en vez de simplemente relajar el
// cooldown para ese caso. El propio ORDER BY resuelve los dos casos a la
// vez: las filas "elegibles" (nunca publicadas, o publicadas antes del
// corte) ordenan primero (0 < 1); dentro de cada grupo, last_posted_at
// ascendente deja primero las nunca publicadas (NULL ordena antes que
// cualquier valor en SQLite) y luego las más antiguas.
//
// `ages` limita la elección a las edades que encajan con el público de las
// redes (ver SOCIAL_AGES en socialFormats.ts).
export const getNextStoryToPost = async (cooldownCutoffIso: string, ages: string[]) => {
  const agePlaceholders = ages.map(() => "?").join(", ");
  const result = await turso.execute({
    sql: `
      SELECT s.*, MAX(sp.created_at) AS last_posted_at
      FROM stories s
      LEFT JOIN social_posts sp ON sp.story_id = s.id AND sp.status = 'success'
      WHERE s.age IN (${agePlaceholders})
      GROUP BY s.id
      ORDER BY
        (last_posted_at IS NOT NULL AND last_posted_at >= ?),
        last_posted_at
      LIMIT 1;
    `,
    args: [...ages, cooldownCutoffIso],
  });
  return result.rows[0];
}

// Como getNextStoryToPost, pero solo entre los cuentos de alguna de
// `categories` (las del tema de la semana, ver socialThemes.ts) y SIN su
// último recurso: si todos los del tema están en cooldown devuelve undefined
// en vez de repetir uno, y el endpoint cae a la cola general. Repetir un
// cuento a las pocas semanas por cuadrar el tema sería peor que un día fuera
// de tema.
export const getThemedStoryToPost = async (cooldownCutoffIso: string, ages: string[], categories: string[]) => {
  const agePlaceholders = ages.map(() => "?").join(", ");
  const categoryPlaceholders = categories.map(() => "?").join(", ");
  const result = await turso.execute({
    sql: `
      SELECT s.*, MAX(sp.created_at) AS last_posted_at
      FROM stories s
      LEFT JOIN social_posts sp ON sp.story_id = s.id AND sp.status = 'success'
      WHERE s.age IN (${agePlaceholders})
        AND EXISTS (SELECT 1 FROM json_each(s.categories) c WHERE c.value IN (${categoryPlaceholders}))
      GROUP BY s.id
      HAVING last_posted_at IS NULL OR last_posted_at < ?
      ORDER BY last_posted_at
      LIMIT 1;
    `,
    args: [...ages, ...categories, cooldownCutoffIso],
  });
  return result.rows[0];
}

// El cuento que salió hoy con éxito en el feed, si salió alguno. La Story de
// la tarde lo reutiliza (ver social-auto-post.ts): refuerza el post de la
// mañana en vez de gastar un segundo cuento del tema cada día.
export const getStoryPostedSince = async (sinceIso: string, platforms: string[]) => {
  const placeholders = platforms.map(() => "?").join(", ");
  const result = await turso.execute({
    sql: `
      SELECT s.*
      FROM stories s
      JOIN social_posts sp ON sp.story_id = s.id
      WHERE sp.status = 'success' AND sp.created_at >= ? AND sp.platform IN (${placeholders})
      ORDER BY sp.created_at DESC
      LIMIT 1;
    `,
    args: [sinceIso, ...platforms],
  });
  return result.rows[0];
}

// Cuento nuevo pendiente de salir en Stories: creado desde `sinceIso` y sin
// ninguna publicación con éxito en ninguna de `platforms` (las de Story). Si
// ya salió en una sola de ellas (Facebook bien, Instagram falló) NO vuelve a
// elegirse: republicarlo duplicaría la Story de Facebook. Del más antiguo al
// más nuevo, para que un lote creado de golpe salga en el orden en que se
// creó y ninguno se quede fuera de la ventana esperando detrás de los demás.
// Solo lo usa el cron de Stories (ver social-auto-post.ts); el feed sigue
// tirando únicamente de getNextStoryToPost.
export const getNewStoryForStories = async (sinceIso: string, platforms: string[], ages: string[]) => {
  const placeholders = platforms.map(() => "?").join(", ");
  const agePlaceholders = ages.map(() => "?").join(", ");
  const result = await turso.execute({
    sql: `
      SELECT s.*
      FROM stories s
      WHERE s.created_at >= ?
        AND s.age IN (${agePlaceholders})
        AND NOT EXISTS (
          SELECT 1 FROM social_posts sp
          WHERE sp.story_id = s.id AND sp.status = 'success' AND sp.platform IN (${placeholders})
        )
      ORDER BY s.created_at ASC
      LIMIT 1;
    `,
    args: [sinceIso, ...ages, ...platforms],
  });
  return result.rows[0];
}

// Cuentos publicados con éxito en redes (feed o Story, cualquier
// plataforma) desde `sinceIso`, uno por cuento (GROUP BY story_id: el mismo
// cuento publicado varias veces esta semana en distintos sitios cuenta una
// sola vez), del más reciente al más antiguo — para la página /destacados
// enlazada desde la bio de Instagram/Facebook. Si esa semana no hay
// ninguno (primer arranque, o el cron lleva días sin correr), cae a los
// cuentos más recientes del catálogo para que la página nunca salga vacía.
export const getFeaturedStories = async (sinceIso: string, limit: number) => {
  const featuredResult = await turso.execute({
    sql: `
      SELECT s.*, MAX(sp.created_at) AS featured_at
      FROM social_posts sp
      JOIN stories s ON s.id = sp.story_id
      WHERE sp.status = 'success' AND sp.created_at >= ?
      GROUP BY s.id
      ORDER BY featured_at DESC
      LIMIT ?;
    `,
    args: [sinceIso, limit],
  });

  if (featuredResult.rows.length > 0) return featuredResult.rows;

  const fallbackResult = await turso.execute({
    sql: `SELECT * FROM stories ORDER BY created_at DESC LIMIT ?;`,
    args: [limit],
  });
  return fallbackResult.rows;
}

// Cuántos finales tiene un cuento en total (nodos sin ninguna opción de
// salida, es decir sin ningún edge que salga de ellos) -- para el aviso
// "este cuento tiene N finales posibles" al llegar a uno de ellos (ver
// Options.astro), sin desvelar cuáles son los otros. Un cuento cuya propia
// raíz no tiene opciones (caso raro, sin nodos) cuenta como 1 final: el
// propio inicio.
export const getEndingCount = async (storyId: number) => {
  const result = await turso.execute({
    sql: `
      SELECT COUNT(*) AS count
      FROM nodes n
      WHERE n.story_id = ?
      AND NOT EXISTS (SELECT 1 FROM edges e WHERE e.from_node_id = n.id);
    `,
    args: [storyId],
  });
  const count = result.rows[0]?.count as number;
  return count > 0 ? count : 1;
}

// ---------------------------------------------------------------------------
// Plan semanal de redes (ver src/utils/socialPlanner.ts y la migración 0009).
// ---------------------------------------------------------------------------

// Cuentos que la IA puede elegir para una semana: de las edades de redes y
// sin publicarse con éxito desde `cooldownCutoffIso`. Mismo orden que la cola
// diaria (nunca publicados primero, luego los que llevan más tiempo sin
// salir); `limit` acota lo que se le manda a la IA.
export const getPlanCandidates = async (cooldownCutoffIso: string, ages: string[], limit: number) => {
  const agePlaceholders = ages.map(() => "?").join(", ");
  const result = await turso.execute({
    sql: `
      SELECT s.id, s.title, s.resume, s.categories, s.age, s.created_at, MAX(sp.created_at) AS last_posted_at
      FROM stories s
      LEFT JOIN social_posts sp ON sp.story_id = s.id AND sp.status = 'success'
      WHERE s.age IN (${agePlaceholders})
      GROUP BY s.id
      HAVING last_posted_at IS NULL OR last_posted_at < ?
      ORDER BY last_posted_at
      LIMIT ?;
    `,
    args: [...ages, cooldownCutoffIso, limit],
  });
  return result.rows;
}

// Cuántos cuentos disponibles (mismas condiciones que getPlanCandidates, sin
// límite) hay de cada categoría. Con esto la IA puede avisar de lo que falta
// para las próximas fechas señaladas ("para Halloween hay 3 de 3-4 años").
export const getAvailableStoryCountsByCategory = async (cooldownCutoffIso: string, ages: string[]) => {
  const agePlaceholders = ages.map(() => "?").join(", ");
  const result = await turso.execute({
    sql: `
      WITH available AS (
        SELECT s.id, s.categories
        FROM stories s
        LEFT JOIN social_posts sp ON sp.story_id = s.id AND sp.status = 'success'
        WHERE s.age IN (${agePlaceholders})
        GROUP BY s.id
        HAVING MAX(sp.created_at) IS NULL OR MAX(sp.created_at) < ?
      )
      SELECT c.value AS category, COUNT(*) AS available
      FROM available, json_each(available.categories) c
      GROUP BY c.value
      ORDER BY available DESC;
    `,
    args: [...ages, cooldownCutoffIso],
  });
  return result.rows.map((row) => ({ category: row.category as string, available: Number(row.available) }));
}

// Hilos de las últimas semanas planificadas antes de `beforeWeekStart`, para
// que la IA no repita el mismo tema semana tras semana.
export const getRecentWeekThemes = async (beforeWeekStart: string, limit: number) => {
  const result = await turso.execute({
    sql: `SELECT week_start, theme_label FROM social_week_plans WHERE week_start < ? ORDER BY week_start DESC LIMIT ?;`,
    args: [beforeWeekStart, limit],
  });
  return result.rows.map((row) => ({ weekStart: row.week_start as string, themeLabel: row.theme_label as string }));
}

// Hilo de la semana planificada, aunque el día de hoy no tenga fila (la IA
// lo propuso mal y se descartó): ese día sale un cuento de la cola general
// sin presentarlo como parte del hilo, en vez de mezclar el hilo del plan con
// el tema de la rotación.
export const getWeekPlanTheme = async (weekStart: string) => {
  const result = await turso.execute({ sql: `SELECT theme_label, theme_hashtag FROM social_week_plans WHERE week_start = ?;`, args: [weekStart] });
  const row = result.rows[0];
  return row ? { label: row.theme_label as string, hashtag: row.theme_hashtag as string } : undefined;
}

export const hasWeekPlan = async (weekStart: string) => {
  const result = await turso.execute({ sql: `SELECT 1 FROM social_week_plans WHERE week_start = ?;`, args: [weekStart] });
  return result.rows.length > 0;
}

// Guarda (o sustituye) el plan de una semana en una sola transacción: o
// queda el plan nuevo entero, o sigue el anterior — nunca media semana de
// cada uno.
export const saveWeekPlan = async (plan: {
  weekStart: string;
  themeLabel: string;
  themeHashtag: string;
  rationale: string;
  needs: string[];
  specialDates: unknown;
  days: { date: string; storyId: number; format: string; angle: string }[];
}) => {
  await turso.batch([
    { sql: `DELETE FROM social_plan_days WHERE week_start = ?;`, args: [plan.weekStart] },
    { sql: `DELETE FROM social_week_plans WHERE week_start = ?;`, args: [plan.weekStart] },
    {
      sql: `INSERT INTO social_week_plans (week_start, theme_label, theme_hashtag, rationale, needs, special_dates) VALUES (?, ?, ?, ?, ?, ?);`,
      args: [plan.weekStart, plan.themeLabel, plan.themeHashtag, plan.rationale, JSON.stringify(plan.needs), JSON.stringify(plan.specialDates)],
    },
    ...plan.days.map((day) => ({
      sql: `INSERT INTO social_plan_days (date, week_start, story_id, format, angle) VALUES (?, ?, ?, ?, ?);`,
      args: [day.date, plan.weekStart, day.storyId, day.format, day.angle],
    })),
  ], "write");
}

// Lo planificado para `date`, con la fila completa del cuento (como las demás
// funciones de selección de cuento) más los datos del plan con prefijo
// plan_/theme_ para que no choquen con columnas de stories. Vuelve a filtrar
// por edad: si el cuento cambió de edad (o se borró) después de planificarse,
// ese día cae a la rotación en vez de publicarlo igual.
export const getPlannedDay = async (date: string, ages: string[]) => {
  const agePlaceholders = ages.map(() => "?").join(", ");
  const result = await turso.execute({
    sql: `
      SELECT s.*, d.format AS plan_format, d.angle AS plan_angle, w.theme_label, w.theme_hashtag, w.week_start AS plan_week_start
      FROM social_plan_days d
      JOIN social_week_plans w ON w.week_start = d.week_start
      JOIN stories s ON s.id = d.story_id
      WHERE d.date = ? AND s.age IN (${agePlaceholders});
    `,
    args: [date, ...ages],
  });
  return result.rows[0];
}

// Plan de una semana listo para leer: el hilo, lo que falta en el catálogo y
// cada día con su cuento y si ya salió en el feed ese día.
export const getWeekPlanWithDays = async (weekStart: string) => {
  const weekResult = await turso.execute({ sql: `SELECT * FROM social_week_plans WHERE week_start = ?;`, args: [weekStart] });
  const week = weekResult.rows[0];
  if (!week) return undefined;

  const daysResult = await turso.execute({
    sql: `
      SELECT d.date, d.format, d.angle, s.id AS story_id, s.slug, s.title, s.age,
        EXISTS (
          SELECT 1 FROM social_posts sp
          WHERE sp.story_id = d.story_id AND sp.status = 'success'
            AND sp.platform IN ('facebook', 'instagram') AND date(sp.created_at) = d.date
        ) AS published
      FROM social_plan_days d
      LEFT JOIN stories s ON s.id = d.story_id
      WHERE d.week_start = ?
      ORDER BY d.date;
    `,
    args: [weekStart],
  });

  return {
    weekStart: week.week_start as string,
    themeLabel: week.theme_label as string,
    themeHashtag: week.theme_hashtag as string,
    rationale: week.rationale as string | null,
    needs: JSON.parse((week.needs as string | null) ?? "[]") as string[],
    specialDates: JSON.parse((week.special_dates as string | null) ?? "[]"),
    createdAt: week.created_at as string,
    days: daysResult.rows.map((row) => ({
      date: row.date as string,
      format: row.format as string,
      angle: row.angle as string | null,
      story: row.story_id ? { id: row.story_id as number, slug: row.slug as string, title: row.title as string, age: row.age as string } : null,
      published: Boolean(row.published),
    })),
  };
}

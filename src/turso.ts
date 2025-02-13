import { createClient } from "@libsql/client/web";
import { TURSO_DATABASE_URL, TURSO_AUTH_TOKEN } from "astro:env/server";

export const turso = createClient({
  url: TURSO_DATABASE_URL,
  authToken: TURSO_AUTH_TOKEN,
});

export const insertNewStory = async (storyParams: (string | number)[]) => {
  await turso.execute({
    sql: `
      INSERT INTO stories (title, slug, resume, text, options, description, keywords, categories, characters, image, age, duration, rating)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
    `,
    args: storyParams,
  });

  // Obtén el ID del último registro insertado
  const result = await turso.execute({
    sql: `
      SELECT last_insert_rowid() as id;
    `,
    args: [],
  });

  const insertedId = result.rows[0]?.id;
  return { insertedId };
}

export const insertNewNodes = async (records: any[]) => {
  for (const record of records) {
    await turso.execute({
      sql: `
        INSERT INTO nodes (story_id, slug, parent_slug, back_slug, text, options, title, description, keywords)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?);
      `,
      args: record,
    });
  }
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
    sql: 'SELECT id, slug, title, description, created_at, resume, rating, rating_count, age FROM stories;',
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
      s.rating_count
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
      s.rating_count
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

export const getCategories = async () => {
  const result = await turso.execute({
    sql: `
      SELECT * FROM categories;
    `,
    args: [],
  });
  return result.rows;
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
      SET text = ?
      WHERE id = ?;
    `,
    args: [text, id],
  });
}

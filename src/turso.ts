import { createClient } from "@libsql/client/web";

export const turso = createClient({
  url: import.meta.env.TURSO_DATABASE_URL,
  authToken: import.meta.env.TURSO_AUTH_TOKEN,
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

export const getLittleStoriesList = async () => {
  const result = await turso.execute({
    sql: 'SELECT id, slug, title, description, created_at, resume FROM stories;',
    args: [],
  });
  return result.rows;
}

import { ageCategories } from '@src/data/categories';
import { insertNewCategory } from '@src/turso';

export async function GET(request: Request) {
  console.log('acaba de entrar en la función GET');

  await Promise.all(
    ageCategories.map(async ({slug, name, title, metaTitle, metaDescription, contentByAge, initialContent, type}) => {
      const params = [
        slug,
        name,
        title,
        initialContent,
        metaTitle,
        metaDescription,
        type,
        JSON.stringify(contentByAge)
      ]
      return await insertNewCategory(params);
    })
  )

  return new Response(JSON.stringify({ message: "Ser crean las categorias" }), { status: 200 });
}


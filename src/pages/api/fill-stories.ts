import { getStoriesList, getNodesByParentSlug, insertNewTblNode, insertNewTblStory } from "@src/turso";
import { truncateString, validateStoryIntegrity } from "@src/utils/functions";

export async function GET(request: Request) {
  const stories = await getStoriesList();
  const storiesSlug = stories.map(({ slug }) => slug);
  
  const nodes = await Promise.all(
    storiesSlug.map(async (slug) => {
      return await getNodesByParentSlug(slug)
    })
  )

  const validatedStories = stories.filter((story, index) => {
    if (nodes[index].length === 0) {
      return false;
    } else {
      const { isValidated } = validateStoryIntegrity(nodes[index].map((node) => ({...node, options: JSON.parse(node.options)})));
      return isValidated;
    }
  });

  const validatedNodes = nodes.flat().filter((node) => {
    return validatedStories.some((story) => story.id === node.story_id);
  })

  // await Promise.all(
  //   validatedStories.map(async (story) => {
  //     const params = [
  //       story.title,
  //       story.slug,
  //       story.resume,
  //       story.text,
  //       story.options,
  //       story.description,
  //       story.keywords,
  //       story.categories,
  //       story.characters,
  //       `cuentos-interactivos/${story.slug}/${story.slug}`,
  //       '5-8',
  //       '10-15 minutos',
  //       0
  //     ]
  //     return await insertNewTblStory(params);
  //   })
  // )

  // await Promise.all(
  //   validatedNodes.map(async (node) => {
  //     const params = [
  //       node.story_id,
  //       node.slug,
  //       node.parent_slug,
  //       node.back_slug,
  //       node.text,
  //       node.options,
  //       node.title,
  //       node.description,
  //       node.keywords
  //     ]
  //     return await insertNewTblNode(params);
  //   })
  // )






  // stories.forEach((story, index) => {
  //   console.log(`Cuento: ${story.title}`);
  //   if (nodes[index].length > 0) {
  //     const { isValidated } = validateStoryIntegrity(nodes[index].map((node) => ({...node, options: JSON.parse(node.options)})));
  //     if (isValidated) {
  //       console.log(`¡Todo está correctamente enlazado!`);
  //       validatedStories.push(story);
  //       nodes[index].forEach((node) => {
  //         validatedNodes.push(node);
  //       })
  //     }
  //   } else {
  //     console.log(`El cuento "${story.title}" no tiene nodos asociados`);
  //   }
  // });

  return new Response(JSON.stringify({ validatedStories, validatedNodes}), { status: 200 });
}
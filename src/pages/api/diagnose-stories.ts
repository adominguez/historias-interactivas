import { getStoriesList, getTotalNodes } from "@src/turso";
import { diagnoseStory } from "@src/utils/functions";
import { type Node, type Option } from "@types";

// Diagnóstico de todos los cuentos ya publicados: solo comprobaciones
// deterministas (grafo, regex, diccionario), sin ninguna llamada a IA, así
// que se puede analizar la base de datos entera de golpe sin coste.
export async function GET() {
  const [storyRows, nodeRows] = await Promise.all([getStoriesList(), getTotalNodes()]);

  const nodesByStoryId = new Map<number, typeof nodeRows>();
  nodeRows.forEach(row => {
    const storyId = row.story_id as number;
    const list = nodesByStoryId.get(storyId) ?? [];
    list.push(row);
    nodesByStoryId.set(storyId, list);
  });

  const results = storyRows
    .map(story => {
      const storyId = story.id as number;
      const rawNodes = nodesByStoryId.get(storyId) ?? [];

      const nodes: Node[] = rawNodes.map(node => ({
        id: node.id as number,
        title: node.title as string,
        description: node.description as string,
        slug: node.slug as string,
        parentSlug: node.parent_slug as string,
        backSlug: node.back_slug as string | undefined,
        text: node.text as string,
        options: JSON.parse(node.options as string),
        storyId,
      }));

      const storyOptions: Option[] = JSON.parse(story.options as string);
      const characters = JSON.parse(story.characters as string) as { name: string; description: string }[];
      const characterNames = characters.map(({ name }) => name);

      // "story" es el slug reservado para la raíz del cuento (no tiene slug
      // de nodo propio); el resto son slugs reales de 'nodes'.
      const contentTargets = [
        { slug: "story", text: story.text as string },
        ...nodes.map(node => ({ slug: node.slug, text: node.text })),
      ];

      const issues = diagnoseStory(
        { slug: story.slug as string, options: storyOptions },
        nodes,
        contentTargets,
        characterNames
      );

      return {
        storyId,
        storySlug: story.slug as string,
        storyTitle: story.title as string,
        issues,
      };
    })
    .filter(result => result.issues.length > 0);

  return new Response(JSON.stringify({ results, scannedStories: storyRows.length }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}

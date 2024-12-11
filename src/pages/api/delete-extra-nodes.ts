import { findExtraNodes } from "@src/utils/functions";
import { getNodesByParentSlug } from "@src/turso";
import { type Node } from "@types";

export async function GET(request: Request) {
  // Obtenemos los nodos del cuento por el slug del nodo raíz
  const slug = 'panda-y-oveja-en-el-bosque-de-arces'
  const nodes = await getNodesByParentSlug(slug);
  console.log('Nodos extra: ', nodes);

  const extraNodes = findExtraNodes(slug, nodes);
  // Devolvemos el resultado
  return new Response(JSON.stringify({ extraNodes, nodes, extraNodesLength: extraNodes.length, nodesLength: nodes.length }), { status: 200 });
}
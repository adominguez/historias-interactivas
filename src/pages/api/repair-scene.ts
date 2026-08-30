import { createOpenAI } from "@ai-sdk/openai";
import { generateObject } from "ai";
import { repairedTextSchema } from "@src/schemas";
import { hasScreenplayStyleDialogue, findInvalidSpanishWords } from "@src/utils/functions";
import { generateRepairPrompt } from "@src/utils/prompts";
import { getStoryBySlug, getNodeBySlugAndParent, updateStoryText, updateNodeText } from "@src/turso";
import { OPENAI_API_KEY } from "astro:env/server";

const openai = createOpenAI({
  apiKey: OPENAI_API_KEY,
});

const MAX_REPAIR_ATTEMPTS = 3;

const detectContentIssues = (text: string, characterNames: string[]) => ({
  invalidWords: findInvalidSpanishWords(text, characterNames),
  isScreenplayStyle: hasScreenplayStyleDialogue(text, characterNames),
});

// Repara el texto de UNA escena ya publicada: le pasamos al modelo el texto
// completo actual y los problemas detectados, y le pedimos que reescriba SOLO
// eso (ver generateRepairPrompt). Reutilizamos las mismas comprobaciones
// deterministas de la generación para validar el resultado antes de darlo por
// bueno, con el mismo patrón de reintento por escena que ya usa create-story.
const repairSceneText = async ({ text, characterNames, age }: { text: string, characterNames: string[], age: string }) => {
  let current = text;
  let issues = detectContentIssues(current, characterNames);
  let attempts = 0;

  while (attempts < MAX_REPAIR_ATTEMPTS) {
    attempts += 1;
    const result = await generateObject({
      model: openai('gpt-5-nano'),
      maxOutputTokens: 4000,
      providerOptions: {
        openai: {
          reasoningEffort: "low",
        },
      },
      prompt: generateRepairPrompt({ age, text: current, characterNames, issues }),
      schema: repairedTextSchema,
    });

    current = result.object.text;
    issues = detectContentIssues(current, characterNames);

    if (issues.invalidWords.length === 0 && !issues.isScreenplayStyle) {
      return { text: current, fixed: true, attempts, remainingIssues: issues };
    }
  }

  return { text: current, fixed: false, attempts, remainingIssues: issues };
};

export async function GET(request: Request) {
  const url = new URL(request.url);
  const storySlug = url.searchParams.get("storySlug") || undefined;
  // "story" repara la raíz del cuento; cualquier otro valor es el slug real
  // de un nodo (ver el mismo slug reservado en diagnose-stories.ts).
  const target = url.searchParams.get("target") || undefined;

  if (!storySlug || !target) {
    return new Response(JSON.stringify({ error: "Faltan los parámetros 'storySlug' y 'target'" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const [story] = await getStoryBySlug(storySlug);
  if (!story) {
    return new Response(JSON.stringify({ error: "No se ha encontrado el cuento" }), {
      status: 404,
      headers: { "Content-Type": "application/json" },
    });
  }

  const isRoot = target === "story";
  let currentText: string;
  let nodeId: number | undefined;

  if (isRoot) {
    currentText = story.text as string;
  } else {
    const [node] = await getNodeBySlugAndParent(target, storySlug);
    if (!node) {
      return new Response(JSON.stringify({ error: "No se ha encontrado la escena" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }
    currentText = node.text as string;
    nodeId = node.id as number;
  }

  const characters = JSON.parse(story.characters as string) as { name: string; description: string }[];
  const characterNames = characters.map(({ name }) => name);
  const age = story.age as string;

  const { invalidWords, isScreenplayStyle } = detectContentIssues(currentText, characterNames);
  if (invalidWords.length === 0 && !isScreenplayStyle) {
    return new Response(JSON.stringify({ message: "No se ha detectado ningún problema de contenido en esta escena, no hace falta reparar" }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }

  const { text: repairedText, fixed, attempts, remainingIssues } = await repairSceneText({ text: currentText, characterNames, age });

  if (isRoot) {
    await updateStoryText(story.id as number, repairedText);
  } else {
    await updateNodeText(nodeId as number, repairedText);
  }

  return new Response(JSON.stringify({ fixed, attempts, remainingIssues, before: currentText, after: repairedText }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}

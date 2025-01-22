import { openai } from "@ai-sdk/openai";
import OpenAI from "openai";
import { getStoriesList } from "@src/turso";

const getNewText = async ({ text, id }: { text: string, id: number }) => {
  // Generamos el prompt para OpenAI
  console.log('Generando cuento...');
  const prompt = generateStoryPrompt({ scenario, characters, category, age });
  const schema = fullSchema;
  const result = await generateObject({
    model: openai('gpt-4o-mini'),
    system: `Eres un escritor de cuentos interactivos para ${AGES[age].type} de ${AGES[age].alias} con habilidades SEO.
    Cada nodo y la historia principal deben incluir un objeto "meta" con los siguientes campos:
    - "keywords": Una lista de palabras clave relevantes al contenido.
    - "title": Un título breve y descriptivo para SEO.
    - "description": Una descripción atractiva que resuma el contenido.`,
    prompt,
    schema,
  });

export async function GET(request: Request) {
  console.log('Va a comenzar la actualización de los cuentos...');
  const stories = await getStoriesList();

  console.log(stories[0].text);

  return new Response(JSON.stringify({ stories: stories.map(({text, id}) => ({id, text})) }), { status: 200 });
}


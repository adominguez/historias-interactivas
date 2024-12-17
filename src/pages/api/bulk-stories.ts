import { ages } from '@src/utils/characters';

function fillAgeArray(totalLength: number): string[] {
  const result: string[] = [];
  const ageCount = ages.length;

  // Calcula cuántas veces se puede repartir cada edad uniformemente
  const baseCount = Math.floor(totalLength / ageCount);
  let remainder = totalLength % ageCount;

  // Primero, añadimos la cantidad base de cada edad
  for (const age of ages) {
    for (let i = 0; i < baseCount; i++) {
      result.push(age);
    }
  }

  // Ahora, distribuimos el resto equitativamente
  for (let i = 0; i < remainder; i++) {
    result.push(ages[i % ageCount]);
  }

  return result;
}

export async function GET(request: Request) {
  console.log('acaba de entrar en la función GET');

  // Obtener la URL completa
  const url = new URL(request.url);

  // Extraer el parámetro "category"
  const size = url.searchParams.get("size") || '10';

  // New array from size
  const stories = fillAgeArray(parseInt(size));

  const response = await Promise.all(
    stories.map(async (ages) => {
      return await fetch(`${import.meta.env.SITE_URL}/api/create-story?age=${ages}`);
    })
  )

  return new Response(JSON.stringify({ message: "Ha terminado de hacer el bulk", response }), { status: 200 });
}


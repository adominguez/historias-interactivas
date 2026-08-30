export async function GET(request: Request) {

  const body = JSON.stringify({
    caption: `En un rincón olvidado del océano se encuentra el Jardín de los Timones, un lugar mágico donde los vientos susurran secretos y las olas cuentan historias de piratas. 🗺️✨

    Tres amigos se embarcan en la búsqueda del legendario Timón de la Fortuna:
    
    🏹 Leo, el Arquero del Galeón, valiente y con puntería excepcional.
    🦋 Marina, la Mariposa de las Olas, curiosa y llena de energía.
    🐉 Drago, el Dragón de los Mares, un pez volador siempre dispuesto a ayudar.
    Cada uno debe elegir un camino diferente en esta emocionante aventura. ¿Qué desafíos les esperan? ¿Lograrán reunirse y encontrar el Timón de la Fortuna? 🤔🔍
    
    ¡Tú decides su destino! Sumérgete en esta historia y elige el camino que más te intrigue. 🚀📖
    
    🔗 Lee el cuento completo y toma tus decisiones aquí: Aventuras en el Jardín de los Timones https://elarboldelashistorias.com/aventuras-en-el-jardin-de-los-timones`,
    url: 'https://res.cloudinary.com/dnxab4qma/image/upload/c_limit,w_2048/f_auto/q_auto/v1737579916/cuentos-interactivos/aventuras-en-el-jardin-de-los-timones/aventuras-en-el-jardin-de-los-timones'
  });
    

  const data = await fetch('http://localhost:4321/api/post-facebook', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body
  })

  const message = await data.json()

  return new Response(JSON.stringify({ message }))
}
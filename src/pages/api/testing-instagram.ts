export async function GET(request: Request) {

  const body = JSON.stringify({
    caption: `✨ "La niña se adentró en el bosque prohibido, sin saber que su destino cambiaría para siempre…" 🌳🔮

    Descubre la historia completa aquí: https://elarboldelashistorias.com/la-nina-y-el-brujo  
    
    #CuentosInteractivos #ElÁrbolDeLasHistorias #Magia #Aventuras`,
    imageUrl: 'https://res.cloudinary.com/dnxab4qma/image/upload/c_crop,h_1350,w_1080/f_auto/q_auto/v1737579916/cuentos-interactivos/la-nina-y-el-brujo/la-nina-y-el-brujo'
  });

  const data = await fetch('http://localhost:4321/api/post-instagram', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body
  })

  const message = await data.json()

  return new Response(JSON.stringify({ message }))
}
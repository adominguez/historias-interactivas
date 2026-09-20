// Herramientas del panel interno: única fuente para la barra de navegación
// de AdminLayout y para las tarjetas de la portada (/admin). Añadir una
// herramienta nueva es añadir una entrada aquí.
export type AdminTool = {
  href: string;
  title: string;
  navLabel: string;
  description: string;
  icon: string;
};

export const ADMIN_TOOLS: AdminTool[] = [
  {
    href: '/admin/redes-sociales',
    title: 'Redes sociales',
    navLabel: 'Redes',
    icon: '📣',
    description: 'Estado de las publicaciones automáticas en Facebook e Instagram, estadísticas de la cuenta, el plan semanal (editable), el historial con reintentos y la configuración.',
  },
  {
    href: '/admin/crear-historia',
    title: 'Crear cuento',
    navLabel: 'Crear',
    icon: '✨',
    description: 'Genera un cuento nuevo desde cero con IA, eligiendo categoría y edad (o al azar).',
  },
  {
    href: '/admin/editar-historia',
    title: 'Editar cuento',
    navLabel: 'Editar',
    icon: '✏️',
    description: 'Busca un cuento ya publicado y corrige a mano el título o el texto de cualquier escena, sin IA.',
  },
  {
    href: '/admin/reparar-cuentos',
    title: 'Reparar cuentos',
    navLabel: 'Reparar',
    icon: '🔧',
    description: 'Diagnostica todos los cuentos (enlaces rotos, diálogo mal formateado, palabras inválidas) y repara con IA los problemas de contenido escena por escena.',
  },
  {
    href: '/admin/regenerar-imagen',
    title: 'Regenerar imágenes',
    navLabel: 'Imágenes',
    icon: '🖼️',
    description: 'Repasa de un vistazo la portada de todos los cuentos y regenera solo las que no encajen con su edad o categoría.',
  },
  {
    href: '/admin/regenerar-historia',
    title: 'Regenerar cuento completo',
    navLabel: 'Regenerar',
    icon: '♻️',
    description: 'Sustituye TODO el contenido de un cuento (título, grafo, texto, personajes) por uno nuevo — para cuentos con la estructura rota que "Reparar cuentos" no puede arreglar solo.',
  },
  {
    href: '/admin/eliminar-historia',
    title: 'Eliminar cuento',
    navLabel: 'Eliminar',
    icon: '🗑️',
    description: 'Borra un cuento, todos sus nodos y su imagen de Cloudinary. Irreversible.',
  },
];

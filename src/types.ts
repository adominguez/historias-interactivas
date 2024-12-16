export interface Story {
  id: number; // ID único del cuento
  slug: string; // Slug único del cuento
  title: string; // Título del cuento
  description: string; // Descripción para SEO
  keywords: string[]; // Palabras clave relacionadas
  createdAt: string; // Fecha de creación en formato ISO
  text: string; // Contenido del cuento en HTML
  options: Option[]; // Opciones para navegar
  categories: Category[]; // Categorías relacionadas con el cuento
}

export interface Node {
  id: number; // ID único del nodo
  title: string; // Título del nodo
  description: string; // Descripción para SEO
  slug: string; // Slug único del nodo
  parentSlug: string; // Slug del cuento principal
  backSlug?: string; // Slug del nodo anterior
  text: string; // Contenido del nodo en HTML
  options: Option[]; // Opciones para navegar
  storyId: number; // ID del cuento principal
}

export interface Option {
  text: string; // Texto que describe la opción
  next: string; // Slug del siguiente nodo
}

export interface Category {
  id: number;
  name: string;
}

export interface BreadCrumbProps {
  title: string;
  slug: string;
  current?: boolean;
}

export interface LittleStory {
  id: number,
  slug: string,
  title: string,
  description: string,
  created_at: string,
  resume: string,
}
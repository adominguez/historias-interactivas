import { useState } from 'react';

interface Story {
  slug: string;
  title: string;
  age: string;
  imageVersion: number | null;
}

interface RegenerateImagesGridProps {
  stories: Story[];
  cloudName: string;
}

type ItemStatus = 'idle' | 'loading' | 'success' | 'error';

// Miniatura pequeña (transformación de Cloudinary c_fill/w/h) en vez de la
// imagen original de 1536x1024: con 175 cuentos a la vez, cargar el
// original de cada uno sería muy pesado.
const thumbnailUrl = (cloudName: string, slug: string, version: number | null) =>
  `https://res.cloudinary.com/${cloudName}/image/upload/c_fill,w_320,h_180/${version ? `v${version}/` : ''}cuentos-interactivos/${slug}/${slug}`;

const RegenerateImagesGrid = ({ stories: initialStories, cloudName }: RegenerateImagesGridProps) => {
  const [stories, setStories] = useState(initialStories);
  const [statusBySlug, setStatusBySlug] = useState<Record<string, ItemStatus>>({});
  const [errorBySlug, setErrorBySlug] = useState<Record<string, string>>({});
  const [filter, setFilter] = useState('');

  const regenerate = async (slug: string) => {
    setStatusBySlug((prev) => ({ ...prev, [slug]: 'loading' }));
    try {
      const response = await fetch(`/api/regenerate-image?storySlug=${encodeURIComponent(slug)}`);
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || data.message || 'Error desconocido');

      setStatusBySlug((prev) => ({ ...prev, [slug]: 'success' }));
      // Actualiza la versión en el propio estado para que la miniatura se
      // refresque a la imagen nueva sin recargar la página.
      setStories((prev) => prev.map((story) => (
        story.slug === slug ? { ...story, imageVersion: typeof data.version === 'number' ? data.version : story.imageVersion } : story
      )));
    } catch (error) {
      setStatusBySlug((prev) => ({ ...prev, [slug]: 'error' }));
      setErrorBySlug((prev) => ({ ...prev, [slug]: String(error) }));
    }
  };

  const filtered = stories.filter((story) => story.title.toLowerCase().includes(filter.toLowerCase()));

  return (
    <div>
      <input
        type="text"
        value={filter}
        onChange={(event) => setFilter(event.target.value)}
        placeholder="Filtrar por título..."
        style={{ width: '100%', padding: '0.5rem', marginBottom: '0.5rem', boxSizing: 'border-box' }}
      />
      <p style={{ color: '#666', fontSize: '0.9rem' }}>{filtered.length} de {stories.length} cuentos</p>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '1rem' }}>
        {filtered.map((story) => {
          const status = statusBySlug[story.slug] ?? 'idle';
          return (
            <div key={story.slug} style={{ border: '1px solid #ddd', borderRadius: '8px', padding: '0.75rem' }}>
              <img
                src={thumbnailUrl(cloudName, story.slug, story.imageVersion)}
                alt=""
                loading="lazy"
                style={{ width: '100%', height: '140px', objectFit: 'cover', borderRadius: '4px', display: 'block' }}
              />
              <p style={{ margin: '0.5rem 0 0.15rem', fontWeight: 'bold', fontSize: '0.9rem', lineHeight: 1.3 }}>{story.title}</p>
              <p style={{ margin: '0 0 0.5rem', fontSize: '0.8rem', color: '#666' }}>
                {story.age} — <a href={`/${story.slug}`} target="_blank" rel="noreferrer">ver cuento</a>
              </p>
              <button onClick={() => regenerate(story.slug)} disabled={status === 'loading'} style={{ width: '100%' }}>
                {status === 'loading' ? 'Regenerando...' : status === 'success' ? 'Regenerada ✓ (repetir)' : 'Regenerar imagen'}
              </button>
              {status === 'error' && <p style={{ color: '#b00020', fontSize: '0.75rem', marginBottom: 0 }}>{errorBySlug[story.slug]}</p>}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default RegenerateImagesGrid;

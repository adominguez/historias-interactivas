import { useState } from 'react';

interface Story {
  id: number;
  slug: string;
  title: string;
  age: string;
  imageVersion: number | null;
}

interface RegenerateStoryGridProps {
  stories: Story[];
  cloudName: string;
}

type ItemStatus = 'idle' | 'loading' | 'success' | 'error';

const thumbnailUrl = (cloudName: string, slug: string, version: number | null) =>
  `https://res.cloudinary.com/${cloudName}/image/upload/c_fill,w_320,h_180/${version ? `v${version}/` : ''}cuentos-interactivos/${slug}/${slug}`;

const RegenerateStoryGrid = ({ stories: initialStories, cloudName }: RegenerateStoryGridProps) => {
  const [stories, setStories] = useState(initialStories);
  const [statusById, setStatusById] = useState<Record<number, ItemStatus>>({});
  const [messageById, setMessageById] = useState<Record<number, string>>({});
  const [filter, setFilter] = useState('');

  const regenerate = async (story: Story) => {
    const confirmed = confirm(
      `¿Regenerar TODO el cuento "${story.title}"?\n\nSe sustituirá el título, el texto y todas las escenas por contenido nuevo desde cero. Si el título cambia, la URL también cambiará (quedará una redirección automática desde la antigua). Esta acción no se puede deshacer.`
    );
    if (!confirmed) return;

    setStatusById((prev) => ({ ...prev, [story.id]: 'loading' }));
    setMessageById((prev) => ({ ...prev, [story.id]: '' }));

    try {
      const response = await fetch(`/api/regenerate-story?storySlug=${encodeURIComponent(story.slug)}`);
      const data = await response.json();
      if (!response.ok) throw new Error(data.error?.message || data.message || 'Error desconocido');

      setStatusById((prev) => ({ ...prev, [story.id]: 'success' }));
      setStories((prev) => prev.map((s) => (
        s.id === story.id ? { ...s, slug: data.story.slug, title: data.story.title } : s
      )));
    } catch (error) {
      setStatusById((prev) => ({ ...prev, [story.id]: 'error' }));
      setMessageById((prev) => ({ ...prev, [story.id]: String(error) }));
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
          const status = statusById[story.id] ?? 'idle';
          return (
            <div key={story.id} style={{ border: '1px solid #ddd', borderRadius: '8px', padding: '0.75rem' }}>
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
              <button onClick={() => regenerate(story)} disabled={status === 'loading'} style={{ width: '100%' }}>
                {status === 'loading' ? 'Regenerando... (1-3 min)' : status === 'success' ? 'Regenerado ✓ (repetir)' : 'Regenerar cuento completo'}
              </button>
              {status === 'error' && <p style={{ color: '#b00020', fontSize: '0.75rem', marginBottom: 0 }}>{messageById[story.id]}</p>}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default RegenerateStoryGrid;

import { useState, type FormEvent } from 'react';

interface Story {
  slug: string;
  title: string;
  age: string;
  imageVersion: number | null;
}

interface RegenerateImageFormProps {
  stories: Story[];
  cloudName: string;
}

type Status = 'idle' | 'loading' | 'success' | 'error';

const labelFor = (story: Story) => `${story.title} (${story.age}) — ${story.slug}`;

const RegenerateImageForm = ({ stories, cloudName }: RegenerateImageFormProps) => {
  const [inputValue, setInputValue] = useState('');
  const [status, setStatus] = useState<Status>('idle');
  const [message, setMessage] = useState('');
  // Se inicializa con la versión ya guardada del cuento elegido, y se
  // actualiza con la versión real que devuelve la API al regenerar — así la
  // vista previa siempre usa la versión de Cloudinary correcta (ver
  // migración 0004), en vez de un truco de caché en el propio navegador.
  const [displayedVersion, setDisplayedVersion] = useState<number | null>(null);

  const labelToStory = new Map(stories.map(story => [labelFor(story), story]));
  const selectedStory = labelToStory.get(inputValue);

  const handleSelect = (value: string) => {
    setInputValue(value);
    setStatus('idle');
    setMessage('');
    setDisplayedVersion(labelToStory.get(value)?.imageVersion ?? null);
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!selectedStory) {
      setStatus('error');
      setMessage('Elige un cuento de la lista (empieza a escribir el título para buscar).');
      return;
    }

    setStatus('loading');
    setMessage('');

    try {
      const response = await fetch(`/api/regenerate-image?storySlug=${encodeURIComponent(selectedStory.slug)}`);
      const data = await response.json();
      setStatus(response.ok ? 'success' : 'error');
      setMessage(data.message || data.error || 'Respuesta inesperada de la API');
      if (response.ok && typeof data.version === 'number') {
        setDisplayedVersion(data.version);
      }
    } catch (error) {
      setStatus('error');
      setMessage(`Error de red: ${error}`);
    }
  };

  const previewUrl = selectedStory
    ? `https://res.cloudinary.com/${cloudName}/image/upload/${displayedVersion ? `v${displayedVersion}/` : ''}cuentos-interactivos/${selectedStory.slug}/${selectedStory.slug}`
    : undefined;

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem', maxWidth: '560px' }}>
      <label style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
        Cuento
        <input
          list="stories-datalist"
          value={inputValue}
          onChange={(event) => handleSelect(event.target.value)}
          placeholder="Escribe para buscar por título..."
          autoComplete="off"
        />
        <datalist id="stories-datalist">
          {stories.map((story) => (
            <option key={story.slug} value={labelFor(story)} />
          ))}
        </datalist>
      </label>

      {previewUrl && (
        <div>
          <p>{status === 'success' ? 'Imagen nueva (ya regenerada):' : 'Imagen actual (compruébala antes de decidir si hace falta regenerar):'}</p>
          <img src={previewUrl} alt="" style={{ maxWidth: '100%', borderRadius: '8px' }} />
        </div>
      )}

      <button type="submit" disabled={status === 'loading' || !selectedStory}>
        {status === 'loading' ? 'Regenerando imagen... (puede tardar 1-2 minutos)' : 'Regenerar imagen'}
      </button>

      {status === 'error' && <p style={{ color: '#b00020' }}>{message}</p>}
      {status === 'success' && (
        <p style={{ color: '#1a7a1a' }}>
          {message} — <a href={`/${selectedStory?.slug}`} target="_blank" rel="noreferrer">Ver el cuento →</a>
        </p>
      )}
    </form>
  );
};

export default RegenerateImageForm;

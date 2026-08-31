import { useState, type FormEvent } from 'react';

interface Story {
  slug: string;
  title: string;
  age: string;
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

  const labelToSlug = new Map(stories.map(story => [labelFor(story), story.slug]));
  const selectedSlug = labelToSlug.get(inputValue);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!selectedSlug) {
      setStatus('error');
      setMessage('Elige un cuento de la lista (empieza a escribir el título para buscar).');
      return;
    }

    setStatus('loading');
    setMessage('');

    try {
      const response = await fetch(`/api/regenerate-image?storySlug=${encodeURIComponent(selectedSlug)}`);
      const data = await response.json();
      setStatus(response.ok ? 'success' : 'error');
      setMessage(data.message || data.error || 'Respuesta inesperada de la API');
    } catch (error) {
      setStatus('error');
      setMessage(`Error de red: ${error}`);
    }
  };

  // Parámetro solo para que el navegador no reutilice su propia caché al
  // enseñar el resultado aquí mismo; la caché de la CDN de Cloudinary ya se
  // invalida sola al subir (ver uploadImage en create-story.ts).
  const previewUrl = selectedSlug
    ? `https://res.cloudinary.com/${cloudName}/image/upload/cuentos-interactivos/${selectedSlug}/${selectedSlug}?t=${status === 'success' ? Date.now() : 0}`
    : undefined;

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem', maxWidth: '560px' }}>
      <label style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
        Cuento
        <input
          list="stories-datalist"
          value={inputValue}
          onChange={(event) => { setInputValue(event.target.value); setStatus('idle'); setMessage(''); }}
          placeholder="Escribe para buscar por título..."
          autoComplete="off"
        />
        <datalist id="stories-datalist">
          {stories.map((story) => (
            <option key={story.slug} value={labelFor(story)} />
          ))}
        </datalist>
      </label>

      <button type="submit" disabled={status === 'loading' || !selectedSlug}>
        {status === 'loading' ? 'Regenerando imagen... (puede tardar 1-2 minutos)' : 'Regenerar imagen'}
      </button>

      {status === 'error' && <p style={{ color: '#b00020' }}>{message}</p>}
      {status === 'success' && <p style={{ color: '#1a7a1a' }}>{message}</p>}

      {previewUrl && (
        <div>
          <p>{status === 'success' ? 'Imagen nueva:' : 'Imagen actual:'}</p>
          <img src={previewUrl} alt="" style={{ maxWidth: '100%', borderRadius: '8px' }} />
          {selectedSlug && (
            <p>
              <a href={`/${selectedSlug}`} target="_blank" rel="noreferrer">Ver el cuento →</a>
            </p>
          )}
        </div>
      )}
    </form>
  );
};

export default RegenerateImageForm;

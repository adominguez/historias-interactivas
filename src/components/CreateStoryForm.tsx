import { useState, type FormEvent } from 'react';

interface CreateStoryFormProps {
  categories: { name: string; title: string }[];
  ages: { value: string; label: string }[];
}

type Status = 'idle' | 'loading' | 'success' | 'error';

const CreateStoryForm = ({ categories, ages }: CreateStoryFormProps) => {
  const [category, setCategory] = useState('');
  const [age, setAge] = useState('');
  const [status, setStatus] = useState<Status>('idle');
  const [result, setResult] = useState<any>(null);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setStatus('loading');
    setResult(null);

    const params = new URLSearchParams();
    if (category) params.set('category', category);
    if (age) params.set('age', age);

    try {
      const response = await fetch(`/api/create-story?${params.toString()}`);
      const data = await response.json();
      setStatus(response.ok ? 'success' : 'error');
      setResult(data);
    } catch (error) {
      setStatus('error');
      setResult({ message: 'Error de red al llamar a la API', error: String(error) });
    }
  };

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem', maxWidth: '480px' }}>
      <label style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
        Categoría
        <select value={category} onChange={(event) => setCategory(event.target.value)}>
          <option value="">Aleatoria</option>
          {categories.map(({ name, title }) => (
            <option key={name} value={name}>{title}</option>
          ))}
        </select>
      </label>

      <label style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
        Edad
        <select value={age} onChange={(event) => setAge(event.target.value)}>
          <option value="">Aleatoria</option>
          {ages.map(({ value, label }) => (
            <option key={value} value={value}>{label}</option>
          ))}
        </select>
      </label>

      <button type="submit" disabled={status === 'loading'}>
        {status === 'loading' ? 'Generando... (puede tardar 1-2 minutos)' : 'Crear cuento'}
      </button>

      {status === 'success' && result?.story && (
        <div>
          <p>Cuento creado: <strong>{result.story.title}</strong></p>
          <a href={`/${result.story.slug}`} target="_blank" rel="noreferrer">Ver el cuento →</a>
        </div>
      )}

      {status === 'error' && (
        <div>
          <p>Error al crear el cuento:</p>
          <pre style={{ whiteSpace: 'pre-wrap', background: '#f4f4f4', padding: '0.75rem', borderRadius: '4px', overflowX: 'auto' }}>
            {JSON.stringify(result, null, 2)}
          </pre>
        </div>
      )}
    </form>
  );
};

export default CreateStoryForm;

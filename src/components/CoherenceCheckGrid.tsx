import { useState } from 'react';

interface StoryOption {
  slug: string;
  title: string;
  age: string;
}

type StoryCoherenceIssue = { location: string; description: string };
type StoryCoherenceResult = { coherent: boolean; issues: StoryCoherenceIssue[] };
type CastCoherenceResult = { coherent: boolean; outlierCharacters: string[]; reason: string };

type CheckState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'done'; story: StoryCoherenceResult; cast: CastCoherenceResult }
  | { status: 'error'; message: string };

interface CoherenceCheckGridProps {
  stories: StoryOption[];
}

// Comprobación de coherencia (narrativa + reparto) para UN cuento, bajo
// demanda: a diferencia del escaneo de RepairStoriesPanel (determinista y
// gratis sobre los 175 cuentos a la vez), esto llama a la IA dos veces por
// cuento comprobado, así que solo se dispara cuando se pulsa el botón, cuento
// a cuento — nunca automático ni en bloque (ver diagnose-story-coherence.ts /
// diagnose-cast-coherence.ts).
const CoherenceCheckGrid = ({ stories }: CoherenceCheckGridProps) => {
  const [filter, setFilter] = useState('');
  const [checks, setChecks] = useState<Record<string, CheckState>>({});

  const check = async (slug: string) => {
    setChecks((prev) => ({ ...prev, [slug]: { status: 'loading' } }));
    try {
      const [storyResponse, castResponse] = await Promise.all([
        fetch(`/api/diagnose-story-coherence?storySlug=${encodeURIComponent(slug)}`),
        fetch(`/api/diagnose-cast-coherence?storySlug=${encodeURIComponent(slug)}`),
      ]);
      const [storyData, castData] = await Promise.all([storyResponse.json(), castResponse.json()]);
      if (!storyResponse.ok) throw new Error(storyData?.error || 'Error al comprobar la coherencia narrativa');
      if (!castResponse.ok) throw new Error(castData?.error || 'Error al comprobar la coherencia del reparto');
      setChecks((prev) => ({ ...prev, [slug]: { status: 'done', story: storyData, cast: castData } }));
    } catch (error) {
      setChecks((prev) => ({ ...prev, [slug]: { status: 'error', message: String(error) } }));
    }
  };

  const filtered = stories.filter((story) => story.title.toLowerCase().includes(filter.toLowerCase()));

  return (
    <div>
      <p style={{ color: '#666', fontSize: '0.9rem' }}>
        Cada comprobación cuesta 2 llamadas a IA (coherencia narrativa + coherencia de reparto), nunca se lanza sola, solo cuento a cuento y a petición.
      </p>

      <input
        type="text"
        value={filter}
        onChange={(event) => setFilter(event.target.value)}
        placeholder="Filtrar por título..."
        style={{ width: '100%', padding: '0.5rem', marginBottom: '0.5rem', boxSizing: 'border-box' }}
      />
      <p style={{ color: '#666', fontSize: '0.9rem' }}>{filtered.length} de {stories.length} cuentos</p>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1rem' }}>
        {filtered.map((story) => {
          const state = checks[story.slug] ?? { status: 'idle' };
          return (
            <div key={story.slug} style={{ border: '1px solid #ddd', borderRadius: '8px', padding: '0.75rem' }}>
              <p style={{ margin: '0 0 0.15rem', fontWeight: 'bold', fontSize: '0.9rem', lineHeight: 1.3 }}>
                {story.title} <a href={`/${story.slug}`} target="_blank" rel="noreferrer">(ver)</a>
              </p>
              <p style={{ margin: '0 0 0.5rem', fontSize: '0.8rem', color: '#666' }}>{story.age}</p>

              <button onClick={() => check(story.slug)} disabled={state.status === 'loading'} style={{ width: '100%' }}>
                {state.status === 'loading' ? 'Comprobando... (puede tardar)' : state.status === 'done' ? 'Volver a comprobar' : 'Comprobar coherencia (IA)'}
              </button>

              {state.status === 'error' && (
                <p style={{ color: '#b00020', fontSize: '0.85rem', marginTop: '0.5rem' }}>{state.message}</p>
              )}

              {state.status === 'done' && (
                <div style={{ marginTop: '0.75rem', fontSize: '0.85rem' }}>
                  <p style={{ margin: '0 0 0.25rem', fontWeight: 'bold' }}>
                    Coherencia narrativa: {state.story.coherent ? '✅ coherente' : `⚠️ ${state.story.issues.length} problema(s)`}
                  </p>
                  {!state.story.coherent && (
                    <ul style={{ margin: '0 0 0.5rem', paddingLeft: '1.1rem' }}>
                      {state.story.issues.map((issue, index) => (
                        <li key={index} style={{ marginBottom: '0.25rem' }}>
                          <strong>{issue.location === 'story' ? 'Escena inicial' : `Escena "${issue.location}"`}:</strong> {issue.description}{' '}
                          <a
                            href={`/admin/editar-historia?storySlug=${encodeURIComponent(story.slug)}${issue.location === 'story' ? '' : `&node=${encodeURIComponent(issue.location)}`}`}
                            target="_blank"
                            rel="noreferrer"
                          >
                            editar →
                          </a>
                        </li>
                      ))}
                    </ul>
                  )}

                  <p style={{ margin: '0 0 0.25rem', fontWeight: 'bold' }}>
                    Coherencia de reparto: {state.cast.coherent ? '✅ coherente' : '⚠️ hay personajes que no encajan'}
                  </p>
                  {!state.cast.coherent && (
                    <p style={{ margin: 0 }}>
                      {state.cast.outlierCharacters.join(', ')} — {state.cast.reason}
                    </p>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default CoherenceCheckGrid;

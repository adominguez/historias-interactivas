import { useState, useEffect } from 'react';

interface StoryOption {
  slug: string;
  title: string;
  age: string;
}

interface NodeContent {
  slug: string;
  title: string;
  text: string;
}

interface EditStoryFormProps {
  stories: StoryOption[];
}

type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

const labelFor = (story: StoryOption) => `${story.title} (${story.age}) — ${story.slug}`;

// Un bloque editable (la raíz del cuento, o uno de sus nodos): título, texto
// y su propio botón de guardar independiente.
const EditableSection = ({ storySlug, target, initialTitle, initialText }: { storySlug: string; target: string; initialTitle: string; initialText: string }) => {
  const [title, setTitle] = useState(initialTitle);
  const [text, setText] = useState(initialText);
  const [status, setStatus] = useState<SaveStatus>('idle');
  const [message, setMessage] = useState('');

  // Si se cambia de escena/cuento, el bloque se vuelve a montar (key en el
  // padre) así que no hace falta sincronizar aquí manualmente.

  const handleSave = async () => {
    setStatus('saving');
    setMessage('');
    try {
      const response = await fetch('/api/update-story-content', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ storySlug, target, title, text }),
      });
      const data = await response.json();
      setStatus(response.ok ? 'saved' : 'error');
      setMessage(data.message || data.error || 'Respuesta inesperada');
    } catch (error) {
      setStatus('error');
      setMessage(`Error de red: ${error}`);
    }
  };

  return (
    <div style={{ border: '1px solid #ddd', borderRadius: '8px', padding: '1rem', marginBottom: '1rem' }}>
      <label style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', marginBottom: '0.75rem' }}>
        Título
        <input value={title} onChange={(event) => { setTitle(event.target.value); setStatus('idle'); }} style={{ padding: '0.4rem' }} />
      </label>
      <label style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
        Texto (HTML)
        <textarea
          value={text}
          onChange={(event) => { setText(event.target.value); setStatus('idle'); }}
          rows={10}
          style={{ padding: '0.5rem', fontFamily: 'monospace', fontSize: '0.85rem' }}
        />
      </label>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginTop: '0.5rem' }}>
        <button onClick={handleSave} disabled={status === 'saving'}>
          {status === 'saving' ? 'Guardando...' : 'Guardar'}
        </button>
        {status === 'saved' && <span style={{ color: '#1a7a1a' }}>{message}</span>}
        {status === 'error' && <span style={{ color: '#b00020' }}>{message}</span>}
      </div>
    </div>
  );
};

const EditStoryForm = ({ stories }: EditStoryFormProps) => {
  const [inputValue, setInputValue] = useState('');
  const [loadStatus, setLoadStatus] = useState<'idle' | 'loading' | 'error'>('idle');
  const [loadError, setLoadError] = useState('');
  const [storyContent, setStoryContent] = useState<{ title: string; text: string } | null>(null);
  const [nodes, setNodes] = useState<NodeContent[]>([]);
  const [selectedNodeSlug, setSelectedNodeSlug] = useState<string>('__story__');

  const labelToSlug = new Map(stories.map((story) => [labelFor(story), story.slug]));
  const selectedSlug = labelToSlug.get(inputValue);

  useEffect(() => {
    if (!selectedSlug) return;

    setLoadStatus('loading');
    setLoadError('');
    setStoryContent(null);
    setNodes([]);
    setSelectedNodeSlug('__story__');

    fetch(`/api/story-content?storySlug=${encodeURIComponent(selectedSlug)}`)
      .then((response) => response.json().then((data) => ({ ok: response.ok, data })))
      .then(({ ok, data }) => {
        if (!ok) throw new Error(data.error || 'No se ha podido cargar el cuento');
        setStoryContent(data.story);
        setNodes(data.nodes);
        setLoadStatus('idle');
      })
      .catch((error) => {
        setLoadStatus('error');
        setLoadError(String(error));
      });
  }, [selectedSlug]);

  const selectedNode = nodes.find((node) => node.slug === selectedNodeSlug);

  return (
    <div>
      <label style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', marginBottom: '1rem' }}>
        Cuento
        <input
          list="edit-stories-datalist"
          value={inputValue}
          onChange={(event) => setInputValue(event.target.value)}
          placeholder="Escribe para buscar por título..."
          autoComplete="off"
        />
        <datalist id="edit-stories-datalist">
          {stories.map((story) => (
            <option key={story.slug} value={labelFor(story)} />
          ))}
        </datalist>
      </label>

      {loadStatus === 'loading' && <p>Cargando cuento...</p>}
      {loadStatus === 'error' && <p style={{ color: '#b00020' }}>{loadError}</p>}

      {storyContent && (
        <>
          <p>
            <a href={`/${selectedSlug}`} target="_blank" rel="noreferrer">Ver el cuento →</a>
          </p>

          <label style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', marginBottom: '1rem' }}>
            Escena a editar
            <select value={selectedNodeSlug} onChange={(event) => setSelectedNodeSlug(event.target.value)}>
              <option value="__story__">Escena inicial (raíz del cuento)</option>
              {nodes.map((node) => (
                <option key={node.slug} value={node.slug}>{node.title || node.slug}</option>
              ))}
            </select>
          </label>

          {selectedNodeSlug === '__story__' && (
            <EditableSection
              key={`${selectedSlug}-story`}
              storySlug={selectedSlug as string}
              target="story"
              initialTitle={storyContent.title}
              initialText={storyContent.text}
            />
          )}

          {selectedNode && (
            <EditableSection
              key={`${selectedSlug}-${selectedNode.slug}`}
              storySlug={selectedSlug as string}
              target={selectedNode.slug}
              initialTitle={selectedNode.title}
              initialText={selectedNode.text}
            />
          )}
        </>
      )}
    </div>
  );
};

export default EditStoryForm;

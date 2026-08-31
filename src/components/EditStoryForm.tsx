import { useState, useEffect, useRef } from 'react';

interface StoryOption {
  slug: string;
  title: string;
  age: string;
  imageVersion: number | null;
}

interface NodeContent {
  slug: string;
  title: string;
  text: string;
}

interface EditStoryFormProps {
  stories: StoryOption[];
  cloudName: string;
  // Para abrir el editor directamente en una historia (y de paso una
  // escena concreta) desde el enlace "Editar" que aparece en la propia
  // página del cuento cuando ya estás logado — ver LayoutStory.astro.
  initialSlug?: string;
  initialNode?: string;
}

type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

// Miniatura pequeña, igual que en /admin/regenerar-imagen: con 175 cuentos a
// la vez cargar la imagen original de cada uno sería muy pesado.
const thumbnailUrl = (cloudName: string, slug: string, version: number | null) =>
  `https://res.cloudinary.com/${cloudName}/image/upload/c_fill,w_320,h_180/${version ? `v${version}/` : ''}cuentos-interactivos/${slug}/${slug}`;

// Un bloque editable (la raíz del cuento, o uno de sus nodos): título, texto
// y su propio botón de guardar independiente.
const EditableSection = ({ storySlug, target, initialTitle, initialText }: { storySlug: string; target: string; initialTitle: string; initialText: string }) => {
  const [title, setTitle] = useState(initialTitle);
  const [text, setText] = useState(initialText);
  const [status, setStatus] = useState<SaveStatus>('idle');
  const [message, setMessage] = useState('');

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

const EditStoryForm = ({ stories, cloudName, initialSlug, initialNode }: EditStoryFormProps) => {
  const [filter, setFilter] = useState('');
  const [selectedSlug, setSelectedSlug] = useState<string | null>(initialSlug ?? null);
  const [loadStatus, setLoadStatus] = useState<'idle' | 'loading' | 'error'>('idle');
  const [loadError, setLoadError] = useState('');
  const [storyContent, setStoryContent] = useState<{ title: string; text: string } | null>(null);
  const [nodes, setNodes] = useState<NodeContent[]>([]);
  const [selectedNodeSlug, setSelectedNodeSlug] = useState<string>('__story__');
  const editorRef = useRef<HTMLDivElement>(null);
  // Solo se aplica el nodo inicial (de la URL) la primera vez que carga esa
  // historia concreta; a partir de ahí, cambiar de escena es cosa del
  // desplegable, no de este valor recordado.
  const pendingInitialNodeRef = useRef(initialNode);

  useEffect(() => {
    if (!selectedSlug) return;

    setLoadStatus('loading');
    setLoadError('');
    setStoryContent(null);
    setNodes([]);
    setSelectedNodeSlug('__story__');
    editorRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });

    fetch(`/api/story-content?storySlug=${encodeURIComponent(selectedSlug)}`)
      .then((response) => response.json().then((data) => ({ ok: response.ok, data })))
      .then(({ ok, data }) => {
        if (!ok) throw new Error(data.error || 'No se ha podido cargar el cuento');
        setStoryContent(data.story);
        setNodes(data.nodes);
        setLoadStatus('idle');

        const pendingNode = pendingInitialNodeRef.current;
        pendingInitialNodeRef.current = undefined;
        if (pendingNode && (data.nodes as NodeContent[]).some((node) => node.slug === pendingNode)) {
          setSelectedNodeSlug(pendingNode);
        }
      })
      .catch((error) => {
        setLoadStatus('error');
        setLoadError(String(error));
      });
  }, [selectedSlug]);

  const selectedNode = nodes.find((node) => node.slug === selectedNodeSlug);
  const filtered = stories.filter((story) => story.title.toLowerCase().includes(filter.toLowerCase()));

  return (
    <div>
      <div ref={editorRef}>
        {selectedSlug && loadStatus === 'loading' && <p>Cargando cuento...</p>}
        {selectedSlug && loadStatus === 'error' && <p style={{ color: '#b00020' }}>{loadError}</p>}

        {selectedSlug && storyContent && (
          <div style={{ border: '2px solid #333', borderRadius: '8px', padding: '1rem', marginBottom: '1.5rem' }}>
            <p style={{ marginTop: 0 }}>
              Editando: <strong>{storyContent.title}</strong> — <a href={`/${selectedSlug}`} target="_blank" rel="noreferrer">ver el cuento →</a>
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
                storySlug={selectedSlug}
                target="story"
                initialTitle={storyContent.title}
                initialText={storyContent.text}
              />
            )}

            {selectedNode && (
              <EditableSection
                key={`${selectedSlug}-${selectedNode.slug}`}
                storySlug={selectedSlug}
                target={selectedNode.slug}
                initialTitle={selectedNode.title}
                initialText={selectedNode.text}
              />
            )}
          </div>
        )}
      </div>

      <input
        type="text"
        value={filter}
        onChange={(event) => setFilter(event.target.value)}
        placeholder="Filtrar por título..."
        style={{ width: '100%', padding: '0.5rem', marginBottom: '0.5rem', boxSizing: 'border-box' }}
      />
      <p style={{ color: '#666', fontSize: '0.9rem' }}>{filtered.length} de {stories.length} cuentos</p>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '1rem' }}>
        {filtered.map((story) => (
          <div key={story.slug} style={{ border: story.slug === selectedSlug ? '2px solid #333' : '1px solid #ddd', borderRadius: '8px', padding: '0.75rem' }}>
            <img
              src={thumbnailUrl(cloudName, story.slug, story.imageVersion)}
              alt=""
              loading="lazy"
              style={{ width: '100%', height: '140px', objectFit: 'cover', borderRadius: '4px', display: 'block' }}
            />
            <p style={{ margin: '0.5rem 0 0.15rem', fontWeight: 'bold', fontSize: '0.9rem', lineHeight: 1.3 }}>{story.title}</p>
            <p style={{ margin: '0 0 0.5rem', fontSize: '0.8rem', color: '#666' }}>{story.age}</p>
            <button onClick={() => setSelectedSlug(story.slug)} style={{ width: '100%' }}>
              Editar
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default EditStoryForm;

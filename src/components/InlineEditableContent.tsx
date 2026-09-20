import { useState } from 'react';

interface InlineEditableContentProps {
  storySlug: string;
  target: string; // "story" (raíz) o el slug real de un nodo
  initialTitle: string;
  initialText: string;
}

type Status = 'idle' | 'saving' | 'saved' | 'error';

// Edición directamente sobre la página pública del cuento (solo se monta
// cuando isAuthorized() es true, ver LayoutStory.astro/[slug]/index.astro):
// en modo lectura se ve exactamente igual que para cualquier visitante; al
// pulsar "Editar" se cambia a un textarea con el HTML en crudo, y al
// guardar se vuelve a la vista normal ya con el texto nuevo, sin recargar
// la página ni navegar a /admin.
const InlineEditableContent = ({ storySlug, target, initialTitle, initialText }: InlineEditableContentProps) => {
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(initialTitle);
  const [text, setText] = useState(initialText);
  const [status, setStatus] = useState<Status>('idle');
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
      if (!response.ok) throw new Error(data.error || data.message || 'Error desconocido');
      setStatus('saved');
      setEditing(false);
    } catch (error) {
      setStatus('error');
      setMessage(String(error));
    }
  };

  const handleCancel = () => {
    setTitle(initialTitle);
    setText(initialText);
    setStatus('idle');
    setEditing(false);
  };

  if (!editing) {
    return (
      <div>
        <button
          onClick={() => setEditing(true)}
          className="btn-primary" style={{ marginBottom: '1rem' }}
        >
          ✎ Editar esta escena
        </button>
        {status === 'saved' && <p style={{ color: '#1a7a1a', fontSize: '0.9rem' }}>Guardado correctamente.</p>}
        <div dangerouslySetInnerHTML={{ __html: text }} />
      </div>
    );
  }

  return (
    <div className="card" style={{ borderColor: 'var(--forest)' }}>
      <label style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', marginBottom: '0.75rem' }}>
        Título
        <input value={title} onChange={(event) => setTitle(event.target.value)} style={{ padding: '0.4rem' }} />
      </label>
      <label style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
        Texto (HTML)
        <textarea
          value={text}
          onChange={(event) => setText(event.target.value)}
          rows={14}
          style={{ padding: '0.5rem', fontFamily: 'monospace', fontSize: '0.85rem', width: '100%', boxSizing: 'border-box' }}
        />
      </label>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginTop: '0.75rem' }}>
        <button className="btn-primary" onClick={handleSave} disabled={status === 'saving'}>
          {status === 'saving' ? 'Guardando...' : 'Guardar'}
        </button>
        <button onClick={handleCancel} disabled={status === 'saving'}>Cancelar</button>
        {status === 'error' && <span className="error-text">{message}</span>}
      </div>
    </div>
  );
};

export default InlineEditableContent;

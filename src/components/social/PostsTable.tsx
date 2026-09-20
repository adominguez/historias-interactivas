import { useState } from 'react';

// Historial de publicaciones del panel /admin/redes-sociales: cada intento
// (con éxito o no) con su cuento, sus métricas y el enlace a la publicación.
// Una publicación fallida que no se haya recuperado después se puede
// reintentar solo en su red y con el mismo cuento (ver ?only y ?storyId en
// social-auto-post.ts): reintentar las dos redes duplicaría la que sí salió.

export type PostRow = {
  id: number;
  when: string; // fecha y hora ya formateadas en hora de España
  platform: string;
  platformLabel: string;
  network: 'facebook' | 'instagram';
  surface: 'feed' | 'story';
  storyId: number;
  title: string | null;
  slug: string | null;
  format: string;
  theme: string | null;
  ok: boolean;
  errorText: string | null;
  reach: number | null;
  likes: number | null;
  comments: number | null;
  saved: number | null;
  shares: number | null;
  permalink: string | null;
  note: string | null;
  canRetry: boolean;
};

type Filter = 'all' | 'instagram' | 'facebook' | 'failed';

const FILTERS: { id: Filter; label: string }[] = [
  { id: 'all', label: 'Todas' },
  { id: 'instagram', label: 'Instagram' },
  { id: 'facebook', label: 'Facebook' },
  { id: 'failed', label: 'Fallidas' },
];

const n = (value: number | null) => (value === null ? '—' : value.toLocaleString('es-ES'));

function RetryButton({ row }: { row: PostRow }) {
  const [state, setState] = useState<{ status: 'idle' | 'loading' | 'done' | 'error'; message?: string }>({ status: 'idle' });

  const retry = async () => {
    const what = `${row.surface === 'story' ? 'la Story' : 'el post'} de "${row.title}" solo en ${row.network === 'facebook' ? 'Facebook' : 'Instagram'}`;
    if (!window.confirm(`Esto publica ${what}, de verdad y ahora. ¿Seguir?`)) return;
    setState({ status: 'loading' });
    try {
      const params = new URLSearchParams({ force: '1', only: row.network, storyId: String(row.storyId), format: row.format });
      if (row.surface === 'story') params.set('surface', 'story');
      const response = await fetch(`/api/social-auto-post?${params}`);
      const data = await response.json();
      if (!response.ok || data.error) throw new Error(data.error || `Error ${response.status}`);
      const result = data[row.network];
      if (!result?.ok) throw new Error(`Ha vuelto a fallar: ${String(result?.error ?? 'sin respuesta').slice(0, 200)}`);
      setState({ status: 'done', message: 'Publicado. Recarga la página para verlo en la lista.' });
    } catch (error) {
      setState({ status: 'error', message: String(error instanceof Error ? error.message : error) });
    }
  };

  if (state.status === 'done') return <span style={{ fontSize: 12 }}>✅ {state.message}</span>;
  return (
    <>
      <button onClick={retry} disabled={state.status === 'loading'}>{state.status === 'loading' ? 'Publicando…' : 'Reintentar'}</button>
      {state.status === 'error' && <div className="error-text">{state.message}</div>}
    </>
  );
}

export default function PostsTable({ rows }: { rows: PostRow[] }) {
  const [filter, setFilter] = useState<Filter>('all');
  const visible = rows.filter((row) =>
    filter === 'all' ? true : filter === 'failed' ? !row.ok : row.network === filter);

  return (
    <div>
      <div className="btn-row" style={{ marginBottom: 12 }} role="group" aria-label="Filtrar publicaciones">
        {FILTERS.map(({ id, label }) => (
          <button key={id} onClick={() => setFilter(id)} aria-pressed={filter === id}>
            {label} ({rows.filter((row) => (id === 'all' ? true : id === 'failed' ? !row.ok : row.network === id)).length})
          </button>
        ))}
      </div>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Fecha</th><th>Dónde</th><th>Cuento</th><th>Estado</th>
              <th className="num">Alcance</th><th className="num">Me gusta</th><th className="num">Coment.</th><th className="num">Guard.</th><th className="num">Compart.</th>
            </tr>
          </thead>
          <tbody>
            {visible.map((row) => (
              <tr key={row.id}>
                <td style={{ whiteSpace: 'nowrap' }}>{row.when}</td>
                <td style={{ whiteSpace: 'nowrap' }}>
                  {row.permalink ? <a href={row.permalink} target="_blank" rel="noreferrer">{row.platformLabel}</a> : row.platformLabel}
                </td>
                <td>
                  {row.slug ? <a href={`/${row.slug}`} target="_blank" rel="noreferrer">{row.title}</a> : (row.title ?? `Cuento ${row.storyId}`)}
                  <div className="small muted">
                    {row.format === 'decision' ? '¿qué elegirías?' : 'recomendación'}{row.theme ? ` · ${row.theme}` : ''}
                  </div>
                </td>
                <td>
                  {row.ok ? <span className="badge badge-ok">✅ Publicado</span> : (
                    <>
                      <div><span className="badge badge-bad">❌ Falló</span> <span className="small">{row.errorText}</span></div>
                      {row.canRetry && <div style={{ marginTop: 4 }}><RetryButton row={row} /></div>}
                    </>
                  )}
                  {row.ok && row.note && <div className="small muted">{row.note}</div>}
                </td>
                <td className="num">{n(row.reach)}</td>
                <td className="num">{n(row.likes)}</td>
                <td className="num">{n(row.comments)}</td>
                <td className="num">{n(row.saved)}</td>
                <td className="num">{n(row.shares)}</td>
              </tr>
            ))}
            {visible.length === 0 && <tr><td colSpan={9} className="muted">Nada que mostrar con este filtro.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}

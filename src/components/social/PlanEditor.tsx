import { useMemo, useState } from 'react';

// Editor del plan semanal del panel /admin/redes-sociales. El plan se
// publica solo, sin revisión (decisión del dueño del proyecto); esto es lo
// que permite corregir un día que no convence: otro cuento, otro formato u
// otro enfoque. Los días pasados o ya publicados no se tocan. Un día que la
// IA dejó sin plan válido se puede rellenar aquí.

type Story = { id: number; title: string; age: string; categories: string[] };
type Day = {
  date: string;
  weekday: string;
  format: string | null;
  angle: string | null;
  story: { id: number; title: string; slug: string; age: string } | null;
  published: boolean;
};
type Week = {
  label: string;
  weekStart: string;
  themeLabel: string;
  themeHashtag: string;
  rationale: string | null;
  days: Day[];
};

type SaveState = { status: 'idle' | 'saving' | 'saved' | 'error'; message?: string };

function DayRow({ day, stories, editable }: { day: Day; stories: Story[]; editable: boolean }) {
  const [editing, setEditing] = useState(false);
  const [storyId, setStoryId] = useState<number | ''>(day.story?.id ?? '');
  const [format, setFormat] = useState(day.format ?? 'recommendation');
  const [angle, setAngle] = useState(day.angle ?? '');
  const [filter, setFilter] = useState('');
  const [saved, setSaved] = useState<Day['story']>(day.story);
  const [state, setState] = useState<SaveState>({ status: 'idle' });

  const options = useMemo(() => {
    const needle = filter.toLowerCase();
    const matching = stories.filter((s) => s.title.toLowerCase().includes(needle));
    // El cuento elegido siempre visible, aunque el filtro no lo incluya.
    const selected = stories.find((s) => s.id === storyId);
    return selected && !matching.includes(selected) ? [selected, ...matching] : matching;
  }, [stories, filter, storyId]);

  const save = async () => {
    setState({ status: 'saving' });
    try {
      const response = await fetch('/api/social-plan-day', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date: day.date, storyId, format, angle }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || `Error ${response.status}`);
      const story = stories.find((s) => s.id === storyId);
      setSaved(story ? { id: story.id, title: story.title, slug: saved?.slug ?? '', age: story.age } : saved);
      setState({ status: 'saved', message: 'Guardado' });
      setEditing(false);
    } catch (error) {
      setState({ status: 'error', message: String(error instanceof Error ? error.message : error) });
    }
  };

  const status = day.published
    ? <span className="badge badge-ok">✅ Publicado</span>
    : editable ? <span className="badge badge-neutral">🕒 Pendiente</span> : <span className="badge badge-neutral">— Pasado</span>;

  return (
    <tr>
      <td style={{ whiteSpace: 'nowrap' }}>{day.weekday} {day.date.slice(8)}/{day.date.slice(5, 7)}</td>
      <td>
        {editing ? (
          <div style={{ display: 'grid', gap: 6 }}>
            <input value={filter} onChange={(e) => setFilter(e.target.value)} placeholder="Buscar cuento…" />
            <select value={storyId} onChange={(e) => setStoryId(Number(e.target.value))} style={{ maxWidth: 360 }}>
              <option value="" disabled>Elige un cuento</option>
              {options.map((s) => <option key={s.id} value={s.id}>{s.title} ({s.age})</option>)}
            </select>
            <select value={format} onChange={(e) => setFormat(e.target.value)} style={{ maxWidth: 220 }}>
              <option value="decision">¿Qué elegirías?</option>
              <option value="recommendation">Recomendación</option>
            </select>
            <textarea value={angle} onChange={(e) => setAngle(e.target.value)} maxLength={200} rows={2} placeholder="Enfoque del día (opcional)" />
            <div className="btn-row">
              <button className="btn-primary" onClick={save} disabled={!storyId || state.status === 'saving'}>{state.status === 'saving' ? 'Guardando…' : 'Guardar'}</button>
              <button onClick={() => setEditing(false)}>Cancelar</button>
            </div>
          </div>
        ) : saved ? (
          <>
            {saved.slug ? <a href={`/${saved.slug}`} target="_blank" rel="noreferrer">{saved.title}</a> : saved.title}
            <span className="small muted"> · {saved.age} · {format === 'decision' ? '¿qué elegirías?' : 'recomendación'}</span>
            {angle && <div className="small muted" style={{ marginTop: 2 }}>{angle}</div>}
          </>
        ) : (
          <span className="muted">Sin plan: ese día se publica con la rotación de temas.</span>
        )}
        {state.status === 'error' && <div className="error-text">{state.message}</div>}
        {state.status === 'saved' && <div className="ok-text">✅ {state.message}</div>}
      </td>
      <td style={{ whiteSpace: 'nowrap' }}>{status}</td>
      <td>{editable && !editing && <button onClick={() => setEditing(true)}>{saved ? 'Cambiar' : 'Rellenar'}</button>}</td>
    </tr>
  );
}

export default function PlanEditor({ weeks, stories, today }: { weeks: Week[]; stories: Story[]; today: string }) {
  if (weeks.length === 0) {
    return <p className="muted">No hay plan para esta semana ni para la siguiente: se publica con la rotación de temas. El plan de la semana siguiente se genera solo cada jueves (o con el botón "Generar plan" de arriba).</p>;
  }
  return (
    <div style={{ display: 'grid', gap: '1.5rem' }}>
      {weeks.map((week) => (
        <div key={week.weekStart}>
          <h3 style={{ margin: '0 0 0.25rem' }}>{week.label}: {week.themeLabel} <span className="muted" style={{ fontWeight: 400 }}>{week.themeHashtag}</span></h3>
          {week.rationale && <p className="section-note" style={{ margin: '0 0 0.5rem' }}>{week.rationale}</p>}
          <div className="table-wrap">
            <table>
              <thead><tr><th>Día</th><th>Cuento, formato y enfoque</th><th>Estado</th><th></th></tr></thead>
              <tbody>
                {week.days.map((day) => (
                  <DayRow key={day.date} day={day} stories={stories} editable={!day.published && day.date >= today} />
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ))}
    </div>
  );
}

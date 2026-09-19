import { useState, type CSSProperties } from 'react';

// Acciones manuales del panel /admin/redes-sociales. Todo lo que hacen ya lo
// hacen los crons solos; esto es para probar, corregir o adelantarse:
// - Vista previa: lo que publicaría ahora mismo el cron (?dryRun=1), sin
//   publicar nada ni tocar la base de datos.
// - Publicar ahora: el cron a mano, saltándose el freno de "ya se publicó
//   hoy" (?force=1). Publica de verdad en las dos redes.
// - Plan, estadísticas y WhatsApp: los mismos endpoints de los crons.

type Preview = {
  surface: string;
  format: string;
  story: { title: string; slug: string };
  isNewStory: boolean;
  theme: { label: string } | null;
  plan: { angle: string | null } | null;
  facebookMessage: string;
  instagramMessage: string;
  storyHook: string;
  imageUrl: string | null;
  instagramImageUrl: string | null;
  storyImageUrl: string | null;
};

type ActionState = { status: 'idle' | 'loading' | 'done' | 'error'; message?: string };

const box: CSSProperties = { border: '1px solid #ddd', borderRadius: 8, padding: '1rem' };

async function callApi(url: string, init?: RequestInit) {
  const response = await fetch(url, init);
  const data = await response.json().catch(() => ({}));
  if (!response.ok || data.error) throw new Error(data.error || `Error ${response.status}`);
  return data;
}

export default function SocialActions({ nextWeekStart, nextWeekHasPlan }: { nextWeekStart: string; nextWeekHasPlan: boolean }) {
  const [state, setState] = useState<Record<string, ActionState>>({});
  const [preview, setPreview] = useState<Preview | null>(null);

  const run = async (key: string, action: () => Promise<string | void>, reloadAfter = false) => {
    setState((prev) => ({ ...prev, [key]: { status: 'loading' } }));
    try {
      const message = await action();
      setState((prev) => ({ ...prev, [key]: { status: 'done', message: message || 'Hecho.' } }));
      if (reloadAfter) setTimeout(() => window.location.reload(), 1200);
    } catch (error) {
      setState((prev) => ({ ...prev, [key]: { status: 'error', message: String(error instanceof Error ? error.message : error) } }));
    }
  };

  const Status = ({ id }: { id: string }) => {
    const s = state[id];
    if (!s || s.status === 'idle') return null;
    const color = s.status === 'error' ? '#b00020' : '#52514e';
    const text = s.status === 'loading' ? 'Trabajando… (puede tardar hasta un minuto)' : s.message;
    return <p style={{ margin: '0.4rem 0 0', fontSize: 13, color }} role="status">{s.status === 'error' ? '❌ ' : s.status === 'done' ? '✅ ' : '⏳ '}{text}</p>;
  };

  const busy = (id: string) => state[id]?.status === 'loading';

  const doPreview = (surface: 'feed' | 'story') => run(`preview-${surface}`, async () => {
    const data = await callApi(`/api/social-auto-post?dryRun=1${surface === 'story' ? '&surface=story' : ''}`);
    setPreview(data as Preview);
    return 'Vista previa lista (abajo). No se ha publicado nada.';
  });

  const doPublish = (surface: 'feed' | 'story') => {
    const label = surface === 'story' ? 'la Story' : 'el post del feed';
    if (!window.confirm(`Esto publica ${label} DE VERDAD ahora mismo en Facebook e Instagram, aunque ya se haya publicado hoy. ¿Seguir?`)) return;
    run(`publish-${surface}`, async () => {
      const data = await callApi(`/api/social-auto-post?force=1${surface === 'story' ? '&surface=story' : ''}`);
      const result = (r: { ok: boolean } | null) => (r === null ? 'no se intentó' : r.ok ? 'publicado' : 'falló');
      return `"${data.story?.title}": Facebook ${result(data.facebook)}, Instagram ${result(data.instagram)}.`;
    }, true);
  };

  const doPlan = () => {
    if (nextWeekHasPlan && !window.confirm('La semana siguiente ya tiene plan. ¿Sustituirlo por uno nuevo? Se perderán los cambios hechos a mano.')) return;
    run('plan', async () => {
      const data = await callApi(`/api/social-plan-generate?week=${nextWeekStart}${nextWeekHasPlan ? '&force=1' : ''}`);
      return `Plan "${data.themeLabel}" generado con ${data.days?.length ?? 0} días.`;
    }, true);
  };

  const doMetrics = () => run('metrics', async () => {
    const data = await callApi('/api/social-insights-collect');
    return `Estadísticas actualizadas: ${data.postsUpdated} publicaciones${data.errors?.length ? `, ${data.errors.length} errores` : ''}.`;
  }, true);

  const doWhatsApp = () => run('whatsapp', async () => {
    await callApi('/api/social-notify-test', { method: 'POST' });
    return 'Enviado. Debería llegarte en unos segundos.';
  });

  return (
    <div style={{ display: 'grid', gap: '1rem' }}>
      <div style={{ display: 'grid', gap: '1rem', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))' }}>
        <div style={box}>
          <strong>Ver qué se publicaría ahora</strong>
          <p style={{ margin: '0.25rem 0 0.75rem', fontSize: 13, color: '#52514e' }}>Genera el texto y la imagen como lo haría el cron, sin publicar nada.</p>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button onClick={() => doPreview('feed')} disabled={busy('preview-feed')}>Post del feed</button>
            <button onClick={() => doPreview('story')} disabled={busy('preview-story')}>Story</button>
          </div>
          <Status id="preview-feed" /><Status id="preview-story" />
        </div>

        <div style={box}>
          <strong>Publicar ahora</strong>
          <p style={{ margin: '0.25rem 0 0.75rem', fontSize: 13, color: '#52514e' }}>Por si un día el cron no llegó a publicar. Publica de verdad en las dos redes.</p>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button onClick={() => doPublish('feed')} disabled={busy('publish-feed')}>Publicar post</button>
            <button onClick={() => doPublish('story')} disabled={busy('publish-story')}>Publicar Story</button>
          </div>
          <Status id="publish-feed" /><Status id="publish-story" />
        </div>

        <div style={box}>
          <strong>Plan de la semana siguiente</strong>
          <p style={{ margin: '0.25rem 0 0.75rem', fontSize: 13, color: '#52514e' }}>
            {nextWeekHasPlan ? 'Ya está hecho. Puedes rehacerlo con la IA desde cero.' : 'Aún no existe (se genera solo los jueves). Puedes adelantarlo.'}
          </p>
          <button onClick={doPlan} disabled={busy('plan')}>{nextWeekHasPlan ? 'Rehacer plan' : 'Generar plan'}</button>
          <Status id="plan" />
        </div>

        <div style={box}>
          <strong>Mantenimiento</strong>
          <p style={{ margin: '0.25rem 0 0.75rem', fontSize: 13, color: '#52514e' }}>Las estadísticas se recogen solas cada día a las 15:00 UTC.</p>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button onClick={doMetrics} disabled={busy('metrics')}>Actualizar estadísticas</button>
            <button onClick={doWhatsApp} disabled={busy('whatsapp')}>WhatsApp de prueba</button>
          </div>
          <Status id="metrics" /><Status id="whatsapp" />
        </div>
      </div>

      {preview && (
        <div style={{ ...box, background: '#fafaf8' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'baseline', flexWrap: 'wrap' }}>
            <strong>Vista previa: {preview.surface === 'story' ? 'Story' : 'post del feed'} — "{preview.story.title}"</strong>
            <button onClick={() => setPreview(null)}>Cerrar</button>
          </div>
          <p style={{ fontSize: 13, color: '#52514e', margin: '0.25rem 0 0.75rem' }}>
            Formato: {preview.format === 'decision' ? '¿qué elegirías?' : 'recomendación'}
            {preview.theme ? ` · Hilo: ${preview.theme.label}` : ' · Sin hilo'}
            {preview.isNewStory ? ' · Cuento nuevo' : ''}
            {preview.plan?.angle ? ` · Enfoque: ${preview.plan.angle}` : ''}
          </p>
          <div style={{ display: 'grid', gap: '1rem', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))' }}>
            {preview.surface === 'story' ? (
              <img src={preview.storyImageUrl ?? ''} alt="Imagen de la Story" style={{ width: '100%', maxWidth: 270, borderRadius: 8 }} />
            ) : (
              <>
                <div>
                  <p style={{ fontWeight: 600, margin: '0 0 0.25rem' }}>Facebook</p>
                  <img src={preview.imageUrl ?? ''} alt="" style={{ width: '100%', borderRadius: 8 }} />
                  <p style={{ whiteSpace: 'pre-wrap', fontSize: 14 }}>{preview.facebookMessage}</p>
                </div>
                <div>
                  <p style={{ fontWeight: 600, margin: '0 0 0.25rem' }}>Instagram</p>
                  <img src={preview.instagramImageUrl ?? ''} alt="" style={{ width: '100%', maxWidth: 320, borderRadius: 8 }} />
                  <p style={{ whiteSpace: 'pre-wrap', fontSize: 14 }}>{preview.instagramMessage}</p>
                </div>
              </>
            )}
          </div>
          <p style={{ fontSize: 12, color: '#8a8984', marginBottom: 0 }}>El texto lo escribe la IA en cada ejecución: el que salga de verdad será parecido, no idéntico.</p>
        </div>
      )}
    </div>
  );
}

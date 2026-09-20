import { useEffect, useState } from 'react';

type StructureIssue = { scope: 'structure'; type: string; [key: string]: unknown };
// Los cinco tipos que produce diagnoseStory (ver src/utils/functions.ts).
// Aquí solo estaban los dos primeros, así que los otros tres se pintaban con
// el texto del último caso ("palabras no válidas (undefined)").
type ContentIssue = {
  scope: 'content';
  type: 'screenplay-dialogue' | 'invalid-words' | 'leaked-ending-label' | 'malformed-dashes' | 'quoted-dialogue';
  slug: string;
  words?: string[];
};
type Issue = StructureIssue | ContentIssue;

type StoryResult = {
  storyId: number;
  storySlug: string;
  storyTitle: string;
  issues: Issue[];
};

type RepairState = Record<string, { status: 'loading' | 'done' | 'error'; message?: string }>;

const describeStructureIssue = (issue: StructureIssue) => {
  switch (issue.type) {
    case 'broken-link':
      return `Enlace roto: "${issue.currentSlug}" → "${issue.missingSlug}" (opción: "${issue.optionText}")`;
    case 'orphan-node':
      return `Nodo huérfano (nadie lo referencia): "${issue.slug}"`;
    case 'duplicate-slug':
      return `Slug duplicado entre nodos: "${issue.slug}"`;
    case 'no-ending':
      return 'El cuento no tiene ningún final entre sus nodos';
    default:
      return JSON.stringify(issue);
  }
};

// Cada tipo, con su texto. Antes solo se distinguía 'screenplay-dialogue' y
// todo lo demás caía en "palabras no válidas (undefined)": los guiones mal
// cerrados, el diálogo entrecomillado y la etiqueta de final filtrada se
// mostraban mal, porque esos problemas no traen lista de palabras.
const CONTENT_ISSUE_LABELS: Record<ContentIssue['type'], string> = {
  'screenplay-dialogue': 'diálogo con formato de guion',
  'invalid-words': 'palabras no válidas',
  'leaked-ending-label': 'etiqueta interna de final filtrada en el texto',
  'malformed-dashes': 'guiones de diálogo mal cerrados',
  'quoted-dialogue': 'diálogo marcado con comillas',
};

const describeContentIssue = (issue: ContentIssue) => {
  const label = CONTENT_ISSUE_LABELS[issue.type] ?? issue.type;
  return issue.words?.length ? `${label} (${issue.words.join(', ')})` : label;
};

const RepairStoriesPanel = () => {
  const [loading, setLoading] = useState(true);
  const [results, setResults] = useState<StoryResult[]>([]);
  const [scanned, setScanned] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [repairState, setRepairState] = useState<RepairState>({});
  const [deleting, setDeleting] = useState<Record<string, boolean>>({});

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/diagnose-stories');
      const data = await response.json();
      if (!response.ok) throw new Error(data?.error || 'Error al diagnosticar');
      setResults(data.results);
      setScanned(data.scannedStories);
    } catch (err) {
      setError(String(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const repair = async (storySlug: string, target: string) => {
    const key = `${storySlug}:${target}`;
    setRepairState(prev => ({ ...prev, [key]: { status: 'loading' } }));
    try {
      const response = await fetch(`/api/repair-scene?storySlug=${encodeURIComponent(storySlug)}&target=${encodeURIComponent(target)}`);
      const data = await response.json();
      if (!response.ok) throw new Error(data?.error || 'Error al reparar');
      setRepairState(prev => ({
        ...prev,
        [key]: {
          status: 'done',
          message: data.fixed === false
            ? 'No se pudo corregir del todo tras varios intentos; se guardó la última versión generada'
            : 'Corregido y guardado',
        },
      }));
    } catch (err) {
      setRepairState(prev => ({ ...prev, [key]: { status: 'error', message: String(err) } }));
    }
  };

  const removeStory = async (storySlug: string) => {
    if (!confirm(`¿Seguro que quieres eliminar el cuento "${storySlug}"? Esta acción no se puede deshacer.`)) return;
    setDeleting(prev => ({ ...prev, [storySlug]: true }));
    try {
      const response = await fetch(`/api/delete-story?url=${encodeURIComponent(storySlug)}`);
      if (!response.ok) throw new Error('La API de borrado devolvió un error');
      setResults(prev => prev.filter(result => result.storySlug !== storySlug));
    } catch (err) {
      alert(`Error al eliminar: ${err}`);
      setDeleting(prev => ({ ...prev, [storySlug]: false }));
    }
  };

  if (loading) return <p>Analizando todos los cuentos (comprobaciones deterministas, sin coste)...</p>;
  if (error) return <p>Error al analizar: {error} <button onClick={load}>Reintentar</button></p>;

  return (
    <div>
      <p style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
        <span className="badge badge-neutral">{scanned} cuentos analizados</span>
        <span className={`badge ${results.length > 0 ? 'badge-warn' : 'badge-ok'}`}>
          {results.length > 0 ? `⚠️ ${results.length} con problemas` : '✅ Ninguno con problemas'}
        </span>
        <button className="btn-primary" onClick={load}>Reanalizar</button>
      </p>

      {results.length === 0 && <p>No se ha detectado ningún problema. 🎉</p>}

      {results.map(result => {
        const structureIssues = result.issues.filter((issue): issue is StructureIssue => issue.scope === 'structure');
        const contentIssues = result.issues.filter((issue): issue is ContentIssue => issue.scope === 'content');

        return (
          <div key={result.storyId} className="card" style={{ marginBottom: '1rem' }}>
            <h3 style={{ margin: '0 0 0.5rem' }}>
              {result.storyTitle} <a href={`/${result.storySlug}`} target="_blank" rel="noreferrer">(ver)</a>
            </h3>

            {structureIssues.length > 0 && (
              <div style={{ marginBottom: '0.75rem' }}>
                <strong>Problemas estructurales (no se reparan automáticamente):</strong>
                <ul>
                  {structureIssues.map((issue, index) => (
                    <li key={index}>{describeStructureIssue(issue)}</li>
                  ))}
                </ul>
                <button className="btn-danger" onClick={() => removeStory(result.storySlug)} disabled={deleting[result.storySlug]}>
                  {deleting[result.storySlug] ? 'Eliminando...' : 'Eliminar este cuento'}
                </button>
              </div>
            )}

            {contentIssues.length > 0 && (
              <div>
                <strong>Problemas de contenido (reparables con IA):</strong>
                <ul>
                  {contentIssues.map((issue, index) => {
                    const key = `${result.storySlug}:${issue.slug}`;
                    const state = repairState[key];
                    return (
                      <li key={index} style={{ marginBottom: '0.25rem' }}>
                        {issue.slug === 'story' ? 'Escena inicial' : `Escena "${issue.slug}"`}: {describeContentIssue(issue)}
                        {' '}
                        <button
                          onClick={() => repair(result.storySlug, issue.slug)}
                          disabled={state?.status === 'loading' || state?.status === 'done'}
                        >
                          {state?.status === 'loading' ? 'Reparando... (puede tardar)' : state?.status === 'done' ? 'Reparado' : 'Reparar'}
                        </button>
                        {state?.message && <span> — {state.message}</span>}
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default RepairStoriesPanel;

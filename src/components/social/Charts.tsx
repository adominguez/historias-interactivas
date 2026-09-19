import { useEffect, useId, useRef, useState, type PointerEvent } from 'react';

// Gráficas del panel /admin/redes-sociales, en SVG a mano (sin librería):
// una sola serie cada una, así que no llevan leyenda (el título dice qué se
// ve). Especificación seguida: columnas de 24px como mucho con la punta
// redondeada y la base recta, línea de 2px con punto final de 8px y anillo
// del color del fondo, cuadrícula de línea fina gris, texto siempre en los
// grises de texto (nunca en el color de la serie) y tooltip al pasar el
// ratón o al recorrerla con el teclado. Los mismos datos están en tablas en
// la propia página, así que el tooltip nunca es la única forma de leerlos.

export type Point = { label: string; value: number | null };

const SERIES = '#2a78d6';
const SURFACE = '#ffffff';
const GRID = '#e8e7e3';
const TEXT_SECONDARY = '#52514e';
const TEXT_MUTED = '#8a8984';

const HEIGHT = 200;
const PAD = { top: 16, right: 40, bottom: 28, left: 36 };
const PLOT_H = HEIGHT - PAD.top - PAD.bottom;

// El SVG se dibuja al ancho real de su contenedor (y no escalando un
// viewBox fijo): así el texto de los ejes sale siempre a su tamaño, sea la
// gráfica ancha o estrecha.
function useWidth() {
  const ref = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(640);
  useEffect(() => {
    if (!ref.current) return;
    const observer = new ResizeObserver(([entry]) => setWidth(Math.max(280, Math.round(entry.contentRect.width))));
    observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);
  return { ref, width, plotW: width - PAD.left - PAD.right };
}

// Máximo "redondo" para el eje: 1, 2, 5, 10, 20, 50...
function niceMax(value: number): number {
  if (value <= 0) return 1;
  const magnitude = 10 ** Math.floor(Math.log10(value));
  for (const step of [1, 2, 5, 10]) {
    if (value <= step * magnitude) return step * magnitude;
  }
  return 10 * magnitude;
}

const formatNumber = (value: number) => value.toLocaleString('es-ES');

function Axis({ max, plotW }: { max: number; plotW: number }) {
  const ticks = [0, max / 2, max];
  return (
    <g>
      {ticks.map((tick) => {
        const y = PAD.top + PLOT_H - (tick / max) * PLOT_H;
        return (
          <g key={tick}>
            <line x1={PAD.left} x2={PAD.left + plotW} y1={y} y2={y} stroke={GRID} strokeWidth={1} />
            <text x={PAD.left - 6} y={y + 4} textAnchor="end" fontSize={11} fill={TEXT_MUTED} style={{ fontVariantNumeric: 'tabular-nums' }}>
              {Number.isInteger(tick) ? formatNumber(tick) : ''}
            </text>
          </g>
        );
      })}
    </g>
  );
}

// Etiquetas del eje X: solo unas pocas (primera, última y algunas entre
// medias), nunca una por columna.
function XLabels({ points, xOf }: { points: Point[]; xOf: (i: number) => number }) {
  const every = Math.max(1, Math.ceil(points.length / 6));
  return (
    <g>
      {points.map((point, i) => (i % every === 0 || i === points.length - 1) && (i === points.length - 1 || points.length - 1 - i >= every / 2) ? (
        <text key={point.label} x={xOf(i)} y={HEIGHT - 8} textAnchor="middle" fontSize={11} fill={TEXT_MUTED}>{point.label}</text>
      ) : null)}
    </g>
  );
}

// x e y en unidades del SVG: el contenedor mide lo mismo que el SVG, así que
// basta pasarlas a porcentaje para colocar el tooltip encima del punto.
function Tooltip({ x, y, label, value, unit, width }: { x: number; y: number; label: string; value: number | null; unit: string; width: number }) {
  return (
    <div
      role="status"
      style={{
        position: 'absolute', left: `${(x / width) * 100}%`, top: `${(y / HEIGHT) * 100}%`, transform: 'translate(-50%, -110%)', pointerEvents: 'none',
        background: '#0b0b0b', color: '#fff', borderRadius: 6, padding: '4px 8px', fontSize: 12, whiteSpace: 'nowrap',
      }}
    >
      <strong style={{ fontSize: 13 }}>{value === null ? 'sin datos' : `${formatNumber(value)} ${unit}`}</strong>
      <span style={{ color: '#c3c2b7', marginLeft: 6 }}>{label}</span>
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return <p style={{ color: TEXT_SECONDARY, fontSize: 14, margin: '0.5rem 0 1rem' }}>{message}</p>;
}

export function ColumnChart({ title, points, unit, emptyMessage }: { title: string; points: Point[]; unit: string; emptyMessage: string }) {
  const [hover, setHover] = useState<number | null>(null);
  const titleId = useId();
  const { ref, width, plotW } = useWidth();
  const values = points.map((p) => p.value ?? 0);
  if (points.length === 0 || values.every((v) => v === 0)) {
    return (<figure style={{ margin: 0 }}><figcaption id={titleId} style={{ fontWeight: 600 }}>{title}</figcaption><EmptyState message={emptyMessage} /></figure>);
  }

  const max = niceMax(Math.max(...values));
  const band = plotW / points.length;
  const barW = Math.min(24, Math.max(2, band - 2));
  const xOf = (i: number) => PAD.left + band * i + band / 2;
  const yOf = (v: number) => PAD.top + PLOT_H - (v / max) * PLOT_H;

  // Columna con la punta redondeada (4px) y la base recta sobre el eje.
  const barPath = (x: number, top: number, w: number) => {
    const base = PAD.top + PLOT_H;
    const r = Math.min(4, w / 2, base - top);
    return `M${x},${base} V${top + r} Q${x},${top} ${x + r},${top} H${x + w - r} Q${x + w},${top} ${x + w},${top + r} V${base} Z`;
  };

  return (
    <figure style={{ margin: 0 }}>
      <figcaption id={titleId} style={{ fontWeight: 600, marginBottom: 4 }}>{title}</figcaption>
      <div ref={ref} style={{ position: 'relative' }}>
        <svg viewBox={`0 0 ${width} ${HEIGHT}`} width={width} height={HEIGHT} role="img" aria-labelledby={titleId} style={{ display: 'block', overflow: 'visible' }}>
          <Axis max={max} plotW={plotW} />
          {points.map((point, i) => {
            const value = point.value ?? 0;
            const x = xOf(i) - barW / 2;
            return (
              <g key={point.label}>
                {value > 0 && <path d={barPath(x, yOf(value), barW)} fill={SERIES} opacity={hover === null || hover === i ? 1 : 0.55} />}
                {/* Zona de ratón y foco: toda la franja de la columna, no solo lo pintado. */}
                <rect
                  x={PAD.left + band * i} y={PAD.top} width={band} height={PLOT_H} fill="transparent" tabIndex={0}
                  aria-label={`${point.label}: ${point.value === null ? 'sin datos' : `${point.value} ${unit}`}`}
                  onPointerEnter={() => setHover(i)} onPointerLeave={() => setHover(null)}
                  onFocus={() => setHover(i)} onBlur={() => setHover(null)}
                />
              </g>
            );
          })}
          <XLabels points={points} xOf={xOf} />
        </svg>
        {hover !== null && (
          <Tooltip x={xOf(hover)} y={yOf(points[hover].value ?? 0)} label={points[hover].label} value={points[hover].value} unit={unit} width={width} />
        )}
      </div>
    </figure>
  );
}

export function LineChart({ title, points, unit, emptyMessage }: { title: string; points: Point[]; unit: string; emptyMessage: string }) {
  const [hover, setHover] = useState<number | null>(null);
  const titleId = useId();
  const { ref, width, plotW } = useWidth();
  const known = points.map((p, i) => ({ ...p, i })).filter((p): p is { label: string; value: number; i: number } => p.value !== null);
  if (known.length < 2) {
    return (<figure style={{ margin: 0 }}><figcaption id={titleId} style={{ fontWeight: 600 }}>{title}</figcaption><EmptyState message={emptyMessage} /></figure>);
  }

  const max = niceMax(Math.max(...known.map((p) => p.value)));
  const step = points.length > 1 ? plotW / (points.length - 1) : 0;
  const xOf = (i: number) => PAD.left + step * i;
  const yOf = (v: number) => PAD.top + PLOT_H - (v / max) * PLOT_H;
  const d = known.map((p, k) => `${k === 0 ? 'M' : 'L'}${xOf(p.i)},${yOf(p.value)}`).join(' ');
  const last = known[known.length - 1];

  // La cruceta busca el día más cercano al puntero: se apunta a una fecha,
  // no a una línea de 2px.
  const onMove = (event: PointerEvent<SVGRectElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * plotW;
    setHover(Math.max(0, Math.min(points.length - 1, Math.round(x / (step || 1)))));
  };

  return (
    <figure style={{ margin: 0 }}>
      <figcaption id={titleId} style={{ fontWeight: 600, marginBottom: 4 }}>{title}</figcaption>
      <div ref={ref} style={{ position: 'relative' }}>
        <svg viewBox={`0 0 ${width} ${HEIGHT}`} width={width} height={HEIGHT} role="img" aria-labelledby={titleId} style={{ display: 'block', overflow: 'visible' }}>
          <Axis max={max} plotW={plotW} />
          <path d={d} fill="none" stroke={SERIES} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
          <circle cx={xOf(last.i)} cy={yOf(last.value)} r={4} fill={SERIES} stroke={SURFACE} strokeWidth={2} />
          <text x={xOf(last.i) + 8} y={yOf(last.value) + 4} fontSize={12} fontWeight={600} fill={TEXT_SECONDARY}>{formatNumber(last.value)}</text>
          {hover !== null && (
            <line x1={xOf(hover)} x2={xOf(hover)} y1={PAD.top} y2={PAD.top + PLOT_H} stroke={TEXT_MUTED} strokeWidth={1} />
          )}
          {hover !== null && points[hover].value !== null && (
            <circle cx={xOf(hover)} cy={yOf(points[hover].value as number)} r={4} fill={SERIES} stroke={SURFACE} strokeWidth={2} />
          )}
          <rect
            x={PAD.left} y={PAD.top} width={plotW} height={PLOT_H} fill="transparent" tabIndex={0}
            aria-label={`${title}: último valor ${last.value} ${unit}`}
            onPointerMove={onMove} onPointerLeave={() => setHover(null)}
            onFocus={() => setHover(last.i)} onBlur={() => setHover(null)}
            onKeyDown={(event) => {
              if (event.key === 'ArrowLeft') setHover((h) => Math.max(0, (h ?? last.i) - 1));
              if (event.key === 'ArrowRight') setHover((h) => Math.min(points.length - 1, (h ?? last.i) + 1));
            }}
          />
          <XLabels points={points} xOf={xOf} />
        </svg>
        {hover !== null && (
          <Tooltip x={xOf(hover)} y={points[hover].value === null ? PAD.top : yOf(points[hover].value as number)} label={points[hover].label} value={points[hover].value} unit={unit} width={width} />
        )}
      </div>
    </figure>
  );
}

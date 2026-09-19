-- Plan semanal de publicaciones en redes (ver src/utils/socialPlanner.ts y
-- src/pages/api/social-plan-generate.ts). Cada jueves una IA planifica la
-- semana siguiente — el hilo de la semana y qué cuento sale cada día, con
-- qué enfoque — y los crons diarios de social-auto-post.ts publican lo que
-- diga la fila del día. Si un día no tiene fila, se usa la rotación de temas
-- de socialThemes.ts: el plan mejora la publicación, pero nunca es
-- imprescindible para que salga algo.

-- Una fila por semana (lunes a domingo).
CREATE TABLE social_week_plans (
  week_start TEXT PRIMARY KEY,     -- lunes de la semana, YYYY-MM-DD
  theme_label TEXT NOT NULL,       -- "Llega el otoño", "Semana pirata"...
  theme_hashtag TEXT NOT NULL,
  rationale TEXT,                  -- por qué este hilo, según la IA
  needs TEXT,                      -- JSON: cuentos que faltan en el catálogo para las próximas fechas
  special_dates TEXT,              -- JSON: las fechas señaladas que se le dieron a la IA
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Una fila por día planificado. Un día puede faltar si la IA propuso algo
-- no válido para él (cuento inexistente, repetido...): ese día usa la rotación.
CREATE TABLE social_plan_days (
  date TEXT PRIMARY KEY,           -- YYYY-MM-DD
  week_start TEXT NOT NULL,
  story_id INTEGER NOT NULL,
  format TEXT NOT NULL,            -- 'recommendation' | 'decision'
  angle TEXT,                      -- enfoque del día: "Hoy empieza el otoño"...
  FOREIGN KEY (week_start) REFERENCES social_week_plans (week_start),
  FOREIGN KEY (story_id) REFERENCES stories (id)
);

CREATE INDEX idx_social_plan_days_week ON social_plan_days (week_start);

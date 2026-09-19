-- Estadísticas de redes para el panel /admin/redes-sociales (ver
-- src/utils/socialInsights.ts, que las recoge a diario con un cron).

-- El hilo con el que salió cada publicación ("Bienvenido otoño", "Semana
-- pirata"...), para poder comparar en el panel qué hilos funcionan mejor.
-- NULL en las publicaciones anteriores a esta columna y en las que no
-- formaban parte de ningún hilo.
ALTER TABLE social_posts ADD COLUMN theme TEXT;

-- Última lectura de las métricas de cada publicación (una fila por
-- publicación, que se sobrescribe en cada recogida mientras la publicación
-- tenga menos de 30 días: las métricas siguen creciendo los primeros días).
-- Qué columnas se rellenan depende de la plataforma: el alcance solo lo da
-- Instagram (en Facebook falta el permiso read_insights), y las Stories de
-- Instagram solo tienen datos si las vieron al menos 5 personas, y solo
-- durante sus 24 horas de vida; ese caso queda explicado en `note`.
CREATE TABLE social_post_metrics (
  social_post_id INTEGER PRIMARY KEY,
  reach INTEGER,
  views INTEGER,
  likes INTEGER,
  comments INTEGER,
  saved INTEGER,
  shares INTEGER,
  permalink TEXT,
  note TEXT,
  collected_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (social_post_id) REFERENCES social_posts (id)
);

-- Una fila por día y plataforma. Los seguidores son una foto del momento de
-- la recogida (Meta no da su evolución hasta los 100 seguidores); el resto
-- son los totales de ese día completo según Instagram: alcance de la cuenta,
-- visitas al perfil, clics en el enlace de la bio (el tráfico que llega a la
-- web desde Instagram) y cuentas que interactuaron.
CREATE TABLE social_account_daily (
  date TEXT NOT NULL,              -- YYYY-MM-DD (UTC)
  platform TEXT NOT NULL,          -- 'instagram' | 'facebook'
  followers INTEGER,
  reach INTEGER,
  profile_views INTEGER,
  website_clicks INTEGER,
  accounts_engaged INTEGER,
  collected_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (date, platform)
);

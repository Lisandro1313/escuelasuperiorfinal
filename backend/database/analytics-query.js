// Lógica compartida de estadísticas web. La usan database.js (SQLite) y
// database-turso.js (libSQL), que pasan sus propios helpers `all`/`one`
// (ambos backends entienden el mismo dialecto SQL: date()/datetime()/instr/substr).
//
//   all(sql) -> Promise<row[]>
//   one(sql) -> Promise<row>   (primera fila o {})

const isDate = (s) => typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s);
const ymd = (d) => d.toISOString().slice(0, 10);

module.exports = async function computeWebAnalytics({ days = 30, from = null, to = null, excludeStaff = true } = {}, all, one) {
  const d = Math.max(1, Math.min(366, parseInt(days, 10) || 30));
  const custom = isDate(from) && isDate(to) && from <= to;

  // Filtro para excluir visitas del staff (admin/profes). Las anónimas se
  // mantienen (no se puede saber si son del staff).
  const staff = excludeStaff
    ? `AND (user_id IS NULL OR user_id NOT IN (SELECT id FROM users WHERE tipo IN ('admin','profesor')))`
    : '';
  const staffPv = excludeStaff
    ? `AND (pv.user_id IS NULL OR pv.user_id NOT IN (SELECT id FROM users WHERE tipo IN ('admin','profesor')))`
    : '';

  // Ventana del rango elegido (para serie, top páginas, países, etc.).
  const rangeCond = custom
    ? `created_at >= date('${from}') AND created_at < date('${to}','+1 day')`
    : `created_at >= date('now','-${d - 1} days')`;
  const rangeCondPv = custom
    ? `pv.created_at >= date('${from}') AND pv.created_at < date('${to}','+1 day')`
    : `pv.created_at >= date('now','-${d - 1} days')`;

  // Fechas efectivas del rango (para que el front arme las barras día a día).
  const fromOut = custom ? from : ymd(new Date(Date.now() - (d - 1) * 86400000));
  const toOut = custom ? to : ymd(new Date());

  const win = async (whereDate) => {
    const r = await one(`SELECT COUNT(*) AS views, COUNT(DISTINCT visitor_id) AS visitors FROM page_views WHERE ${whereDate} ${staff}`);
    return { views: Number(r.views || 0), visitors: Number(r.visitors || 0) };
  };

  // Extrae el id de curso del path (/course/4, /course/4/aula, etc.). '/course/' = 8 chars.
  const courseIdExpr = `CAST(CASE WHEN instr(substr(pv.path, 9), '/') > 0
      THEN substr(substr(pv.path, 9), 1, instr(substr(pv.path, 9), '/') - 1)
      ELSE substr(pv.path, 9) END AS INTEGER)`;

  const [totals, today, last7, last30, onlineRow, usersRow, series, topPages, split, courseVisits, countries, regions] = await Promise.all([
    win(`1=1`),
    win(`created_at >= date('now')`),
    win(`created_at >= datetime('now','-7 days')`),
    win(`created_at >= datetime('now','-30 days')`),
    one(`SELECT COUNT(DISTINCT visitor_id) AS n FROM page_views WHERE created_at >= datetime('now','-5 minutes') ${staff}`),
    one(`SELECT
           (SELECT COUNT(*) FROM users) AS total,
           (SELECT COUNT(*) FROM users WHERE tipo = 'alumno') AS alumnos,
           (SELECT COUNT(*) FROM users WHERE created_at >= datetime('now','-7 days')) AS new7,
           (SELECT COUNT(*) FROM users WHERE created_at >= datetime('now','-30 days')) AS new30`),
    all(`SELECT date(created_at) AS dia, COUNT(*) AS views, COUNT(DISTINCT visitor_id) AS visitors
         FROM page_views WHERE ${rangeCond} ${staff}
         GROUP BY dia ORDER BY dia ASC`),
    all(`SELECT path, COUNT(*) AS views, COUNT(DISTINCT visitor_id) AS visitors
         FROM page_views WHERE ${rangeCond} ${staff}
         GROUP BY path ORDER BY views DESC LIMIT 8`),
    one(`SELECT
           SUM(CASE WHEN user_id IS NOT NULL THEN 1 ELSE 0 END) AS logueados,
           SUM(CASE WHEN user_id IS NULL THEN 1 ELSE 0 END) AS anonimos
         FROM page_views WHERE ${rangeCond} ${staff}`),
    all(`SELECT c.id AS course_id, c.nombre AS nombre, COUNT(*) AS views, COUNT(DISTINCT pv.visitor_id) AS visitors
         FROM page_views pv JOIN courses c ON c.id = ${courseIdExpr}
         WHERE pv.path LIKE '/course/%' AND ${rangeCondPv} ${staffPv}
         GROUP BY c.id ORDER BY views DESC LIMIT 10`),
    all(`SELECT country, COUNT(*) AS views, COUNT(DISTINCT visitor_id) AS visitors
         FROM page_views WHERE ${rangeCond} ${staff} AND country IS NOT NULL AND country != ''
         GROUP BY country ORDER BY views DESC LIMIT 12`),
    all(`SELECT country, region, COUNT(*) AS views, COUNT(DISTINCT visitor_id) AS visitors
         FROM page_views WHERE ${rangeCond} ${staff} AND region IS NOT NULL AND region != ''
         GROUP BY country, region ORDER BY views DESC LIMIT 12`),
  ]);

  return {
    days: d,
    from: fromOut,
    to: toOut,
    custom,
    excludeStaff: !!excludeStaff,
    totals, today, last7, last30,
    online_now: Number(onlineRow.n || 0),
    users: {
      total: Number(usersRow.total || 0),
      alumnos: Number(usersRow.alumnos || 0),
      new7: Number(usersRow.new7 || 0),
      new30: Number(usersRow.new30 || 0),
    },
    split: { logueados: Number(split.logueados || 0), anonimos: Number(split.anonimos || 0) },
    series: series.map((s) => ({ dia: s.dia, views: Number(s.views || 0), visitors: Number(s.visitors || 0) })),
    top_pages: topPages.map((t) => ({ path: t.path, views: Number(t.views || 0), visitors: Number(t.visitors || 0) })),
    course_visits: courseVisits.map((c) => ({ course_id: c.course_id, nombre: c.nombre, views: Number(c.views || 0), visitors: Number(c.visitors || 0) })),
    top_countries: countries.map((c) => ({ country: c.country, views: Number(c.views || 0), visitors: Number(c.visitors || 0) })),
    top_regions: regions.map((r) => ({ country: r.country, region: r.region, views: Number(r.views || 0), visitors: Number(r.visitors || 0) })),
  };
};

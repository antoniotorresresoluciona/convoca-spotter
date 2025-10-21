import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import bcrypt from 'bcryptjs';
import db from './database.js';
import { monitorAll, monitorFundaciones, monitorEntesPublicos, monitorOtrasFuentes, monitorSublinks } from './monitor.js';
import { crawlSublink, crawlFundacionSublinks, crawlAllPendingSublinks } from './scraper.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const API_PORT = 3000;
const WEB_PORT = 80;

// Middlewares
app.use(cors());
app.use(express.json());

// Logger middleware
app.use((req, res, next) => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${req.method} ${req.path}`);
  next();
});

// Helper para formatear respuestas estilo Supabase
const formatResponse = (data, error = null) => {
  if (error) {
    return { data: null, error: { message: error, code: 'ERROR' } };
  }
  return { data, error: null };
};

// ========== API ENDPOINTS ==========

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Auth - Login
app.post('/rest/v1/rpc/login_admin', (req, res) => {
  const { username, password } = req.body;

  try {
    const user = db.prepare('SELECT * FROM admin_users WHERE username = ?').get(username);

    if (!user || !bcrypt.compareSync(password, user.password_hash)) {
      return res.status(401).json(formatResponse(null, 'Usuario o contraseña incorrectos'));
    }

    res.json(formatResponse({
      id: user.id,
      username: user.username,
      created_at: user.created_at
    }));
  } catch (error) {
    res.status(500).json(formatResponse(null, error.message));
  }
});

// Auth - Register
app.post('/api/auth/register', (req, res) => {
  const { username, password } = req.body;

  try {
    // Validaciones
    if (!username || !password) {
      return res.status(400).json({ error: 'Usuario y contraseña son requeridos' });
    }

    if (username.length < 3) {
      return res.status(400).json({ error: 'El usuario debe tener al menos 3 caracteres' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'La contraseña debe tener al menos 6 caracteres' });
    }

    // Verificar si el usuario ya existe
    const existingUser = db.prepare('SELECT id FROM admin_users WHERE username = ?').get(username);
    if (existingUser) {
      return res.status(409).json({ error: 'El usuario ya existe' });
    }

    // Hash de la contraseña
    const passwordHash = bcrypt.hashSync(password, 10);

    // Insertar nuevo usuario
    const result = db.prepare('INSERT INTO admin_users (username, password_hash) VALUES (?, ?)').run(username, passwordHash);

    // Obtener el usuario creado (por username ya que usamos UUIDs)
    const newUser = db.prepare('SELECT id, username, created_at FROM admin_users WHERE username = ?').get(username);

    console.log(`✅ Nuevo usuario registrado: ${username}`);

    res.status(201).json({
      success: true,
      user: newUser
    });
  } catch (error) {
    console.error('Error en registro:', error);
    res.status(500).json({ error: error.message || 'Error al registrar usuario' });
  }
});

// Auth - Check if first user (for showing registration)
app.get('/api/auth/has-users', (req, res) => {
  try {
    const count = db.prepare('SELECT COUNT(*) as count FROM admin_users').get();
    res.json({ hasUsers: count.count > 0 });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Generic SELECT endpoint
app.get('/rest/v1/:table', (req, res) => {
  const { table } = req.params;
  const validTables = ['fundaciones', 'entes_publicos', 'otras_fuentes', 'change_history', 'admin_users', 'sublinks'];

  if (!validTables.includes(table)) {
    return res.status(404).json(formatResponse(null, 'Table not found'));
  }

  try {
    let query = `SELECT * FROM ${table}`;
    const params = [];
    const filters = [];

    // Handle select parameter
    const select = req.query.select || '*';
    query = `SELECT ${select} FROM ${table}`;

    // Handle equality filters (e.g., ?username=eq.admin)
    Object.keys(req.query).forEach(key => {
      if (key === 'select' || key === 'order' || key === 'limit') return;

      const value = req.query[key];
      if (value.startsWith('eq.')) {
        filters.push(`${key} = ?`);
        params.push(value.substring(3));
      }
    });

    if (filters.length > 0) {
      query += ` WHERE ${filters.join(' AND ')}`;
    }

    // Handle order
    if (req.query.order) {
      const [field, direction = 'asc'] = req.query.order.split('.');
      query += ` ORDER BY ${field} ${direction.toUpperCase()}`;
    }

    // Handle limit
    if (req.query.limit) {
      query += ` LIMIT ${parseInt(req.query.limit)}`;
    }

    const stmt = db.prepare(query);
    const data = stmt.all(...params);

    res.set('Content-Range', `0-${data.length}/${data.length}`);
    res.json(data);
  } catch (error) {
    res.status(500).json(formatResponse(null, error.message));
  }
});

// Generic INSERT endpoint
app.post('/rest/v1/:table', (req, res) => {
  const { table } = req.params;
  const validTables = ['fundaciones', 'entes_publicos', 'otras_fuentes', 'change_history', 'sublinks'];

  if (!validTables.includes(table)) {
    return res.status(404).json(formatResponse(null, 'Table not found'));
  }

  try {
    const body = Array.isArray(req.body) ? req.body : [req.body];
    const results = [];

    body.forEach(item => {
      const keys = Object.keys(item);
      const placeholders = keys.map(() => '?').join(', ');
      const query = `INSERT INTO ${table} (${keys.join(', ')}) VALUES (${placeholders})`;

      const stmt = db.prepare(query);
      const result = stmt.run(...keys.map(k => item[k]));

      // Get the inserted row
      const inserted = db.prepare(`SELECT * FROM ${table} WHERE id = ?`).get(result.lastInsertRowid);
      results.push(inserted);
    });

    res.status(201).json(Array.isArray(req.body) ? results : results[0]);
  } catch (error) {
    res.status(500).json(formatResponse(null, error.message));
  }
});

// Generic UPDATE endpoint
app.patch('/rest/v1/:table', (req, res) => {
  const { table } = req.params;
  const validTables = ['fundaciones', 'entes_publicos', 'otras_fuentes', 'change_history', 'sublinks'];

  if (!validTables.includes(table)) {
    return res.status(404).json(formatResponse(null, 'Table not found'));
  }

  try {
    const body = req.body;
    const setClause = Object.keys(body).map(key => `${key} = ?`).join(', ');
    const params = Object.values(body);

    // Parse filters from query params
    const filters = [];
    Object.keys(req.query).forEach(key => {
      const value = req.query[key];
      if (value.startsWith('eq.')) {
        filters.push(`${key} = ?`);
        params.push(value.substring(3));
      }
    });

    if (filters.length === 0) {
      return res.status(400).json(formatResponse(null, 'No filters provided'));
    }

    // Solo agregar updated_at si la tabla lo tiene
    const tablesWithUpdatedAt = ['fundaciones', 'entes_publicos', 'otras_fuentes'];
    const updateClause = tablesWithUpdatedAt.includes(table)
      ? `${setClause}, updated_at = CURRENT_TIMESTAMP`
      : setClause;

    const query = `UPDATE ${table} SET ${updateClause} WHERE ${filters.join(' AND ')}`;
    const stmt = db.prepare(query);
    stmt.run(...params);

    // Get updated row
    const idFilter = req.query.id?.substring(3);
    const updated = db.prepare(`SELECT * FROM ${table} WHERE id = ?`).get(idFilter);

    res.json(updated || {});
  } catch (error) {
    res.status(500).json(formatResponse(null, error.message));
  }
});

// Generic DELETE endpoint
app.delete('/rest/v1/:table', (req, res) => {
  const { table } = req.params;
  const validTables = ['fundaciones', 'entes_publicos', 'otras_fuentes', 'change_history', 'sublinks'];

  if (!validTables.includes(table)) {
    return res.status(404).json(formatResponse(null, 'Table not found'));
  }

  try {
    const params = [];
    const filters = [];

    Object.keys(req.query).forEach(key => {
      const value = req.query[key];
      if (value.startsWith('eq.')) {
        filters.push(`${key} = ?`);
        params.push(value.substring(3));
      }
    });

    if (filters.length === 0) {
      return res.status(400).json(formatResponse(null, 'No filters provided'));
    }

    const query = `DELETE FROM ${table} WHERE ${filters.join(' AND ')}`;
    const stmt = db.prepare(query);
    stmt.run(...params);

    res.status(204).send();
  } catch (error) {
    res.status(500).json(formatResponse(null, error.message));
  }
});

// ========== MONITORING ENDPOINTS ==========

// Trigger monitoring manually
app.post('/api/monitor/all', async (req, res) => {
  try {
    console.log('\n🔄 Manual monitoring triggered via API');
    const results = await monitorAll();
    res.json({ success: true, results });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/monitor/fundaciones', async (req, res) => {
  try {
    const results = await monitorFundaciones();
    res.json({ success: true, results });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/monitor/entes', async (req, res) => {
  try {
    const results = await monitorEntesPublicos();
    res.json({ success: true, results });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/monitor/fuentes', async (req, res) => {
  try {
    const results = await monitorOtrasFuentes();
    res.json({ success: true, results });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ========== PUBLIC ENDPOINTS (No Auth Required) ==========

// Endpoint público para cambios relevantes
app.get('/api/public/relevant-changes', (req, res) => {
  const { sourceType = 'all', priority = 'all', dateRange = '30d', limit = 100 } = req.query;

  try {
    // Subquery para obtener el cambio más reciente por URL (solo uno por URL)
    let query = `
      SELECT
        c.id, c.source_name, c.source_type, c.changes_description,
        c.priority, c.detected_at, c.url, c.ai_summary, c.deadline_date,
        c.ai_keywords, c.is_new_convocatoria, c.change_type,
        c.old_value, c.new_value, c.notes
      FROM change_history c
      INNER JOIN (
        SELECT url, MAX(detected_at) as max_date, MIN(id) as min_id
        FROM change_history
        WHERE status = 'relevant'
        GROUP BY url
      ) latest ON c.url = latest.url AND c.detected_at = latest.max_date AND c.id = latest.min_id
      WHERE c.status = 'relevant'
    `;

    const params = [];

    // Filtro por tipo de fuente
    if (sourceType !== 'all') {
      query += ` AND c.source_type = ?`;
      params.push(sourceType);
    }

    // Filtro por prioridad
    if (priority !== 'all') {
      query += ` AND c.priority = ?`;
      params.push(priority);
    }

    // Filtro por rango de fechas
    if (dateRange !== 'all') {
      const days = parseInt(dateRange.replace('d', ''));
      if (!isNaN(days)) {
        query += ` AND c.detected_at >= datetime('now', '-${days} days')`;
      }
    }

    query += ` ORDER BY c.detected_at DESC LIMIT ?`;
    params.push(parseInt(limit));

    const results = db.prepare(query).all(...params);

    // Parsear campos JSON
    const formattedResults = results.map(row => ({
      ...row,
      ai_keywords: row.ai_keywords ? JSON.parse(row.ai_keywords) : [],
      is_new_convocatoria: Boolean(row.is_new_convocatoria)
    }));

    res.json(formattedResults);
  } catch (error) {
    console.error('Error en endpoint público:', error);
    res.status(500).json({ error: error.message });
  }
});

// Registrar interés del usuario (público, sin autenticación)
app.post('/api/public/user-interest', (req, res) => {
  const { change_id, interest, timestamp } = req.body;

  if (!change_id || !interest) {
    return res.status(400).json({ error: 'Faltan parámetros requeridos' });
  }

  try {
    // Crear tabla si no existe
    db.exec(`
      CREATE TABLE IF NOT EXISTS user_interests (
        id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
        change_id TEXT NOT NULL,
        interest TEXT NOT NULL,
        timestamp TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        user_ip TEXT,
        FOREIGN KEY (change_id) REFERENCES change_history(id) ON DELETE CASCADE
      )
    `);

    // Registrar el interés (con IP del usuario para evitar duplicados)
    const userIp = req.ip || req.connection.remoteAddress;

    // Verificar si ya existe un registro para este cambio y esta IP
    const existing = db.prepare(
      'SELECT id FROM user_interests WHERE change_id = ? AND user_ip = ?'
    ).get(change_id, userIp);

    if (existing) {
      // Actualizar el registro existente
      db.prepare(
        'UPDATE user_interests SET interest = ?, timestamp = ? WHERE id = ?'
      ).run(interest, timestamp, existing.id);
    } else {
      // Insertar nuevo registro
      db.prepare(
        'INSERT INTO user_interests (change_id, interest, timestamp, user_ip) VALUES (?, ?, ?, ?)'
      ).run(change_id, interest, timestamp, userIp);
    }

    res.json({ success: true, message: 'Interés registrado' });
  } catch (error) {
    console.error('Error registrando interés:', error);
    res.status(500).json({ error: error.message });
  }
});

// Estadísticas públicas
app.get('/api/public/stats', (req, res) => {
  try {
    const stats = {
      total: db.prepare("SELECT COUNT(*) as count FROM change_history WHERE status = 'relevant'").get().count,
      bySourceType: db.prepare(`
        SELECT source_type, COUNT(*) as count
        FROM change_history
        WHERE status = 'relevant'
        GROUP BY source_type
      `).all(),
      byPriority: db.prepare(`
        SELECT priority, COUNT(*) as count
        FROM change_history
        WHERE status = 'relevant'
        GROUP BY priority
      `).all(),
      recentChanges: db.prepare(`
        SELECT COUNT(*) as count
        FROM change_history
        WHERE status = 'relevant' AND detected_at >= datetime('now', '-7 days')
      `).get().count,
      sources: {
        fundaciones: db.prepare('SELECT COUNT(*) as count FROM fundaciones').get().count,
        entesPublicos: db.prepare('SELECT COUNT(*) as count FROM entes_publicos').get().count,
        otrasFuentes: db.prepare('SELECT COUNT(*) as count FROM otras_fuentes').get().count,
      }
    };

    res.json(stats);
  } catch (error) {
    console.error('Error en stats públicas:', error);
    res.status(500).json({ error: error.message });
  }
});

// ========== SUBLINKS ENDPOINTS ==========

// Crawl all pending sublinks
app.post('/api/sublinks/crawl-all', async (req, res) => {
  try {
    console.log('\n🔄 Manual sublinks crawling triggered via API');
    const { maxSublinks = 50, maxPerFundacion = 10, maxDepth = 1 } = req.body;

    const results = await crawlAllPendingSublinks({
      maxSublinks,
      maxPerFundacion,
      maxDepth,
      detectChangesFlag: true,
      updateDb: true
    });

    res.json({ success: true, results });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Crawl sublinks for a specific fundacion
app.post('/api/sublinks/crawl-fundacion/:fundacionId', async (req, res) => {
  try {
    const { fundacionId } = req.params;
    const { maxSublinks = 20, maxDepth = 1 } = req.body;

    console.log(`\n🔄 Crawling sublinks for fundacion ${fundacionId}`);

    const results = await crawlFundacionSublinks(parseInt(fundacionId), {
      maxSublinks,
      maxDepth,
      detectChangesFlag: true,
      updateDb: true
    });

    res.json({ success: true, results });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Crawl a specific sublink
app.post('/api/sublinks/crawl/:sublinkId', async (req, res) => {
  try {
    const { sublinkId } = req.params;

    console.log(`\n🔄 Crawling sublink ${sublinkId}`);

    const result = await crawlSublink(parseInt(sublinkId), {
      detectChangesFlag: true,
      updateDb: true
    });

    res.json({ success: result.success, result });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get sublinks for a fundacion
app.get('/api/sublinks/fundacion/:fundacionId', (req, res) => {
  try {
    const { fundacionId } = req.params;
    const { limit = 50, offset = 0, order = 'priority DESC, last_checked ASC' } = req.query;

    const sublinks = db.prepare(`
      SELECT * FROM sublinks
      WHERE fundacion_id = ?
      ORDER BY ${order}
      LIMIT ? OFFSET ?
    `).all(fundacionId, parseInt(limit), parseInt(offset));

    const total = db.prepare('SELECT COUNT(*) as count FROM sublinks WHERE fundacion_id = ?')
      .get(fundacionId).count;

    res.json({ success: true, data: sublinks, total });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get sublinks statistics
app.get('/api/sublinks/stats', (req, res) => {
  try {
    const stats = db.prepare(`
      SELECT
        COUNT(*) as total,
        COUNT(CASE WHEN last_checked IS NULL THEN 1 END) as pending,
        COUNT(CASE WHEN status = 'updated' THEN 1 END) as updated,
        COUNT(CASE WHEN status = 'unchanged' THEN 1 END) as unchanged,
        COUNT(CASE WHEN status = 'error' THEN 1 END) as errors,
        AVG(CASE WHEN depth IS NOT NULL THEN depth ELSE 1 END) as avg_depth
      FROM sublinks
    `).get();

    const byFundacion = db.prepare(`
      SELECT
        f.name as fundacion_name,
        COUNT(s.id) as total_sublinks,
        COUNT(CASE WHEN s.last_checked IS NULL THEN 1 END) as pending
      FROM fundaciones f
      LEFT JOIN sublinks s ON s.fundacion_id = f.id
      GROUP BY f.id, f.name
      HAVING total_sublinks > 0
      ORDER BY total_sublinks DESC
    `).all();

    res.json({ success: true, stats, byFundacion });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ========== SERVE STATIC FILES ==========
app.use(express.static(path.join(__dirname, '../dist')));

// Catch-all para SPA routing - solo para rutas HTML no API
app.use((req, res, next) => {
  // No interceptar rutas de API
  if (req.path.startsWith('/api/') || req.path.startsWith('/rest/')) {
    return next();
  }

  // Servir index.html para rutas del frontend
  if (!req.path.includes('.')) {
    res.sendFile(path.join(__dirname, '../dist/index.html'));
  } else {
    next();
  }
});

// Start server
app.listen(API_PORT, () => {
  console.log('\n' + '='.repeat(70));
  console.log('🚀 CONVOCA-SPOTTER - SISTEMA DE PRODUCCIÓN');
  console.log('='.repeat(70));
  console.log(`📡 API Backend:      http://localhost:${API_PORT}`);
  console.log(`🌐 Web Application:  http://localhost:${API_PORT}`);
  console.log(`📊 Database:         SQLite (backend/local.db)`);
  console.log(`🔑 Admin:            admin / admin123`);
  console.log('='.repeat(70));
  console.log(`✅ Sistema listo - ${new Date().toLocaleString('es-ES')}\n`);
});

export default app;

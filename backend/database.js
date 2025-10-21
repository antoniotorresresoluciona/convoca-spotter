import Database from 'better-sqlite3';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import bcrypt from 'bcryptjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const db = new Database(join(__dirname, 'local.db'));

// Enable foreign keys
db.pragma('foreign_keys = ON');

// Create tables
db.exec(`
  -- Admin users table
  CREATE TABLE IF NOT EXISTS admin_users (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    username TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );

  -- Fundaciones table
  CREATE TABLE IF NOT EXISTS fundaciones (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    name TEXT NOT NULL,
    url TEXT NOT NULL,
    category TEXT,
    last_hash TEXT,
    last_html TEXT,
    status TEXT,
    last_checked TEXT,
    enabled INTEGER DEFAULT 1,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );

  -- Entes públicos table
  CREATE TABLE IF NOT EXISTS entes_publicos (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    name TEXT NOT NULL,
    url TEXT NOT NULL,
    category TEXT,
    entity TEXT,
    last_hash TEXT,
    last_html TEXT,
    status TEXT,
    last_checked TEXT,
    enabled INTEGER DEFAULT 1,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );

  -- Otras fuentes table
  CREATE TABLE IF NOT EXISTS otras_fuentes (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    name TEXT NOT NULL,
    url TEXT NOT NULL,
    category TEXT,
    type TEXT,
    last_hash TEXT,
    last_html TEXT,
    status TEXT,
    last_checked TEXT,
    enabled INTEGER DEFAULT 1,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );

  -- Change history table
  CREATE TABLE IF NOT EXISTS change_history (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    fundacion_id TEXT,
    ente_publico_id TEXT,
    otra_fuente_id TEXT,
    url TEXT,
    change_type TEXT NOT NULL,
    old_value TEXT,
    new_value TEXT,
    changes_description TEXT,
    detected_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    status TEXT NOT NULL DEFAULT 'pending',
    priority TEXT NOT NULL DEFAULT 'normal',
    notes TEXT,
    reviewed INTEGER DEFAULT 0,
    reviewed_at TEXT,
    source_type TEXT,
    source_name TEXT,
    FOREIGN KEY (fundacion_id) REFERENCES fundaciones(id) ON DELETE CASCADE,
    FOREIGN KEY (ente_publico_id) REFERENCES entes_publicos(id) ON DELETE CASCADE,
    FOREIGN KEY (otra_fuente_id) REFERENCES otras_fuentes(id) ON DELETE CASCADE
  );

  -- Sublinks table para almacenar enlaces relevantes detectados
  CREATE TABLE IF NOT EXISTS sublinks (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    fundacion_id TEXT,
    ente_publico_id TEXT,
    otra_fuente_id TEXT,
    url TEXT NOT NULL,
    link_text TEXT,
    first_detected TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    last_seen TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    status TEXT DEFAULT 'active',
    FOREIGN KEY (fundacion_id) REFERENCES fundaciones(id) ON DELETE CASCADE,
    FOREIGN KEY (ente_publico_id) REFERENCES entes_publicos(id) ON DELETE CASCADE,
    FOREIGN KEY (otra_fuente_id) REFERENCES otras_fuentes(id) ON DELETE CASCADE
  );

  -- Create indexes
  CREATE INDEX IF NOT EXISTS idx_change_history_status ON change_history(status);
  CREATE INDEX IF NOT EXISTS idx_change_history_priority ON change_history(priority);
  CREATE INDEX IF NOT EXISTS idx_change_history_detected_at ON change_history(detected_at DESC);
  CREATE INDEX IF NOT EXISTS idx_change_history_source_type ON change_history(source_type);
  CREATE INDEX IF NOT EXISTS idx_sublinks_fundacion ON sublinks(fundacion_id);
  CREATE INDEX IF NOT EXISTS idx_sublinks_ente ON sublinks(ente_publico_id);
  CREATE INDEX IF NOT EXISTS idx_sublinks_fuente ON sublinks(otra_fuente_id);
  CREATE INDEX IF NOT EXISTS idx_sublinks_status ON sublinks(status);
`);

// Initialize admin user
const initializeAdmin = () => {
  const checkAdmin = db.prepare('SELECT id FROM admin_users WHERE username = ?').get('admin');

  if (!checkAdmin) {
    const passwordHash = bcrypt.hashSync('admin123', 10);
    db.prepare('INSERT INTO admin_users (username, password_hash) VALUES (?, ?)')
      .run('admin', passwordHash);
    console.log('✅ Admin user created: admin / admin123');
  }
};

// Initialize sample data
const initializeSampleData = () => {
  const fundacionesCount = db.prepare('SELECT COUNT(*) as count FROM fundaciones').get().count;

  if (fundacionesCount === 0) {
    const fundaciones = [
      ['FP Diverse', 'https://fpdiverse.org/', 'Diversidad'],
      ['FP Diverse DGrow', 'https://fpdiverse.org/dgrow/', 'Diversidad'],
      ['Fundación Inocente', 'https://fundacioninocente.org/convocatoria-de-ayudas/', 'Infancia'],
      ['Fundación Bidafarma', 'https://www.bidafarma.es/web/bidafarma/inicio/', 'Salud'],
      ['Fundación Pelayo', 'https://www.grupopelayo.com/compromiso-social/fundacion-pelayo', 'General'],
      ['Fundación Ibercaja', 'https://www.fundacionibercaja.es/convocatorias/', 'Financiera'],
      ['Fondation Carasso', 'https://www.fondationcarasso.org/es/convocatorias/', 'Internacional'],
      ['Fundación Carrefour', 'https://www.carrefour.es/grupo-carrefour/fundacion/convocatoria-de-ayudas/', 'Retail'],
      ['Fundación Iberdrola', 'https://www.fundacioniberdrolaespana.org/accion-social/programa-social', 'Energía'],
      ['Fundación Mapfre', 'https://www.fundacionmapfre.org/premios-ayudas/convocatorias/', 'Seguros']
    ];

    const insertFundacion = db.prepare('INSERT INTO fundaciones (name, url, category) VALUES (?, ?, ?)');
    fundaciones.forEach(([name, url, category]) => insertFundacion.run(name, url, category));
    console.log('✅ Sample fundaciones created');
  }

  const entesCount = db.prepare('SELECT COUNT(*) as count FROM entes_publicos').get().count;

  if (entesCount === 0) {
    const entes = [
      ['Ministerio de Cultura - Industrias Culturales', 'https://www.cultura.gob.es/servicios-al-ciudadano/catalogo/becas-ayudas-y-subvenciones/ayudas-y-subvenciones/industrias.html', 'Ministerio', 'Gobierno de España'],
      ['Cultura Galicia - Ayudas y Subvenciones', 'https://www.cultura.gal/es/axudas-subvencions-bolsas?field_asb_area_tematica_tid=85', 'Autonómico', 'Xunta de Galicia']
    ];

    const insertEnte = db.prepare('INSERT INTO entes_publicos (name, url, category, entity) VALUES (?, ?, ?, ?)');
    entes.forEach(([name, url, category, entity]) => insertEnte.run(name, url, category, entity));
    console.log('✅ Sample entes públicos created');
  }

  const fuentesCount = db.prepare('SELECT COUNT(*) as count FROM otras_fuentes').get().count;

  if (fuentesCount === 0) {
    const fuentes = [
      ['Diagram Consultores', 'https://www.diagramconsultores.com/convocatorias-subvenciones-y-financiaciones-publicas-y-privadas/', 'Consultora', 'Agregador'],
      ['Las Fundaciones - Convocatorias', 'https://lasfundaciones.com/category/convocatorias/', 'Portal Especializado', 'Agregador'],
      ['Dilu Consultores - Boletines', 'https://diluconsultores.com/boletines-informativos/', 'Consultora', 'Boletín'],
      ['Algalia', 'https://algalia.com/es/axudas/', 'Buscador', 'Buscador Especializado'],
      ['Axudas.gal', 'https://axudas.gal/es/buscar', 'Buscador Oficial', 'Buscador Galicia']
    ];

    const insertFuente = db.prepare('INSERT INTO otras_fuentes (name, url, category, type) VALUES (?, ?, ?, ?)');
    fuentes.forEach(([name, url, category, type]) => insertFuente.run(name, url, category, type));
    console.log('✅ Sample otras fuentes created');
  }
};

// Initialize database
initializeAdmin();
initializeSampleData();

export default db;

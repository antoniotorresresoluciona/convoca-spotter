import Database from 'better-sqlite3';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const db = new Database(join(__dirname, 'local.db'));

console.log('📝 Agregando más fundaciones...\n');

// Lista extendida de fundaciones españolas
const nuevasFundaciones = [
  // Fundaciones de referencia en España
  ['Fundación ONCE', 'https://www.fundaciononce.es/es/subvenciones-y-becas', 'Inclusión'],
  ['Fundación La Caixa', 'https://fundacionlacaixa.org/es/convocatorias', 'Social'],
  ['Fundación Telefónica', 'https://www.fundaciontelefonica.com/empleabilidad/becas-y-ayudas/', 'Tecnología'],
  ['Fundación BBVA', 'https://www.fbbva.es/convocatorias/', 'Cultura y Ciencia'],
  ['Fundación Bancaria "la Caixa"', 'https://fundacionlacaixa.org/es/', 'Social'],
  ['Fundación Botín', 'https://www.fundacionbotin.org/convocatorias/', 'Arte y Educación'],
  ['Fundación Santander', 'https://www.fundacionbancosantander.com/es/becas', 'Educación'],
  ['Fundación Ramón Areces', 'https://www.fundacionareces.es/fundacion-areces/convocatorias', 'Ciencia'],
  ['Fundación Carolina', 'https://www.fundacioncarolina.es/convocatorias/', 'Cooperación'],
  ['Fundación Princesa de Asturias', 'https://www.fpa.es/', 'Cultural'],

  // Fundaciones medio ambiente
  ['Fundación Biodiversidad', 'https://fundacion-biodiversidad.es/convocatorias', 'Medio Ambiente'],
  ['Fundación Naturgy', 'https://www.fundacionnaturgy.org/ayudas-vulnerabilidad-energetica/', 'Energía'],
  ['Fundación Repsol', 'https://www.fundacionrepsol.com/', 'Energía'],

  // Fundaciones salud
  ['Fundación Jiménez Díaz', 'https://www.fjd.es/es/investigacion-docencia', 'Salud'],
  ['Fundación SEPAR', 'https://www.separ.es/investigacion/becas-y-ayudas', 'Salud'],
  ['Fundación Española del Corazón', 'https://fundaciondelcorazon.com/', 'Salud'],

  // Fundaciones cultura y arte
  ['Fundación Juan March', 'https://www.march.es/es/convocatorias', 'Cultural'],
  ['Fundación Banco Sabadell', 'https://www.fundacionbancosabadell.com/', 'Cultural'],
  ['Fundación SGAE', 'https://www.fundacionsgae.org/es-ES/SitePages/Inicio.aspx', 'Música'],
  ['Acción Cultural Española', 'https://www.accioncultural.es/es/convocatorias', 'Cultural'],

  // Fundaciones emprendimiento
  ['Fundación Créate', 'https://www.fundacioncreate.org/', 'Emprendimiento'],
  ['Fundación Ship2B', 'https://www.ship2b.org/', 'Emprendimiento Social'],
  ['Fundación Compromiso', 'https://www.fundacioncompromiso.com/', 'Emprendimiento'],

  // Fundaciones educación
  ['Fundación Universia', 'https://www.fundacionuniversia.net/convocatorias/', 'Educación'],
  ['Fundación Barrié', 'https://www.fundacionbarrie.org/convocatorias', 'Educación'],
  ['Fundación Germán Sánchez Ruipérez', 'https://www.fundaciongsr.com/', 'Lectura'],

  // Fundaciones investigación
  ['Fundación Ramón Areces', 'https://www.fundacionareces.es/', 'Investigación'],
  ['Fundación Pro CNIC', 'https://www.cnic.es/', 'Investigación Cardiovascular'],
  ['Fundación Lilly', 'https://www.fundacionlilly.com/', 'Investigación Biomédica'],

  // Fundaciones infancia
  ['Fundación Aladina', 'https://www.fundacionaladina.org/', 'Infancia'],
  ['Fundación Pequeño Deseo', 'https://www.fpdeseo.org/', 'Infancia'],
  ['Fundación Educo', 'https://www.educo.org/', 'Infancia'],
  ['Save the Children España', 'https://www.savethechildren.es/ayudas', 'Infancia'],

  // Fundaciones cooperación
  ['Fundación Codespa', 'https://www.codespa.org/', 'Cooperación'],
  ['Fundación Ayuda en Acción', 'https://ayudaenaccion.org/', 'Cooperación'],
  ['Fundación ETEA', 'https://www.etea.com/', 'Desarrollo'],
];

let added = 0;
let skipped = 0;

const insertStmt = db.prepare(`
  INSERT INTO fundaciones (name, url, category, enabled, status)
  VALUES (?, ?, ?, 1, 'pending')
`);

for (const [name, url, category] of nuevasFundaciones) {
  try {
    // Verificar si ya existe
    const exists = db.prepare('SELECT id FROM fundaciones WHERE name = ?').get(name);

    if (exists) {
      console.log(`⏭️  Ya existe: ${name}`);
      skipped++;
    } else {
      insertStmt.run(name, url, category);
      console.log(`✅ Agregada: ${name} (${category})`);
      added++;
    }
  } catch (error) {
    console.error(`❌ Error con ${name}:`, error.message);
  }
}

console.log(`\n📊 Resumen:`);
console.log(`   ✅ Fundaciones agregadas: ${added}`);
console.log(`   ⏭️  Fundaciones existentes: ${skipped}`);
console.log(`   📈 Total en base de datos: ${db.prepare('SELECT COUNT(*) as count FROM fundaciones').get().count}`);

db.close();

import db from './database.js';

const fundaciones = db.prepare('SELECT COUNT(*) as count FROM fundaciones').get();
const sublinks = db.prepare('SELECT COUNT(*) as count FROM sublinks').get();
const changes = db.prepare('SELECT COUNT(*) as count FROM change_history').get();
const relevant = db.prepare("SELECT COUNT(*) as count FROM change_history WHERE status = 'relevant'").get();

console.log('  Fundaciones configuradas:', fundaciones.count);
console.log('  Sublinks descubiertos:', sublinks.count);
console.log('  Cambios detectados:', changes.count);
console.log('  Cambios relevantes (públicos):', relevant.count);

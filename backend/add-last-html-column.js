import db from './database.js';

console.log('Adding last_html column to tables...');

try {
  // Add last_html to fundaciones
  db.prepare(`ALTER TABLE fundaciones ADD COLUMN last_html TEXT`).run();
  console.log('✓ Added last_html to fundaciones');
} catch (error) {
  if (error.message.includes('duplicate column name')) {
    console.log('  last_html already exists in fundaciones');
  } else {
    console.error('Error adding last_html to fundaciones:', error.message);
  }
}

try {
  // Add last_html to entes_publicos
  db.prepare(`ALTER TABLE entes_publicos ADD COLUMN last_html TEXT`).run();
  console.log('✓ Added last_html to entes_publicos');
} catch (error) {
  if (error.message.includes('duplicate column name')) {
    console.log('  last_html already exists in entes_publicos');
  } else {
    console.error('Error adding last_html to entes_publicos:', error.message);
  }
}

try {
  // Add last_html to otras_fuentes
  db.prepare(`ALTER TABLE otras_fuentes ADD COLUMN last_html TEXT`).run();
  console.log('✓ Added last_html to otras_fuentes');
} catch (error) {
  if (error.message.includes('duplicate column name')) {
    console.log('  last_html already exists in otras_fuentes');
  } else {
    console.error('Error adding last_html to otras_fuentes:', error.message);
  }
}

console.log('Migration complete!');

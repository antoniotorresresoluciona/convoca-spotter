import db from './database.js';
import crypto from 'crypto';

// Limpiar todas las fuentes existentes
console.log('🗑️  Limpiando fuentes existentes...');
db.prepare('DELETE FROM change_history').run();
db.prepare('DELETE FROM sublinks').run();
db.prepare('DELETE FROM fundaciones').run();
db.prepare('DELETE FROM entes_publicos').run();
db.prepare('DELETE FROM otras_fuentes').run();

console.log('✓ Base de datos limpiada\n');

// URLs específicas del usuario organizadas por tipo
const userSources = {
  fundaciones: [
    { name: 'FP Diverse', url: 'https://fpdiverse.org/' },
    { name: 'FP Diverse DGrow', url: 'https://fpdiverse.org/dgrow/' },
    { name: 'Fundación Inocente Inocente', url: 'https://fundacioninocente.org/convocatoria-de-ayudas/convocatoria-de-proyectos-asistenciales-para-ninos-y-adolescentes-con-discapacidad-y-sus-familias-7' },
    { name: 'Fundación Bidafarma', url: 'https://www.bidafarma.es/web/bidafarma/inicio/-/asset_publisher/e3AxLbdsoTyU/content/la-fundaci%25C3%25B3n-bidafarma-lanza-la-vii-convocatoria-de-proyectos-de-innovaci%25C3%25B3n-social' },
    { name: 'Fundación Pelayo', url: 'https://www.grupopelayo.com/compromiso-social/fundacion-pelayo' },
    { name: 'Fundación Ibercaja', url: 'https://www.fundacionibercaja.es/convocatorias/' },
    { name: 'Fondation Carasso', url: 'https://www.fondationcarasso.org/es/convocatorias/' },
    { name: 'Fundación Carrefour', url: 'https://www.carrefour.es/grupo-carrefour/fundacion/convocatoria-de-ayudas/' },
    { name: 'Fundación Iberdrola', url: 'https://www.fundacioniberdrolaespana.org/accion-social/programa-social' },
    { name: 'Fundación Mapfre', url: 'https://www.fundacionmapfre.org/premios-ayudas/convocatorias/convocatoria-ayudas-proyectos-sociales/' },
    { name: 'Fundación Mutua Madrileña', url: 'https://www.fundacionmutua.es/accion-social/ayudas-proyectos-sociales/convocatoria-anual_PRESENTACION2024/bases/' },
    { name: 'Fundación Banco Sabadell', url: 'https://www.fundacionbancosabadell.com/convocatorias/' },
    { name: 'Fundación Tellus', url: 'https://fundaciontellus.org/convocatoria-horizonte-ods/' },
    { name: 'Fundación Banco Santander', url: 'https://www.fundacionbancosantander.com/es/accion-social/santander-ayuda' },
    { name: 'Reale Foundation', url: 'https://realefoundation.org/es/proyectos/enviar-un-proyecto.html' },
    { name: 'Fundación Michelin', url: 'https://www.fundacionmichelin.es/contacto/' },
    { name: 'Fundación Familia Torres', url: 'https://fundacionfamiliatorres.org/presenta-tu-proyecto/' },
    { name: 'Fundación Nemesio Diez', url: 'https://www.fundacionnemesiodiez.es/que-hacemos/' },
    { name: 'Fundación Adey', url: 'https://fundacionadey.org/formulario-entidades/' },
    { name: 'Fundación GMP', url: 'https://www.fundaciongmp.org/contacto/' },
    { name: 'Fundación EDP', url: 'https://www.fundacionedp.es/es/apoyos-y-colaboraciones/' },
    { name: 'Fundación AON', url: 'https://fundacionaon.es/' },
    { name: 'Fundación ACS', url: 'https://www.fundacionacs.com/' },
    { name: 'Fundación EDP España', url: 'https://www.fundacionedp.es/es/' },
    { name: 'Fundación GCO', url: 'https://fundaciongco.com/' },
  ],

  entes_publicos: [
    { name: 'Ministerio de Cultura - Becas y Ayudas', url: 'https://www.cultura.gob.es/servicios-al-ciudadano/catalogo/becas-ayudas-y-subvenciones/ayudas-y-subvenciones/industrias.html' },
    { name: 'Xunta de Galicia - Cultura', url: 'https://www.cultura.gal/es/axudas-subvencions-bolsas?field_asb_area_tematica_tid=85' },
    { name: 'Axudas Galicia', url: 'https://axudas.gal/es/buscar' },
    { name: 'Administración General del Estado', url: 'https://administracion.gob.es/pag_Home/atencionCiudadana/Actualidad-por-Ministerios.html' },
    { name: 'BOE - Búsqueda de Ayudas', url: 'https://www.boe.es/buscar/ayudas.php' },
    { name: 'Xunta de Galicia - Consejos de Gobierno', url: 'https://www.xunta.gal/consellos-de-goberno' },
    { name: 'Xunta de Galicia - Notas de Prensa', url: 'https://www.xunta.gal/es/notas-de-prensa' },
  ],

  otras_fuentes: [
    { name: 'Diagram Consultores', url: 'https://www.diagramconsultores.com/convocatorias-subvenciones-y-financiaciones-publicas-y-privadas/' },
    { name: 'Las Fundaciones', url: 'https://lasfundaciones.com/category/convocatorias/' },
    { name: 'Dilu Consultores', url: 'https://diluconsultores.com/boletines-informativos/' },
    { name: 'Algalia', url: 'https://algalia.com/es/axudas/' },
    { name: 'Compromiso RSE', url: 'https://www.compromisorse.com/' },
    { name: 'Iberley Subvenciones', url: 'https://www.iberley.es/subvenciones' },
    { name: 'Portal Fundaciones.org', url: 'https://www.fundaciones.org/es/sector-fundacional/convocatorias-y-ayudas' },
  ]
};

// Insertar fundaciones
console.log('📝 Añadiendo fundaciones...');
const insertFundacion = db.prepare(`
  INSERT INTO fundaciones (id, name, url, category, enabled)
  VALUES (?, ?, ?, ?, 1)
`);

for (const fund of userSources.fundaciones) {
  const id = crypto.randomBytes(16).toString('hex');
  insertFundacion.run(id, fund.name, fund.url, 'Convocatorias');
  console.log(`  ✓ ${fund.name}`);
}

// Insertar entes públicos
console.log('\n🏛️  Añadiendo entes públicos...');
const insertEnte = db.prepare(`
  INSERT INTO entes_publicos (id, name, url, category, enabled)
  VALUES (?, ?, ?, ?, 1)
`);

for (const ente of userSources.entes_publicos) {
  const id = crypto.randomBytes(16).toString('hex');
  insertEnte.run(id, ente.name, ente.url, 'Ayudas Públicas');
  console.log(`  ✓ ${ente.name}`);
}

// Insertar otras fuentes
console.log('\n📰 Añadiendo otras fuentes...');
const insertOtra = db.prepare(`
  INSERT INTO otras_fuentes (id, name, url, category, enabled)
  VALUES (?, ?, ?, ?, 1)
`);

for (const otra of userSources.otras_fuentes) {
  const id = crypto.randomBytes(16).toString('hex');
  insertOtra.run(id, otra.name, otra.url, 'Agregadores');
  console.log(`  ✓ ${otra.name}`);
}

console.log('\n✅ Configuración completada!');
console.log(`Total fundaciones: ${userSources.fundaciones.length}`);
console.log(`Total entes públicos: ${userSources.entes_publicos.length}`);
console.log(`Total otras fuentes: ${userSources.otras_fuentes.length}`);
console.log(`\nTotal fuentes: ${userSources.fundaciones.length + userSources.entes_publicos.length + userSources.otras_fuentes.length}`);

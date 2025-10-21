import { crawlAllPendingSublinks } from './scraper.js';

console.log('🚀 Iniciando crawl COMPLETO de todas las fuentes...\n');

try {
  const results = await crawlAllPendingSublinks({
    maxSublinks: 1000,      // Sin límite práctico
    maxPerFundacion: 100,   // Sin límite práctico
    detectChangesFlag: true, // Detectar cambios
    updateDb: true
  });

  console.log('\n✅ Crawl completado!');
  console.log('\nAhora ejecuta de nuevo para detectar cambios en futuras ejecuciones.');
} catch (error) {
  console.error('❌ Error:', error);
}

#!/usr/bin/env node
import { monitorAll, monitorFundaciones, monitorEntesPublicos, monitorOtrasFuentes } from './monitor.js';

const command = process.argv[2] || 'all';

async function main() {
  try {
    switch (command) {
      case 'all':
        await monitorAll();
        break;
      case 'fundaciones':
        await monitorFundaciones();
        break;
      case 'entes':
        await monitorEntesPublicos();
        break;
      case 'fuentes':
        await monitorOtrasFuentes();
        break;
      case 'help':
        console.log(`
Uso: node cli.js [comando]

Comandos:
  all         - Monitorear todas las fuentes (por defecto)
  fundaciones - Monitorear solo fundaciones
  entes       - Monitorear solo entes públicos
  fuentes     - Monitorear solo otras fuentes
  help        - Mostrar esta ayuda

Ejemplos:
  node cli.js
  node cli.js all
  node cli.js fundaciones
        `);
        break;
      default:
        console.error(`Comando desconocido: ${command}`);
        console.log('Usa "node cli.js help" para ver los comandos disponibles');
        process.exit(1);
    }
  } catch (error) {
    console.error('Error ejecutando monitoreo:', error);
    process.exit(1);
  }
}

main();

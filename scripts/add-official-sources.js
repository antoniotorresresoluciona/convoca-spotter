#!/usr/bin/env node

/**
 * Script para añadir fuentes públicas oficiales al sistema
 * BOE, DOGA y BOPs de Galicia
 */

const entesPublicos = [
  {
    name: "BOE - Boletín Oficial del Estado",
    url: "https://www.boe.es/",
    category: "Nacional",
    entity: "Gobierno de España",
    enabled: true,
    status: "pending",
    sublinks: [
      {
        url: "https://www.boe.es/diario_boe/",
        link_text: "Diario del BOE",
        enabled: true
      },
      {
        url: "https://www.boe.es/buscar/doc.php?coleccion=iberlex",
        link_text: "Legislación consolidada",
        enabled: true
      },
      {
        url: "https://www.boe.es/legislacion/codigos/",
        link_text: "Códigos electrónicos",
        enabled: true
      }
    ]
  },
  {
    name: "DOGA - Diario Oficial de Galicia",
    url: "https://www.xunta.gal/diario-oficial-galicia",
    category: "Autonómico",
    entity: "Xunta de Galicia",
    enabled: true,
    status: "pending",
    sublinks: [
      {
        url: "https://www.xunta.gal/dog",
        link_text: "Buscador DOG",
        enabled: true
      },
      {
        url: "https://www.xunta.gal/diario-oficial-galicia/secciones",
        link_text: "Secciones DOG",
        enabled: true
      }
    ]
  },
  {
    name: "BOP A Coruña",
    url: "https://bop.dicoruna.es/",
    category: "Provincial",
    entity: "Diputación de A Coruña",
    enabled: true,
    status: "pending",
    sublinks: [
      {
        url: "https://bop.dicoruna.es/bop/faces/bop",
        link_text: "Consulta BOP",
        enabled: true
      },
      {
        url: "https://bop.dicoruna.es/bop/faces/suscripciones",
        link_text: "Suscripciones",
        enabled: true
      }
    ]
  },
  {
    name: "BOP Lugo",
    url: "https://www.deputacionlugo.gal/gl/bop",
    category: "Provincial",
    entity: "Diputación de Lugo",
    enabled: true,
    status: "pending",
    sublinks: [
      {
        url: "https://www.deputacionlugo.gal/gl/bop/consulta",
        link_text: "Consulta BOP",
        enabled: true
      },
      {
        url: "https://www.deputacionlugo.gal/gl/bop/ultimos-boletines",
        link_text: "Últimos boletines",
        enabled: true
      }
    ]
  },
  {
    name: "BOP Ourense",
    url: "https://bop.depourense.es/",
    category: "Provincial",
    entity: "Diputación de Ourense",
    enabled: true,
    status: "pending",
    sublinks: [
      {
        url: "https://bop.depourense.es/public/bopViewer.xhtml",
        link_text: "Visor BOP",
        enabled: true
      },
      {
        url: "https://bop.depourense.es/public/search.xhtml",
        link_text: "Buscador",
        enabled: true
      }
    ]
  },
  {
    name: "BOP Pontevedra",
    url: "https://bop.depo.gal/",
    category: "Provincial",
    entity: "Diputación de Pontevedra",
    enabled: true,
    status: "pending",
    sublinks: [
      {
        url: "https://bop.depo.gal/search",
        link_text: "Buscador BOP",
        enabled: true
      },
      {
        url: "https://bop.depo.gal/ultimos-boletines",
        link_text: "Últimos boletines",
        enabled: true
      }
    ]
  }
];

async function insertEntesPublicos() {
  const API_URL = 'http://localhost:3000';

  console.log('🚀 Iniciando inserción de entes públicos oficiales...\n');

  for (const ente of entesPublicos) {
    try {
      console.log(`📝 Insertando: ${ente.name}`);

      // Crear el ente público
      const response = await fetch(`${API_URL}/rest/v1/entes_publicos`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Prefer': 'return=representation'
        },
        body: JSON.stringify({
          name: ente.name,
          url: ente.url,
          category: ente.category,
          entity: ente.entity,
          enabled: ente.enabled ? 1 : 0,
          status: ente.status || null
        })
      });

      if (!response.ok) {
        const error = await response.text();
        console.error(`❌ Error al crear ${ente.name}:`, error);
        continue;
      }

      const createdEnte = await response.json();
      const enteId = Array.isArray(createdEnte) ? createdEnte[0].id : createdEnte.id;

      console.log(`   ✓ Ente creado con ID: ${enteId}`);

      // Insertar sublinks
      if (ente.sublinks && ente.sublinks.length > 0) {
        console.log(`   📎 Insertando ${ente.sublinks.length} subenlaces...`);

        for (const sublink of ente.sublinks) {
          const sublinkResponse = await fetch(`${API_URL}/rest/v1/sublinks`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              url: sublink.url,
              link_text: sublink.link_text,
              enabled: sublink.enabled ? 1 : 0,
              ente_publico_id: enteId,
              status: 'pending'
            })
          });

          if (sublinkResponse.ok) {
            console.log(`      ✓ Subenlace: ${sublink.link_text}`);
          } else {
            console.error(`      ❌ Error en subenlace: ${sublink.link_text}`);
          }
        }
      }

      console.log(`   ✅ ${ente.name} completado\n`);

    } catch (error) {
      console.error(`❌ Error procesando ${ente.name}:`, error.message);
    }
  }

  console.log('✨ Proceso completado!');
}

insertEntesPublicos().catch(console.error);

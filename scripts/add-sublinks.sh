#!/bin/bash

# Script para añadir sublinks a los entes públicos oficiales

# Obtener IDs de los entes
BOE_ID=$(curl -s "http://localhost:3000/rest/v1/entes_publicos?name=eq.BOE - Boletín Oficial del Estado&select=id" | python3 -c "import sys, json; data=json.load(sys.stdin); print(data[0]['id'] if data else '')")
DOGA_ID=$(curl -s "http://localhost:3000/rest/v1/entes_publicos?name=eq.DOGA - Diario Oficial de Galicia&select=id" | python3 -c "import sys, json; data=json.load(sys.stdin); print(data[0]['id'] if data else '')")
BOP_CORUNA_ID=$(curl -s "http://localhost:3000/rest/v1/entes_publicos?name=eq.BOP A Coruña&select=id" | python3 -c "import sys, json; data=json.load(sys.stdin); print(data[0]['id'] if data else '')")
BOP_LUGO_ID=$(curl -s "http://localhost:3000/rest/v1/entes_publicos?name=eq.BOP Lugo&select=id" | python3 -c "import sys, json; data=json.load(sys.stdin); print(data[0]['id'] if data else '')")
BOP_OURENSE_ID=$(curl -s "http://localhost:3000/rest/v1/entes_publicos?name=eq.BOP Ourense&select=id" | python3 -c "import sys, json; data=json.load(sys.stdin); print(data[0]['id'] if data else '')")
BOP_PONTEVEDRA_ID=$(curl -s "http://localhost:3000/rest/v1/entes_publicos?name=eq.BOP Pontevedra&select=id" | python3 -c "import sys, json; data=json.load(sys.stdin); print(data[0]['id'] if data else '')")

echo "📝 Insertando sublinks para BOE (ID: $BOE_ID)..."
curl -X POST "http://localhost:3000/rest/v1/sublinks" -H "Content-Type: application/json" -d "{\"url\":\"https://www.boe.es/diario_boe/\",\"link_text\":\"Diario del BOE\",\"enabled\":1,\"ente_publico_id\":\"$BOE_ID\",\"status\":\"pending\"}"
curl -X POST "http://localhost:3000/rest/v1/sublinks" -H "Content-Type: application/json" -d "{\"url\":\"https://www.boe.es/buscar/doc.php?coleccion=iberlex\",\"link_text\":\"Legislación consolidada\",\"enabled\":1,\"ente_publico_id\":\"$BOE_ID\",\"status\":\"pending\"}"
curl -X POST "http://localhost:3000/rest/v1/sublinks" -H "Content-Type: application/json" -d "{\"url\":\"https://www.boe.es/legislacion/codigos/\",\"link_text\":\"Códigos electrónicos\",\"enabled\":1,\"ente_publico_id\":\"$BOE_ID\",\"status\":\"pending\"}"

echo "📝 Insertando sublinks para DOGA (ID: $DOGA_ID)..."
curl -X POST "http://localhost:3000/rest/v1/sublinks" -H "Content-Type: application/json" -d "{\"url\":\"https://www.xunta.gal/dog\",\"link_text\":\"Buscador DOG\",\"enabled\":1,\"ente_publico_id\":\"$DOGA_ID\",\"status\":\"pending\"}"
curl -X POST "http://localhost:3000/rest/v1/sublinks" -H "Content-Type: application/json" -d "{\"url\":\"https://www.xunta.gal/diario-oficial-galicia/secciones\",\"link_text\":\"Secciones DOG\",\"enabled\":1,\"ente_publico_id\":\"$DOGA_ID\",\"status\":\"pending\"}"

echo "📝 Insertando sublinks para BOP A Coruña (ID: $BOP_CORUNA_ID)..."
curl -X POST "http://localhost:3000/rest/v1/sublinks" -H "Content-Type: application/json" -d "{\"url\":\"https://bop.dicoruna.es/bop/faces/bop\",\"link_text\":\"Consulta BOP\",\"enabled\":1,\"ente_publico_id\":\"$BOP_CORUNA_ID\",\"status\":\"pending\"}"

echo "📝 Insertando sublinks para BOP Lugo (ID: $BOP_LUGO_ID)..."
curl -X POST "http://localhost:3000/rest/v1/sublinks" -H "Content-Type: application/json" -d "{\"url\":\"https://www.deputacionlugo.gal/gl/bop/consulta\",\"link_text\":\"Consulta BOP\",\"enabled\":1,\"ente_publico_id\":\"$BOP_LUGO_ID\",\"status\":\"pending\"}"

echo "📝 Insertando sublinks para BOP Ourense (ID: $BOP_OURENSE_ID)..."
curl -X POST "http://localhost:3000/rest/v1/sublinks" -H "Content-Type: application/json" -d "{\"url\":\"https://bop.depourense.es/public/bopViewer.xhtml\",\"link_text\":\"Visor BOP\",\"enabled\":1,\"ente_publico_id\":\"$BOP_OURENSE_ID\",\"status\":\"pending\"}"

echo "📝 Insertando sublinks para BOP Pontevedra (ID: $BOP_PONTEVEDRA_ID)..."
curl -X POST "http://localhost:3000/rest/v1/sublinks" -H "Content-Type: application/json" -d "{\"url\":\"https://bop.depo.gal/search\",\"link_text\":\"Buscador BOP\",\"enabled\":1,\"ente_publico_id\":\"$BOP_PONTEVEDRA_ID\",\"status\":\"pending\"}"

echo ""
echo "✅ Sublinks insertados correctamente"

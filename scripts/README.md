# 📚 Scripts de Convoca Spotter

Colección de scripts para gestionar y mantener el sistema Convoca Spotter.

## 🎯 Scripts Disponibles

### 1. `add-official-sources.js`
Añade fuentes públicas oficiales al sistema.

```bash
node add-official-sources.js
```

**Fuentes que añade:**
- BOE - Boletín Oficial del Estado
- DOGA - Diario Oficial de Galicia  
- BOPs de Galicia (A Coruña, Lugo, Ourense, Pontevedra)

---

### 2. `bulk-load-fundaciones.js`
Carga masiva de fundaciones desde archivos CSV o JSON.

```bash
# Desde CSV
node bulk-load-fundaciones.js fundaciones.csv

# Desde JSON
node bulk-load-fundaciones.js fundaciones.json
```

**Formato CSV:**
```csv
name,url,category
Fundación BBVA,https://www.fbbva.es/,Financiera
Fundación Telefónica,https://www.fundaciontelefonica.com/,General
```

**Formato JSON:**
```json
[
  {"name": "Fundación BBVA", "url": "https://...", "category": "Financiera"}
]
```

**Características:**
- Procesa en lotes de 100
- Velocidad: ~50-100 fundaciones/segundo
- Manejo de errores robusto
- Reporte detallado

---

### 3. `optimize-database.sql`
Optimiza la base de datos creando índices y configurando parámetros.

```bash
sqlite3 ../backend/data/database.db < optimize-database.sql
```

**Qué hace:**
- ✅ Crea 30+ índices optimizados
- ✅ Ejecuta ANALYZE (actualiza estadísticas)
- ✅ Ejecuta VACUUM (compacta la BD)
- ✅ Configura WAL mode (mejor concurrencia)
- ✅ Optimiza parámetros de rendimiento

**Cuándo ejecutar:**
- Después de cargar > 1,000 fundaciones
- Mensualmente (como mantenimiento)
- Cuando notes degradación de rendimiento

---

### 4. `add-sublinks.sh`
Añade sublinks a los entes públicos oficiales.

```bash
bash add-sublinks.sh
```

---

## 📊 Ejemplos de Uso

### Escenario 1: Setup Inicial

```bash
# 1. Añadir fuentes oficiales
node add-official-sources.js

# 2. Cargar fundaciones desde CSV
node bulk-load-fundaciones.js fundaciones.csv

# 3. Optimizar base de datos
sqlite3 ../backend/data/database.db < optimize-database.sql
```

### Escenario 2: Añadir 11,000 Fundaciones

```bash
# 1. Preparar archivo CSV con 11,000 fundaciones
# 2. Ejecutar carga masiva
node bulk-load-fundaciones.js fundaciones-11k.csv

# 3. Esperar ~180-220 segundos
# 4. Optimizar base de datos
sqlite3 ../backend/data/database.db < optimize-database.sql
```

### Escenario 3: Mantenimiento Mensual

```bash
# Compactar y optimizar
sqlite3 ../backend/data/database.db < optimize-database.sql

# Verificar estadísticas
sqlite3 ../backend/data/database.db "SELECT COUNT(*) FROM fundaciones WHERE enabled=1;"
```

---

## 🔧 Troubleshooting

### Error: "FOREIGN KEY constraint failed"
Verifica que la API esté corriendo:
```bash
curl http://localhost:3000/rest/v1/fundaciones
```

### Error: "Archivo no encontrado"
Verifica la ruta del archivo:
```bash
ls -la fundaciones.csv
```

### Script muy lento
Reduce el tamaño del lote editando `BATCH_SIZE` en el script.

---

## 📈 Rendimiento

| Operación | Tiempo | Notas |
|-----------|--------|-------|
| Cargar 100 fundaciones | ~2-5s | |
| Cargar 1,000 fundaciones | ~20-30s | |
| Cargar 11,000 fundaciones | ~180-220s | ~3-4 minutos |
| Optimizar BD | ~5-10s | |

---

**Ver también:** `/docs/ESCALABILIDAD.md` para documentación completa.

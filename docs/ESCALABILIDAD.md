# 📊 Sistema Escalable para 11,000+ Fundaciones

Este documento describe la arquitectura y optimizaciones implementadas para soportar hasta 11,000 fundaciones y sus subenlaces en el sistema Convoca Spotter.

## 🎯 Objetivos Cumplidos

✅ **Entes Públicos Oficiales Activados:**
- BOE - Boletín Oficial del Estado
- DOGA - Diario Oficial de Galicia
- BOP A Coruña
- BOP Lugo
- BOP Ourense
- BOP Pontevedra

✅ **Optimizaciones de Base de Datos:**
- Índices optimizados para consultas rápidas
- Configuración WAL (Write-Ahead Logging) para mejor concurrencia
- Índices compuestos para filtros comunes

✅ **Sistema de Carga Masiva:**
- Script de carga por lotes (100 fundaciones/lote)
- Soporte para CSV y JSON
- Manejo de errores robusto

---

## 🗂️ Arquitectura de Base de Datos

### Tablas Principales

```
fundaciones/
├── 11,000+ fundaciones
├── sublinks (relación 1:N)
└── change_history (historial de cambios)

entes_publicos/
├── 13 entes oficiales
├── sublinks (relación 1:N)
└── change_history

otras_fuentes/
├── Fuentes adicionales
├── sublinks (relación 1:N)
└── change_history
```

### Índices Creados

#### Fundaciones
- `idx_fundaciones_enabled` - Filtro por estado activo/inactivo
- `idx_fundaciones_status` - Filtro por status (updated/unchanged/pending)
- `idx_fundaciones_category` - Filtro por categoría
- `idx_fundaciones_enabled_category` - Filtro compuesto (común en UI)
- `idx_fundaciones_last_checked` - Ordenamiento por fecha de revisión
- `idx_fundaciones_name` - Búsquedas por nombre (case-insensitive)

#### Sublinks
- `idx_sublinks_fundacion_id` - Joins con fundaciones
- `idx_sublinks_enabled` - Filtro por estado
- `idx_sublinks_fundacion_enabled` - Filtro compuesto optimizado

#### Change History
- `idx_changes_fundacion_id` - Consultas por fundación
- `idx_changes_detected_at` - Ordenamiento temporal
- `idx_changes_reviewed` - Filtro por revisados/no revisados
- `idx_changes_reviewed_detected` - Filtro compuesto para dashboard

---

## 🚀 Scripts de Mantenimiento

### 1. Optimización de Base de Datos

```bash
# Ejecutar optimización completa
sqlite3 backend/data/database.db < scripts/optimize-database.sql
```

**Este script:**
- Crea todos los índices necesarios
- Ejecuta ANALYZE para actualizar estadísticas
- Ejecuta VACUUM para compactar la BD
- Configura parámetros de rendimiento

### 2. Carga Masiva de Fundaciones

#### Formato CSV
```csv
name,url,category
Fundación BBVA,https://www.fbbva.es/convocatorias/,Financiera
Fundación Telefónica,https://www.fundaciontelefonica.com/convocatorias/,General
```

#### Formato JSON
```json
[
  {
    "name": "Fundación BBVA",
    "url": "https://www.fbbva.es/convocatorias/",
    "category": "Financiera"
  },
  {
    "name": "Fundación Telefónica",
    "url": "https://www.fundaciontelefonica.com/convocatorias/",
    "category": "General"
  }
]
```

#### Uso
```bash
# Desde CSV
node scripts/bulk-load-fundaciones.js fundaciones.csv

# Desde JSON
node scripts/bulk-load-fundaciones.js fundaciones.json
```

**Características:**
- Procesamiento por lotes de 100 fundaciones
- 100ms de delay entre lotes (evita saturar el servidor)
- Manejo de errores por fundación
- Reporte detallado de éxito/falla
- Velocidad aproximada: 50-100 fundaciones/segundo

---

## 📈 Rendimiento Esperado

### Con 11,000 Fundaciones

| Operación | Tiempo Aproximado | Notas |
|-----------|-------------------|-------|
| Listar fundaciones (paginadas) | < 100ms | Con índices |
| Filtrar por categoría | < 50ms | Índice compuesto |
| Buscar por nombre | < 200ms | LIKE query con índice |
| Insertar fundación | < 10ms | Individual |
| Carga masiva 1,000 fundaciones | 10-20s | En lotes |
| Carga masiva 11,000 fundaciones | 110-220s | En lotes |

### Configuración de SQLite

```sql
PRAGMA journal_mode = WAL;        -- Escrituras no bloquean lecturas
PRAGMA synchronous = NORMAL;      -- Balance rendimiento/seguridad
PRAGMA cache_size = -64000;       -- 64MB de cache en RAM
PRAGMA temp_store = MEMORY;       -- Tablas temp en memoria
PRAGMA mmap_size = 30000000000;   -- 30GB memory-mapped I/O
PRAGMA page_size = 4096;          -- Tamaño óptimo de página
```

---

## 🔄 Paginación del Lado del Servidor

### APIs Actuales

Las APIs ya soportan paginación mediante parámetros de PostgREST:

```http
GET /rest/v1/fundaciones?limit=50&offset=0
GET /rest/v1/fundaciones?limit=50&offset=50&order=name.asc
GET /rest/v1/fundaciones?enabled=eq.1&limit=100
```

### Ejemplo de Implementación en el Frontend

```typescript
async function getFundacionesPaginadas(page: number, limit: number = 50) {
  const offset = (page - 1) * limit;
  const response = await fetch(
    `${API_URL}/rest/v1/fundaciones?limit=${limit}&offset=${offset}&order=name.asc`
  );
  return await response.json();
}
```

---

## 💡 Mejores Prácticas

### 1. Carga de Datos
- ✅ Usar scripts de carga masiva para > 100 fundaciones
- ✅ Procesar en lotes de 100
- ✅ Incluir delay entre lotes (100-200ms)
- ✅ Validar datos antes de cargar
- ❌ No insertar una por una en la UI para grandes volúmenes

### 2. Consultas
- ✅ Siempre usar `enabled=eq.1` para filtrar activos
- ✅ Usar paginación con `limit` y `offset`
- ✅ Incluir `order` para resultados consistentes
- ✅ Usar índices compuestos cuando sea posible
- ❌ Evitar consultas sin filtros con 11,000+ registros

### 3. Mantenimiento
- ✅ Ejecutar `ANALYZE` mensualmente
- ✅ Ejecutar `VACUUM` trimestralmente
- ✅ Monitorear tamaño de la base de datos
- ✅ Hacer backups antes de cargas masivas

---

## 🔧 Solución de Problemas

### Base de datos lenta

```bash
# 1. Verificar índices
sqlite3 backend/data/database.db "SELECT name FROM sqlite_master WHERE type='index';"

# 2. Analizar estadísticas
sqlite3 backend/data/database.db "ANALYZE;"

# 3. Compactar
sqlite3 backend/data/database.db "VACUUM;"
```

### Errores en carga masiva

```bash
# Verificar conexión a la API
curl http://localhost:3000/rest/v1/fundaciones

# Ver últimos errores en logs
tail -f backend/logs/api.log
```

### Rendimiento degradado

1. Verificar tamaño de la base de datos:
   ```bash
   du -h backend/data/database.db
   ```

2. Verificar uso de índices:
   ```sql
   EXPLAIN QUERY PLAN SELECT * FROM fundaciones WHERE enabled=1;
   ```

3. Revisar configuración de PRAGMA:
   ```sql
   PRAGMA journal_mode;
   PRAGMA cache_size;
   ```

---

## 📊 Monitoreo

### Métricas Clave

```sql
-- Total de fundaciones activas
SELECT COUNT(*) FROM fundaciones WHERE enabled=1;

-- Fundaciones por categoría
SELECT category, COUNT(*) as total
FROM fundaciones
WHERE enabled=1
GROUP BY category
ORDER BY total DESC;

-- Sublinks por fundación (promedio)
SELECT AVG(sublink_count) as avg_sublinks
FROM (
  SELECT fundacion_id, COUNT(*) as sublink_count
  FROM sublinks
  WHERE enabled=1
  GROUP BY fundacion_id
);

-- Cambios detectados últimos 7 días
SELECT DATE(detected_at) as fecha, COUNT(*) as cambios
FROM change_history
WHERE detected_at > datetime('now', '-7 days')
GROUP BY DATE(detected_at)
ORDER BY fecha DESC;
```

---

## 🎓 Recursos Adicionales

- [Documentación de PostgREST](https://postgrest.org/en/stable/)
- [SQLite Performance Tuning](https://www.sqlite.org/optoverview.html)
- [Write-Ahead Logging](https://www.sqlite.org/wal.html)

---

## 📝 Historial de Cambios

### 2025-10-14
- ✅ Añadidos 6 entes públicos oficiales (BOE, DOGA, BOPs Galicia)
- ✅ Creados índices optimizados para 11,000+ fundaciones
- ✅ Implementado script de carga masiva
- ✅ Configuración WAL para mejor concurrencia
- ✅ Documentación completa del sistema escalable

---

**Mantenido por:** Equipo Convoca Spotter
**Última actualización:** 14 de Octubre de 2025

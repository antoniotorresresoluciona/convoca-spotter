-- Script de optimización de base de datos para escalar a 11,000+ fundaciones
-- Este script crea índices optimizados para mejorar el rendimiento

-- ===================================================================
-- ÍNDICES PARA FUNDACIONES
-- ===================================================================

-- Índice para búsquedas por enabled (filtro muy común)
CREATE INDEX IF NOT EXISTS idx_fundaciones_enabled ON fundaciones(enabled);

-- Índice para búsquedas por status
CREATE INDEX IF NOT EXISTS idx_fundaciones_status ON fundaciones(status);

-- Índice para búsquedas por category (filtros en la UI)
CREATE INDEX IF NOT EXISTS idx_fundaciones_category ON fundaciones(category);

-- Índice compuesto para filtros comunes (enabled + category)
CREATE INDEX IF NOT EXISTS idx_fundaciones_enabled_category ON fundaciones(enabled, category);

-- Índice para ordenar por last_checked
CREATE INDEX IF NOT EXISTS idx_fundaciones_last_checked ON fundaciones(last_checked DESC);

-- Índice para búsquedas por nombre (LIKE queries)
CREATE INDEX IF NOT EXISTS idx_fundaciones_name ON fundaciones(name COLLATE NOCASE);

-- ===================================================================
-- ÍNDICES PARA ENTES PÚBLICOS
-- ===================================================================

CREATE INDEX IF NOT EXISTS idx_entes_enabled ON entes_publicos(enabled);
CREATE INDEX IF NOT EXISTS idx_entes_status ON entes_publicos(status);
CREATE INDEX IF NOT EXISTS idx_entes_category ON entes_publicos(category);
CREATE INDEX IF NOT EXISTS idx_entes_enabled_category ON entes_publicos(enabled, category);
CREATE INDEX IF NOT EXISTS idx_entes_last_checked ON entes_publicos(last_checked DESC);
CREATE INDEX IF NOT EXISTS idx_entes_name ON entes_publicos(name COLLATE NOCASE);
CREATE INDEX IF NOT EXISTS idx_entes_entity ON entes_publicos(entity);

-- ===================================================================
-- ÍNDICES PARA OTRAS FUENTES
-- ===================================================================

CREATE INDEX IF NOT EXISTS idx_fuentes_enabled ON otras_fuentes(enabled);
CREATE INDEX IF NOT EXISTS idx_fuentes_status ON otras_fuentes(status);
CREATE INDEX IF NOT EXISTS idx_fuentes_category ON otras_fuentes(category);
CREATE INDEX IF NOT EXISTS idx_fuentes_type ON otras_fuentes(type);
CREATE INDEX IF NOT EXISTS idx_fuentes_enabled_category ON otras_fuentes(enabled, category);
CREATE INDEX IF NOT EXISTS idx_fuentes_last_checked ON otras_fuentes(last_checked DESC);
CREATE INDEX IF NOT EXISTS idx_fuentes_name ON otras_fuentes(name COLLATE NOCASE);

-- ===================================================================
-- ÍNDICES PARA SUBLINKS
-- ===================================================================

-- Índice para joins con fundaciones
CREATE INDEX IF NOT EXISTS idx_sublinks_fundacion_id ON sublinks(fundacion_id) WHERE fundacion_id IS NOT NULL;

-- Índice para joins con entes públicos
CREATE INDEX IF NOT EXISTS idx_sublinks_ente_id ON sublinks(ente_publico_id) WHERE ente_publico_id IS NOT NULL;

-- Índice para joins con otras fuentes
CREATE INDEX IF NOT EXISTS idx_sublinks_fuente_id ON sublinks(otra_fuente_id) WHERE otra_fuente_id IS NOT NULL;

-- Índice para filtrar sublinks activos
CREATE INDEX IF NOT EXISTS idx_sublinks_enabled ON sublinks(enabled);

-- Índice para filtrar por status
CREATE INDEX IF NOT EXISTS idx_sublinks_status ON sublinks(status);

-- Índice compuesto para consultas comunes
CREATE INDEX IF NOT EXISTS idx_sublinks_fundacion_enabled ON sublinks(fundacion_id, enabled) WHERE fundacion_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_sublinks_ente_enabled ON sublinks(ente_publico_id, enabled) WHERE ente_publico_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_sublinks_fuente_enabled ON sublinks(otra_fuente_id, enabled) WHERE otra_fuente_id IS NOT NULL;

-- ===================================================================
-- ÍNDICES PARA CHANGE_HISTORY
-- ===================================================================

-- Índice para consultas por fundacion_id
CREATE INDEX IF NOT EXISTS idx_changes_fundacion_id ON change_history(fundacion_id) WHERE fundacion_id IS NOT NULL;

-- Índice para consultas por sublink_id
CREATE INDEX IF NOT EXISTS idx_changes_sublink_id ON change_history(sublink_id) WHERE sublink_id IS NOT NULL;

-- Índice para ordenar por fecha de detección
CREATE INDEX IF NOT EXISTS idx_changes_detected_at ON change_history(detected_at DESC);

-- Índice para filtrar por reviewed
CREATE INDEX IF NOT EXISTS idx_changes_reviewed ON change_history(reviewed);

-- Índice compuesto para consultas de cambios no revisados
CREATE INDEX IF NOT EXISTS idx_changes_reviewed_detected ON change_history(reviewed, detected_at DESC);

-- ===================================================================
-- OPTIMIZACIÓN DE SQLITE
-- ===================================================================

-- Analizar todas las tablas para actualizar estadísticas del optimizador
ANALYZE;

-- Compactar la base de datos
VACUUM;

-- Configurar parámetros de rendimiento
PRAGMA journal_mode = WAL;  -- Write-Ahead Logging para mejor concurrencia
PRAGMA synchronous = NORMAL; -- Balance entre rendimiento y seguridad
PRAGMA cache_size = -64000;  -- 64MB de cache
PRAGMA temp_store = MEMORY;  -- Usar memoria para tablas temporales
PRAGMA mmap_size = 30000000000;  -- 30GB de memory-mapped I/O
PRAGMA page_size = 4096;  -- Tamaño de página óptimo

-- Verificar que los índices se crearon correctamente
SELECT 'ÍNDICES CREADOS:' as info;
SELECT name, tbl_name, sql FROM sqlite_master WHERE type='index' AND name LIKE 'idx_%' ORDER BY tbl_name, name;

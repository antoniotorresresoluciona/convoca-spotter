# 🎨 Guía de Migración del Frontend

## Arquitectura de la Solución

Tu frontend React actual está diseñado para conectar con tu backend custom en `http://192.168.255.117:3000`. Para mantener el frontend funcionando sin cambios, he creado un **Backend Adapter** que traduce entre la API de changedetection.io y la API original.

```
┌──────────────────────────────────────────────────────────────┐
│                    ARQUITECTURA FRONTEND                      │
└──────────────────────────────────────────────────────────────┘

Frontend React (sin cambios)
         │
         │ HTTP requests: /api/*, /rest/v1/*
         ▼
Frontend Adapter (Node.js)
  ├─ Mantiene API original
  ├─ Login: POST /rest/v1/rpc/login_admin
  ├─ Fundaciones: GET /rest/v1/fundaciones
  ├─ Entes: GET /rest/v1/entes_publicos
  ├─ Fuentes: GET /rest/v1/otras_fuentes
  └─ History: GET /rest/v1/change_history
         │
         │ Traduce y hace requests a changedetection.io API
         ▼
changedetection.io
  └─ GET/POST /api/v1/watch
```

## Ventajas de Esta Arquitectura

✅ **Sin cambios en el frontend** - Tu código React sigue igual
✅ **Compatible con API original** - Todos los endpoints funcionan
✅ **Escalable** - Adapter con 2+ réplicas
✅ **Flexible** - Puedes añadir lógica custom en el adapter
✅ **Fácil rollback** - Si falla, vuelve al backend original

---

## Archivos Creados

### 1. `k8s/frontend-adapter.yaml`

Contiene:
- **Namespace:** `convoca-frontend`
- **Frontend Adapter:** Servicio Node.js que traduce APIs (2 réplicas)
- **Frontend Static:** Deployment de React build con NGINX (2 réplicas)
- **Ingress:** Exposición pública del frontend

### 2. `Dockerfile.frontend`

Dockerfile multi-stage optimizado para:
- Build del frontend con Vite
- Servir estático con NGINX
- Proxy automático de /api y /rest al adapter

---

## Despliegue Paso a Paso

### Opción A: Usando Manifiestos K8s (Recomendado)

#### 1. Personalizar Configuración

```bash
# Editar dominio en frontend-adapter.yaml
vim k8s/frontend-adapter.yaml

# Cambiar líneas:
# - 545: host: convoca-app.TUDOMINIO.com
# - 548: secretName: frontend-tls
```

#### 2. Desplegar Frontend Adapter

```bash
# Aplicar manifiestos
kubectl apply -f k8s/frontend-adapter.yaml

# Verificar despliegue
kubectl -n convoca-frontend get pods

# Esperar a que estén ready
kubectl -n convoca-frontend wait --for=condition=ready pod -l app=frontend-adapter --timeout=120s
```

#### 3. Verificar Adapter

```bash
# Port-forward temporal
kubectl -n convoca-frontend port-forward svc/frontend-adapter 3000:3000

# Probar endpoints
curl http://localhost:3000/api/health
curl http://localhost:3000/rest/v1/fundaciones

# Deberías ver respuesta JSON con watches transformados
```

#### 4. Build y Desplegar Frontend

**Opción 4a: Build en K8s (más simple)**

El manifest usa initContainer que hace el build automáticamente:

```bash
# Ya está incluido en frontend-adapter.yaml
# Solo verifica que funcione:
kubectl -n convoca-frontend logs -l app=frontend -c build --tail=100
```

**Opción 4b: Build local y push a registry (producción)**

```bash
# 1. Build imagen Docker
docker build -f Dockerfile.frontend -t convoca-frontend:latest .

# 2. Tag para tu registry
docker tag convoca-frontend:latest <TU_REGISTRY>/convoca-frontend:latest

# 3. Push
docker push <TU_REGISTRY>/convoca-frontend:latest

# 4. Actualizar manifest para usar tu imagen
vim k8s/frontend-adapter.yaml
# Cambiar línea del container 'nginx' para usar tu imagen en vez de node+build

# 5. Re-aplicar
kubectl apply -f k8s/frontend-adapter.yaml
```

#### 5. Acceder al Frontend

```bash
# Port-forward temporal
kubectl -n convoca-frontend port-forward svc/frontend 8080:80

# Abrir navegador
open http://localhost:8080

# O configurar DNS e Ingress para:
# https://convoca-app.TUDOMINIO.com
```

---

### Opción B: Desarrollo Local con Adapter en K8s

Si quieres desarrollar frontend localmente pero usar el adapter en K8s:

```bash
# 1. Desplegar solo el adapter
kubectl apply -f k8s/frontend-adapter.yaml

# 2. Port-forward del adapter
kubectl -n convoca-frontend port-forward svc/frontend-adapter 3000:3000

# 3. Actualizar .env local
cat > .env <<EOF
VITE_SUPABASE_URL=http://localhost:3000
VITE_SUPABASE_PUBLISHABLE_KEY=dummy-key
EOF

# 4. Correr frontend en dev
npm run dev

# 5. Abrir http://localhost:5173
```

---

## Mapeo de API: Original → Adapter → changedetection.io

### Login

**Frontend hace:**
```http
POST /rest/v1/rpc/login_admin
Content-Type: application/json

{
  "username": "admin",
  "password": "admin123"
}
```

**Adapter responde:**
```json
{
  "data": {
    "id": "admin-user-id",
    "username": "admin",
    "created_at": "2025-10-20T..."
  },
  "error": null
}
```

**Adapter NO llama a changedetection.io** (auth local con bcrypt)

---

### Listar Fundaciones

**Frontend hace:**
```http
GET /rest/v1/fundaciones
```

**Adapter traduce:**
1. Llama: `GET http://changedetection/api/v1/watch`
2. Filtra watches con tag `fundacion`
3. Transforma estructura:

```javascript
// changedetection.io watch:
{
  "uuid-123": {
    "title": "Fundación BBVA",
    "url": "https://fbbva.es/convocatorias",
    "tags": ["fundacion", "Financiera"],
    "last_checked": "2025-10-20T14:00:00Z",
    "last_check_status": {
      "status": "changed",
      "hash": "abc123..."
    }
  }
}

// Se convierte a:
{
  "id": "uuid-123",
  "name": "Fundación BBVA",
  "url": "https://fbbva.es/convocatorias",
  "category": "Financiera",
  "last_hash": "abc123...",
  "status": "updated",
  "last_checked": "2025-10-20T14:00:00Z",
  "enabled": 1,
  "created_at": "2025-10-20T...",
  "updated_at": "2025-10-20T..."
}
```

---

### Historial de Cambios

**Frontend hace:**
```http
GET /rest/v1/change_history
```

**Adapter traduce:**
1. Llama: `GET http://changedetection/api/v1/watch`
2. Extrae historial de cada watch
3. Transforma a formato `change_history`:

```javascript
// changedetection.io history:
{
  "uuid-123": {
    "history": [
      {
        "date": "2025-10-20T14:00:00Z",
        "previous_hash": "old123",
        "current_hash": "new456"
      }
    ]
  }
}

// Se convierte a:
{
  "id": "uuid-123-0",
  "fundacion_id": "uuid-123",
  "change_type": "content_change",
  "old_value": "old123",
  "new_value": "new456",
  "detected_at": "2025-10-20T14:00:00Z",
  "status": "unreviewed",
  "priority": "normal",
  "source_type": "fundacion",
  "source_name": "Fundación BBVA",
  "url": "https://fbbva.es/convocatorias",
  "reviewed": 0
}
```

---

## Variables de Entorno

### Frontend (.env)

```bash
# Producción (apunta al adapter en K8s)
VITE_SUPABASE_URL=http://frontend-adapter.convoca-frontend.svc.cluster.local:3000
VITE_SUPABASE_PUBLISHABLE_KEY=dummy-key

# O con Ingress:
VITE_SUPABASE_URL=https://api.convoca-app.TUDOMINIO.com
VITE_SUPABASE_PUBLISHABLE_KEY=dummy-key

# Desarrollo local (port-forward del adapter)
VITE_SUPABASE_URL=http://localhost:3000
VITE_SUPABASE_PUBLISHABLE_KEY=dummy-key
```

### Adapter (ConfigMap en K8s)

```yaml
CDIO_API_URL: "http://changedetection.changedetection.svc.cluster.local"
CDIO_API_KEY: "convoca-spotter-api-key-2025"
PORT: "3000"
NODE_ENV: "production"
```

---

## Testing

### 1. Probar Adapter Aislado

```bash
# Port-forward
kubectl -n convoca-frontend port-forward svc/frontend-adapter 3000:3000

# Test health
curl http://localhost:3000/api/health

# Test login
curl -X POST http://localhost:3000/rest/v1/rpc/login_admin \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}'

# Test fundaciones
curl http://localhost:3000/rest/v1/fundaciones

# Test entes
curl http://localhost:3000/rest/v1/entes_publicos

# Test otras fuentes
curl http://localhost:3000/rest/v1/otras_fuentes

# Test change history
curl http://localhost:3000/rest/v1/change_history
```

### 2. Probar Frontend Completo

```bash
# Port-forward del frontend
kubectl -n convoca-frontend port-forward svc/frontend 8080:80

# Abrir en navegador
open http://localhost:8080

# Login con admin/admin123
# Verificar que se ven las fundaciones/entes/fuentes
# Verificar que el historial de cambios carga
```

### 3. Probar Monitoreo

```bash
# Trigger check manual desde el adapter
curl -X POST http://localhost:3000/api/monitor/all

# Debe retornar:
{
  "success": true,
  "results": {
    "checked": 45,
    "changes": 0,
    "errors": 0
  }
}
```

---

## Troubleshooting

### Problema: Adapter no puede conectar con changedetection.io

```bash
# Verificar conectividad
kubectl -n convoca-frontend run test --rm -it --image=curlimages/curl -- \
  curl -v http://changedetection.changedetection.svc.cluster.local/api/v1/watch

# Verificar API key
kubectl -n convoca-frontend get configmap adapter-config -o yaml
```

**Solución:**
```bash
# Verificar que changedetection namespace existe
kubectl get namespace changedetection

# Verificar service
kubectl -n changedetection get svc changedetection

# Si API key es incorrecta, actualizar ConfigMap:
kubectl -n convoca-frontend edit configmap adapter-config
```

### Problema: Frontend build falla en initContainer

```bash
# Ver logs del build
kubectl -n convoca-frontend logs -l app=frontend -c build

# Causas comunes:
# - npm install falla (problemas de red)
# - vite build falla (error en código)
```

**Solución:**
```bash
# Build localmente primero para verificar
npm install
npm run build

# Si funciona local, el problema es el initContainer
# Opción: usar Dockerfile.frontend en vez de initContainer
```

### Problema: Login falla "Invalid credentials"

El adapter tiene hardcoded `admin/admin123`. Para cambiar:

```bash
# Editar ConfigMap del adapter
kubectl -n convoca-frontend edit configmap adapter-code

# Buscar línea con bcrypt.hashSync('admin123', 10)
# Cambiar contraseña

# Reiniciar pods del adapter
kubectl -n convoca-frontend rollout restart deployment/frontend-adapter
```

### Problema: No se ven fundaciones/entes

```bash
# Verificar que los watches existen en changedetection.io
kubectl -n changedetection exec deploy/changedetection -- ls /datastore/*.txt | wc -l

# Debería retornar 45

# Verificar tags de los watches
# En UI de changedetection.io, asegúrate que tienen tags:
# - "fundacion" para fundaciones
# - "ente_publico" para entes
# - "otra_fuente" para otras fuentes
```

**Solución:**
Si los watches no tienen tags, re-ejecuta el migration script:
```bash
cd migration
npm run migrate
```

---

## Actualizar Frontend

### Cambios en el Código React

```bash
# 1. Hacer cambios en src/
vim src/pages/AdminDashboard.tsx

# 2. Build localmente
npm run build

# 3. Rebuild imagen Docker
docker build -f Dockerfile.frontend -t convoca-frontend:v2 .

# 4. Push a registry
docker push <REGISTRY>/convoca-frontend:v2

# 5. Actualizar deployment
kubectl -n convoca-frontend set image deployment/frontend nginx=<REGISTRY>/convoca-frontend:v2

# 6. Ver progreso del rollout
kubectl -n convoca-frontend rollout status deployment/frontend
```

### Cambios en el Adapter

```bash
# 1. Editar ConfigMap
kubectl -n convoca-frontend edit configmap adapter-code

# 2. Reiniciar pods para aplicar cambios
kubectl -n convoca-frontend rollout restart deployment/frontend-adapter

# 3. Ver logs
kubectl -n convoca-frontend logs -f -l app=frontend-adapter
```

---

## Rollback

Si algo falla, puedes volver al sistema anterior:

### Opción 1: Eliminar namespace completo

```bash
kubectl delete namespace convoca-frontend
```

### Opción 2: Cambiar .env del frontend para apuntar al backend original

```bash
# En tu servidor original
systemctl start convoca-spotter

# En tu máquina local de desarrollo
cat > .env <<EOF
VITE_SUPABASE_URL=http://192.168.255.117:3000
VITE_SUPABASE_PUBLISHABLE_KEY=local-key
EOF

npm run dev
```

---

## Mejoras Futuras

### 1. Persistir usuarios del adapter

Actualmente están hardcoded. Para persistencia:

```bash
# Añadir PostgreSQL o usar SQLite en PVC
# Actualizar adapter-code ConfigMap para conectar a DB
```

### 2. Cache de watches

Para reducir latencia:

```javascript
// En adapter server.js, añadir:
const cache = new Map();
const CACHE_TTL = 60000; // 1 minuto

app.get('/rest/v1/fundaciones', async (req, res) => {
  const cached = cache.get('fundaciones');
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return res.json(cached.data);
  }

  // ... fetch from changedetection.io ...

  cache.set('fundaciones', { data: fundaciones, timestamp: Date.now() });
  res.json(fundaciones);
});
```

### 3. Autenticación real

Integrar OAuth2 o JWT:

```yaml
# Usar oauth2-proxy en Ingress
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  annotations:
    nginx.ingress.kubernetes.io/auth-url: "https://oauth2-proxy.example.com/oauth2/auth"
    nginx.ingress.kubernetes.io/auth-signin: "https://oauth2-proxy.example.com/oauth2/start"
```

---

## Resumen

✅ **Frontend sin cambios** - Tu código React funciona tal cual
✅ **Adapter traduce APIs** - Mantiene compatibilidad con backend original
✅ **Desplegado en K8s** - Escalable y con alta disponibilidad
✅ **Fácil de actualizar** - Rolling updates sin downtime
✅ **Rollback simple** - Volver atrás en segundos

**Próximo paso:** Desplegar con `kubectl apply -f k8s/frontend-adapter.yaml`

---

**Versión:** 1.0.0
**Fecha:** Octubre 2025
**Compatibilidad:** React 18 + Vite + changedetection.io

# 🚧 Modo Mantenimiento - Guía de Uso

## Cambios Realizados

He puesto el frontend en **modo mantenimiento** con una pantalla profesional que:

✅ Muestra mensaje de "Sistema en Mantenimiento"
✅ Explica las mejoras en proceso (migración a K8s, changedetection.io, Ollama, etc.)
✅ Tiempo estimado y contacto
✅ Diseño moderno con gradientes y animaciones
✅ Detalles técnicos colapsables
✅ Responsive (móvil y desktop)

---

## Archivos Modificados

### 1. **`src/pages/Maintenance.tsx`** (NUEVO)
Página de mantenimiento con diseño profesional.

### 2. **`src/App.tsx`** (MODIFICADO)
Añadida lógica para activar/desactivar modo mantenimiento:
```typescript
const MAINTENANCE_MODE = import.meta.env.VITE_MAINTENANCE_MODE === 'true' || true;
```

### 3. **`.env`** (MODIFICADO)
Añadida variable de entorno:
```bash
VITE_MAINTENANCE_MODE="true"
```

---

## Cómo Activar/Desactivar Mantenimiento

### Opción 1: Variable de Entorno (Recomendado)

**Activar mantenimiento:**
```bash
# Editar .env
echo 'VITE_MAINTENANCE_MODE="true"' >> .env

# Rebuild
npm run build
```

**Desactivar mantenimiento:**
```bash
# Editar .env
sed -i 's/VITE_MAINTENANCE_MODE="true"/VITE_MAINTENANCE_MODE="false"/' .env

# Rebuild
npm run build
```

### Opción 2: Editar Código Directamente

```bash
# Editar src/App.tsx línea 25
vim src/App.tsx

# Cambiar:
const MAINTENANCE_MODE = import.meta.env.VITE_MAINTENANCE_MODE === 'true' || true;

# Por:
const MAINTENANCE_MODE = false;

# Rebuild
npm run build
```

### Opción 3: Variable de Entorno en Build Time (K8s)

En el `Dockerfile.frontend`:

```dockerfile
# Activar mantenimiento
ARG VITE_MAINTENANCE_MODE=true
ENV VITE_MAINTENANCE_MODE=$VITE_MAINTENANCE_MODE

# Build
RUN npm run build
```

O en `k8s/frontend-adapter.yaml` (initContainer):

```bash
VITE_MAINTENANCE_MODE=false npm run build
```

---

## Desarrollo Local

### Ver página de mantenimiento

```bash
# 1. Asegurar que VITE_MAINTENANCE_MODE="true" en .env
cat .env | grep MAINTENANCE

# 2. Correr en dev
npm run dev

# 3. Abrir http://localhost:5173
# Verás la página de mantenimiento
```

### Trabajar en la app con mantenimiento desactivado

```bash
# Opción A: Cambiar .env temporalmente
export VITE_MAINTENANCE_MODE="false"
npm run dev

# Opción B: Comentar línea en App.tsx
# const MAINTENANCE_MODE = false; // Force disable
```

---

## Despliegue en Kubernetes

### Build con Mantenimiento Activado

```bash
# Build imagen Docker
docker build -f Dockerfile.frontend \
  --build-arg VITE_MAINTENANCE_MODE=true \
  -t convoca-frontend:maintenance .

# Push
docker push <REGISTRY>/convoca-frontend:maintenance

# Deploy
kubectl -n convoca-frontend set image deployment/frontend \
  nginx=<REGISTRY>/convoca-frontend:maintenance
```

### Build con Mantenimiento Desactivado

```bash
# Build imagen Docker
docker build -f Dockerfile.frontend \
  --build-arg VITE_MAINTENANCE_MODE=false \
  -t convoca-frontend:production .

# Push
docker push <REGISTRY>/convoca-frontend:production

# Deploy
kubectl -n convoca-frontend set image deployment/frontend \
  nginx=<REGISTRY>/convoca-frontend:production
```

### Actualizar ConfigMap (si usas initContainer)

```bash
# Editar frontend-adapter.yaml
vim k8s/frontend-adapter.yaml

# En el initContainer, cambiar:
VITE_MAINTENANCE_MODE=false \
npm run build

# Re-aplicar
kubectl apply -f k8s/frontend-adapter.yaml

# Reiniciar pods
kubectl -n convoca-frontend rollout restart deployment/frontend
```

---

## Vista Previa

### Pantalla de Mantenimiento

La página muestra:

1. **Icono animado** con efecto glow
2. **Título grande:** "Sistema en Mantenimiento"
3. **Subtítulo:** Explicación breve
4. **Tiempo estimado:** "Estará disponible pronto"
5. **Mejoras en proceso:**
   - Migración a Kubernetes
   - Integración changedetection.io
   - Análisis de IA con Ollama
   - Pool escalable de navegadores
6. **Contacto:** Información para acceso urgente
7. **Detalles técnicos:** Expandible con arquitectura antes/después

### Diseño

- 🎨 **Gradiente oscuro** (slate-900 → slate-800)
- 🔵 **Cards con glassmorphism** (backdrop-blur)
- 🟡 **Colores de acento** (yellow-400, orange-500)
- ✨ **Animaciones sutiles** (pulse en icono)
- 📱 **Responsive** (mobile-first)

---

## Personalizar Mensaje

### Cambiar texto

Editar `src/pages/Maintenance.tsx`:

```tsx
// Línea 15: Título
<h1>Tu Mensaje Personalizado</h1>

// Línea 19: Subtítulo
<p>Descripción personalizada</p>

// Línea 34: Tiempo estimado
<p>Volveremos en 2 horas</p>

// Líneas 44-66: Mejoras en proceso
<li>Tu mejora custom</li>
```

### Cambiar colores

```tsx
// Cambiar amarillo/naranja por azul/verde
className="from-yellow-400 to-orange-500"
// Por:
className="from-blue-400 to-green-500"
```

### Añadir countdown

```tsx
import { useState, useEffect } from "react";

const Maintenance = () => {
  const [timeLeft, setTimeLeft] = useState(7200); // 2 horas en segundos

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(prev => prev > 0 ? prev - 1 : 0);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const hours = Math.floor(timeLeft / 3600);
  const minutes = Math.floor((timeLeft % 3600) / 60);

  return (
    // ... resto del componente
    <p>Tiempo restante: {hours}h {minutes}m</p>
  );
};
```

---

## Testing

### Test en desarrollo

```bash
# Con mantenimiento
VITE_MAINTENANCE_MODE=true npm run dev

# Sin mantenimiento
VITE_MAINTENANCE_MODE=false npm run dev
```

### Test del build

```bash
# Build con mantenimiento
VITE_MAINTENANCE_MODE=true npm run build

# Preview
npm run preview

# Abrir http://localhost:4173
```

### Test en K8s

```bash
# Port-forward
kubectl -n convoca-frontend port-forward svc/frontend 8081:80

# Abrir http://localhost:8081
# Deberías ver la página de mantenimiento
```

---

## Rollback

Si algo falla, puedes volver rápido:

### En desarrollo

```bash
# Cambiar .env
VITE_MAINTENANCE_MODE="false"

# O comentar en App.tsx
const MAINTENANCE_MODE = false;

# Rebuild
npm run build
```

### En K8s

```bash
# Opción 1: Rollback del deployment
kubectl -n convoca-frontend rollout undo deployment/frontend

# Opción 2: Actualizar imagen a versión anterior
kubectl -n convoca-frontend set image deployment/frontend \
  nginx=<REGISTRY>/convoca-frontend:previous-version
```

---

## Próximos Pasos

### Durante el mantenimiento

1. ✅ Frontend muestra página de mantenimiento
2. 🔄 Migra backend a changedetection.io
3. 🔄 Despliega stack en K8s
4. 🔄 Configura webhooks y Ollama
5. 🧪 Testing exhaustivo

### Después del mantenimiento

1. Cambiar `VITE_MAINTENANCE_MODE="false"`
2. Rebuild frontend
3. Desplegar nueva versión
4. Verificar que todo funciona
5. Comunicar a usuarios

---

## Checklist de Despliegue

Antes de activar mantenimiento en producción:

- [ ] Página de mantenimiento funciona en dev
- [ ] Mensaje personalizado con info correcta
- [ ] Build funciona con VITE_MAINTENANCE_MODE=true
- [ ] Preview en local OK
- [ ] Imagen Docker buildea correctamente
- [ ] Comunicado a usuarios sobre horario
- [ ] Plan de rollback documentado
- [ ] Estimación de tiempo realista

Después de completar migración:

- [ ] changedetection.io funcionando
- [ ] Watches migrados (45 fuentes)
- [ ] Webhooks configurados
- [ ] Frontend adapter desplegado
- [ ] API funcionando correctamente
- [ ] Testing completo realizado
- [ ] VITE_MAINTENANCE_MODE=false
- [ ] Nueva versión desplegada
- [ ] Verificación final OK
- [ ] Comunicado de finalización

---

## FAQ

**P: ¿Puedo ver la app sin desactivar mantenimiento?**
R: Sí, cambia temporalmente la línea 25 de `App.tsx` a `const MAINTENANCE_MODE = false;` en tu entorno local.

**P: ¿Afecta al backend?**
R: No, solo es frontend. El backend sigue funcionando normalmente.

**P: ¿Puedo añadir excepciones (ej: admins pueden acceder)?**
R: Sí, modifica `App.tsx`:
```tsx
const MAINTENANCE_MODE = !isAdmin && (import.meta.env.VITE_MAINTENANCE_MODE === 'true' || true);
```

**P: ¿Cómo programar activación automática?**
R: Usa un cronjob que actualice el ConfigMap de K8s y haga rollout restart.

---

## Soporte

Si tienes problemas:

1. Verifica que la variable de entorno esté correcta: `echo $VITE_MAINTENANCE_MODE`
2. Revisa que el build incluya la variable: `grep MAINTENANCE dist/assets/*.js`
3. Comprueba logs del frontend: `kubectl -n convoca-frontend logs -f deploy/frontend`

---

**Versión:** 1.0.0
**Fecha:** Octubre 2025
**Modo actual:** ✅ MANTENIMIENTO ACTIVADO

# Kubernetes Manifests para Convoca-Spotter

Manifiestos K8s para migración a changedetection.io con escalabilidad automática.

## 📁 Archivos

### `changedetection.yaml`
Deployment completo de changedetection.io:
- **Namespace:** `changedetection`
- **Componentes:**
  - changedetection.io controller (1 replica, stateful con PVC 50Gi)
  - Browserless/Playwright pool (3-30 replicas, HPA habilitado)
  - Ingress NGINX con TLS
  - NetworkPolicy para seguridad
  - CronJob para backups automáticos

**Personalizar antes de aplicar:**
- Línea 69: `BASE_URL` (tu dominio)
- Línea 113: `storageClassName` (según tu cloud)
- Líneas 380-394: Ingress host (tu dominio)

### `ollama-webhook-processor.yaml`
Servicio Node.js que recibe webhooks de changedetection.io y los analiza con Ollama:
- **Namespace:** `convoca-ollama`
- **Componentes:**
  - Webhook processor (2-10 replicas, HPA habilitado)
  - ConfigMap con código del procesador
  - Ingress opcional para webhooks externos

**Personalizar antes de aplicar:**
- Línea 19: `OLLAMA_URL` (tu servidor Ollama)
- Línea 20: `OLLAMA_MODEL` (verificar que existe en Ollama)

## 🚀 Despliegue Rápido

```bash
# 1. Personalizar configuración
vim changedetection.yaml  # Cambiar dominio y storage
vim ollama-webhook-processor.yaml  # Cambiar URL de Ollama

# 2. Aplicar manifiestos
kubectl apply -f changedetection.yaml
kubectl apply -f ollama-webhook-processor.yaml

# 3. Verificar despliegue
kubectl -n changedetection get pods
kubectl -n convoca-ollama get pods

# 4. Acceder a la UI (port-forward temporal)
kubectl -n changedetection port-forward svc/changedetection 5000:80
# Abrir: http://localhost:5000
```

## 📊 Arquitectura

```
┌──────────────────────────────────────┐
│     changedetection namespace        │
│                                      │
│  ┌────────────────┐  ┌────────────┐ │
│  │ changedetection│  │ Browserless│ │
│  │  (controller)  │◄─┤   Pool     │ │
│  │   + PVC 50Gi   │  │  (3-30x)   │ │
│  └────────┬───────┘  └────────────┘ │
│           │                          │
└───────────┼──────────────────────────┘
            │ Webhooks
┌───────────▼──────────────────────────┐
│    convoca-ollama namespace          │
│                                      │
│  ┌────────────────────┐              │
│  │ Webhook Processor  │───► Ollama  │
│  │   (Node.js 2-10x)  │    (extern) │
│  └────────────────────┘              │
└──────────────────────────────────────┘
```

## 🔧 Configuración Avanzada

### Ajustar Recursos

**Browserless Pool:**
```yaml
# En changedetection.yaml líneas 280-285
resources:
  requests:
    cpu: "1000m"    # ← Ajustar
    memory: "2Gi"   # ← Ajustar
  limits:
    cpu: "3000m"    # ← Ajustar
    memory: "6Gi"   # ← Ajustar
```

**HPA del Pool:**
```yaml
# Líneas 350-365
minReplicas: 3      # ← Mínimo de pods
maxReplicas: 30     # ← Máximo de pods
averageUtilization: 70  # ← % CPU para escalar
```

### Cambiar Frecuencia de Checks

Después de aplicar manifiestos y migrar watches:

```bash
# Via API (requiere script)
curl -X POST "http://<CDIO_URL>/api/v1/watch/<UUID>" \
  -H "x-api-key: convoca-spotter-api-key-2025" \
  -H "Content-Type: application/json" \
  -d '{"time_between_check": {"hours": 6}}'

# O via UI:
# Settings → cada watch → Time between checks
```

### Añadir Notificaciones

**Opción 1: Email**
```yaml
# En changedetection.yaml, añadir a Secret:
SMTP_HOST: "smtp.gmail.com"
SMTP_PORT: "587"
SMTP_USER: "tu@email.com"
SMTP_PASS: "tu-password"
```

**Opción 2: Slack/Discord**
Configurar en UI de changedetection.io:
- Settings → Notifications
- Añadir webhook URL de Slack/Discord

### Backups Automáticos

El CronJob de backup está incluido pero deshabilitado por defecto.

Para habilitarlo:
```bash
# Crear PVC para backups (ya incluido en yaml)
kubectl -n changedetection get pvc cdio-backups

# Verificar CronJob
kubectl -n changedetection get cronjob cdio-backup

# Ejecutar manualmente
kubectl -n changedetection create job --from=cronjob/cdio-backup manual-backup-$(date +%s)
```

## 📝 Post-Despliegue

### 1. Migrar Watches

```bash
cd ../migration
npm install

export CDIO_API_URL="http://changedetection.changedetection.svc.cluster.local"
export CDIO_API_KEY="convoca-spotter-api-key-2025"

# Dry-run primero
npm run dry-run

# Migración real
npm run migrate
```

### 2. Configurar Webhooks

Via UI:
1. Accede a changedetection.io
2. Settings → Notifications
3. Añade webhook URL:
   ```
   http://ollama-webhook-processor.convoca-ollama.svc.cluster.local/webhook
   ```

### 3. Verificar Escalado

```bash
# Ver métricas de HPA
kubectl -n changedetection get hpa -w

# Generar carga (forzar checks)
# En UI: Select All → Actions → Check Now

# Ver escalado en tiempo real
watch -n 2 'kubectl -n changedetection get pods -l app=browserless'
```

## 🔍 Monitoreo

### Logs en Tiempo Real

```bash
# changedetection
kubectl -n changedetection logs -f deploy/changedetection

# Browserless pool
kubectl -n changedetection logs -f -l app=browserless --tail=50

# Webhook processor
kubectl -n convoca-ollama logs -f deploy/ollama-webhook-processor
```

### Métricas

```bash
# CPU/Memory por pod
kubectl -n changedetection top pods
kubectl -n convoca-ollama top pods

# Estado de HPA
kubectl -n changedetection describe hpa hpa-browserless

# Eventos del cluster
kubectl -n changedetection get events --sort-by='.lastTimestamp'
```

### Dashboard (opcional)

```bash
# Instalar Kubernetes Dashboard
kubectl apply -f https://raw.githubusercontent.com/kubernetes/dashboard/v2.7.0/aio/deploy/recommended.yaml

# Crear ServiceAccount con permisos
kubectl create serviceaccount dashboard-admin -n changedetection
kubectl create clusterrolebinding dashboard-admin --clusterrole=cluster-admin --serviceaccount=changedetection:dashboard-admin

# Obtener token
kubectl -n changedetection create token dashboard-admin

# Port-forward
kubectl -n kubernetes-dashboard port-forward svc/kubernetes-dashboard 8443:443
# Acceder: https://localhost:8443
```

## 🐛 Troubleshooting Común

### Pods crasheando

```bash
# Ver logs del pod que crashea
kubectl -n changedetection logs <POD_NAME> --previous

# Ver eventos
kubectl -n changedetection describe pod <POD_NAME>
```

### PVC no se crea

```bash
# Verificar storageClass
kubectl get storageclass

# Ver estado del PVC
kubectl -n changedetection describe pvc cdio-datastore

# Si está Pending, el storageClassName es incorrecto
# Editar y cambiar:
kubectl -n changedetection edit pvc cdio-datastore
```

### Ingress no funciona

```bash
# Verificar Ingress Controller
kubectl -n ingress-nginx get pods

# Ver configuración del Ingress
kubectl -n changedetection describe ingress cdio-ingress

# Logs del controller
kubectl -n ingress-nginx logs -f deploy/ingress-nginx-controller
```

## 🔐 Seguridad

### Rotar Secrets

```bash
# Generar nueva API key
NEW_KEY=$(openssl rand -hex 32)

# Actualizar secret
kubectl -n changedetection create secret generic cdio-secrets \
  --from-literal=CDIO_API_KEY="$NEW_KEY" \
  --dry-run=client -o yaml | kubectl apply -f -

# Reiniciar pods para aplicar
kubectl -n changedetection rollout restart deployment/changedetection
kubectl -n convoca-ollama rollout restart deployment/ollama-webhook-processor
```

### NetworkPolicy estricta

Los manifiestos incluyen NetworkPolicy básica. Para mayor seguridad:

```bash
# Denegar todo por defecto
kubectl -n changedetection apply -f - <<EOF
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: default-deny-all
spec:
  podSelector: {}
  policyTypes:
  - Ingress
  - Egress
EOF

# Luego añadir reglas específicas (ya incluidas en changedetection.yaml)
```

## 📚 Referencias

- [changedetection.io Wiki](https://github.com/dgtlmoon/changedetection.io/wiki)
- [Browserless Docs](https://docs.browserless.io/)
- [Kubernetes HPA](https://kubernetes.io/docs/tasks/run-application/horizontal-pod-autoscale/)
- [NGINX Ingress](https://kubernetes.github.io/ingress-nginx/)

## 🆘 Ayuda

Para soporte, revisa:
1. `../MIGRATION-GUIDE.md` - Guía completa paso a paso
2. Logs: `kubectl logs` en los namespaces
3. Eventos: `kubectl get events` en los namespaces
4. Documentación oficial de changedetection.io

---

**Versión:** 1.0.0
**Fecha:** Octubre 2025
**Compatibilidad:** Kubernetes 1.24+

# 🚀 Guía de Migración: Convoca-Spotter → changedetection.io en K8s

Esta guía describe el proceso completo para migrar tu sistema actual de Convoca-Spotter a una arquitectura escalable basada en changedetection.io desplegada en Kubernetes.

## 📋 Tabla de Contenidos

1. [Prerequisitos](#prerequisitos)
2. [Arquitectura de la Solución](#arquitectura-de-la-solución)
3. [Pasos de Migración](#pasos-de-migración)
4. [Configuración de Ollama](#configuración-de-ollama)
5. [Verificación y Testing](#verificación-y-testing)
6. [Troubleshooting](#troubleshooting)

---

## Prerequisitos

### Cluster Kubernetes

- Kubernetes 1.24+
- Ingress Controller instalado (NGINX recomendado)
- StorageClass configurado
- cert-manager (opcional, para TLS)
- Metrics Server (para HPA)

```bash
# Verificar versión de K8s
kubectl version --short

# Verificar Ingress Controller
kubectl get pods -n ingress-nginx

# Verificar StorageClass
kubectl get storageclass
```

### Herramientas Locales

```bash
# Instalar kubectl
curl -LO "https://dl.k8s.io/release/$(curl -L -s https://dl.k8s.io/release/stable.txt)/bin/linux/amd64/kubectl"

# Instalar node (para migration script)
node --version  # Necesitas Node 20+

# Configurar kubeconfig
export KUBECONFIG=/path/to/your/kubeconfig.yaml
```

### Ollama

Tu servidor Ollama debe ser accesible desde el cluster K8s:
- URL: `http://192.168.255.121:11434` (o la que tengas)
- Modelo instalado: `llama3.1:latest` (no `ollama3.1:latest`)

```bash
# Verificar modelos disponibles
curl -s http://192.168.255.121:11434/api/tags | jq '.models[].name'
```

---

## Arquitectura de la Solución

### Componentes

```
┌─────────────────────────────────────────────────────────────┐
│                      KUBERNETES CLUSTER                      │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌─────────────────────────────────────────────────────┐    │
│  │  Namespace: changedetection                         │    │
│  │                                                      │    │
│  │  ┌──────────────────┐      ┌──────────────────┐    │    │
│  │  │ changedetection  │◄────►│  Browserless     │    │    │
│  │  │   (controller)   │      │  Playwright Pool │    │    │
│  │  │   1 replica      │      │  3-30 replicas   │    │    │
│  │  │   + PVC 50Gi     │      │  (HPA enabled)   │    │    │
│  │  └────────┬─────────┘      └──────────────────┘    │    │
│  │           │                                          │    │
│  │           │ Webhooks                                 │    │
│  │           ▼                                          │    │
│  └───────────┼──────────────────────────────────────────┘    │
│              │                                                │
│  ┌───────────┼──────────────────────────────────────────┐    │
│  │  Namespace: convoca-ollama                           │    │
│  │           │                                           │    │
│  │  ┌────────▼────────────┐                             │    │
│  │  │  Webhook Processor  │                             │    │
│  │  │  (Node.js service)  │───► Ollama API              │    │
│  │  │  2-10 replicas      │     (external)              │    │
│  │  └─────────────────────┘                             │    │
│  └──────────────────────────────────────────────────────┘    │
│                                                               │
│  ┌──────────────────────────────────────────────────────┐    │
│  │  Ingress (NGINX)                                     │    │
│  │  https://convoca.yourdomain.com → changedetection   │    │
│  │  https://webhooks.convoca.yourdomain.com → webhook  │    │
│  └──────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────┘
```

### Flujo de Datos

1. **changedetection.io** monitorea 45+ fuentes cada 2 horas
2. Cuando detecta cambios, envía **webhook** al procesador
3. El **webhook processor** analiza con **Ollama** (llama3.1)
4. Resultados se loggean (o guardan en DB si configuras)

---

## Pasos de Migración

### 1. Personalizar Configuración

Edita los archivos con tus valores:

**`k8s/changedetection.yaml`:**
```yaml
# Línea 69: Cambiar dominio
BASE_URL: "https://convoca.TUDOMINIO.com"

# Línea 113: Cambiar storageClassName (según tu cloud)
# storageClassName: standard  # GKE
# storageClassName: managed-premium  # AKS
# storageClassName: gp3  # EKS

# Línea 380: Cambiar dominio en Ingress
host: convoca.TUDOMINIO.com
```

**`k8s/ollama-webhook-processor.yaml`:**
```yaml
# Línea 19: Configurar URL de Ollama
OLLAMA_URL: "http://TU_IP_OLLAMA:11434"

# Línea 20: Verificar modelo correcto
OLLAMA_MODEL: "llama3.1:latest"
```

### 2. Desplegar en Kubernetes

```bash
cd /home/dionisio/convoca-spotter

# Crear namespaces y recursos
kubectl apply -f k8s/changedetection.yaml

# Verificar que los pods estén corriendo
kubectl -n changedetection get pods

# Esperar a que estén Ready (puede tardar 2-3 minutos)
kubectl -n changedetection wait --for=condition=ready pod -l app=changedetection --timeout=300s
kubectl -n changedetection wait --for=condition=ready pod -l app=browserless --timeout=300s

# Desplegar procesador de webhooks
kubectl apply -f k8s/ollama-webhook-processor.yaml

# Verificar
kubectl -n convoca-ollama get pods
```

### 3. Verificar Conectividad

```bash
# Port-forward para acceder temporalmente
kubectl -n changedetection port-forward svc/changedetection 5000:80

# En otro terminal, verificar acceso
curl http://localhost:5000

# Si funciona, verás la UI de changedetection.io
```

### 4. Migrar Datos (Exportar Watches)

```bash
cd /home/dionisio/convoca-spotter/migration

# Instalar dependencias del script
npm install

# Primero, dry-run para verificar
export CDIO_API_URL="http://localhost:5000"
export CDIO_API_KEY="convoca-spotter-api-key-2025"
node export-to-changedetection.js --dry-run

# Si todo se ve bien, ejecutar la migración real
node export-to-changedetection.js

# Salida esperada:
# ✅ Fundaciones procesadas: 25
# ✅ Entes públicos procesados: 13
# ✅ Otras fuentes procesadas: 7
# 🎉 Migración completada exitosamente!
```

### 5. Configurar Webhooks en changedetection.io

#### Opción A: Via UI

1. Accede a `https://convoca.TUDOMINIO.com` (o port-forward)
2. Ve a **Settings** → **Notifications**
3. Añade webhook URL:
   ```
   http://ollama-webhook-processor.convoca-ollama.svc.cluster.local/webhook
   ```
4. Selecciona todos los watches creados
5. Guarda cambios

#### Opción B: Via API (recomendado para 45+ watches)

```bash
# Script para configurar webhooks en masa
kubectl -n changedetection exec -it deploy/changedetection -- sh -c '
  for uuid in $(ls /datastore/*.txt | xargs -n1 basename | sed "s/.txt//"); do
    echo "Configurando webhook para watch $uuid"
    # API call para actualizar notification_urls
  done
'
```

### 6. Configurar DNS e Ingress

```bash
# Obtener IP del Ingress
kubectl -n changedetection get ingress cdio-ingress

# Añade un registro DNS A:
# convoca.TUDOMINIO.com → <INGRESS_IP>
# webhooks.convoca.TUDOMINIO.com → <INGRESS_IP>

# Si usas cert-manager para TLS:
kubectl get certificate -n changedetection
# Espera a que el certificado esté Ready
```

---

## Configuración de Ollama

### Verificar Modelo Correcto

```bash
# En tu servidor Ollama
curl -s http://192.168.255.121:11434/api/tags | jq '.models[] | select(.name == "llama3.1:latest")'

# Si no existe, descargarlo:
ollama pull llama3.1:latest
```

### Probar Integración Ollama → Webhook Processor

```bash
# Port-forward al webhook processor
kubectl -n convoca-ollama port-forward svc/ollama-webhook-processor 8080:80

# Probar endpoint
curl http://localhost:8080/health

# Simular webhook de changedetection
curl -X POST http://localhost:8080/webhook \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Test Fundación",
    "url": "https://example.com",
    "history_n": "Cambio detectado"
  }'

# Deberías ver análisis de Ollama en logs:
kubectl -n convoca-ollama logs -l app=ollama-processor --tail=50
```

---

## Verificación y Testing

### Check List Post-Despliegue

- [ ] Pods de changedetection corriendo: `kubectl -n changedetection get pods`
- [ ] Pods de browserless escalando: `kubectl -n changedetection get hpa`
- [ ] Pods de webhook processor corriendo: `kubectl -n convoca-ollama get pods`
- [ ] Ingress configurado: `kubectl -n changedetection get ingress`
- [ ] Certificado TLS válido: `kubectl -n changedetection get certificate`
- [ ] Watches migrados: Accede a UI y verifica 45 watches
- [ ] Webhooks configurados: Settings → Notifications en UI
- [ ] Ollama respondiendo: `curl http://<OLLAMA_IP>:11434/api/tags`

### Monitoreo de Logs

```bash
# Logs de changedetection
kubectl -n changedetection logs -f deploy/changedetection

# Logs del pool de Playwright
kubectl -n changedetection logs -f deploy/browserless-playwright

# Logs del webhook processor
kubectl -n convoca-ollama logs -f deploy/ollama-webhook-processor

# Ver estadísticas de HPA
kubectl -n changedetection get hpa -w
```

### Testing de Cambios

```bash
# Forzar check manual de un watch desde la UI:
# 1. Accede a https://convoca.TUDOMINIO.com
# 2. Selecciona un watch
# 3. Click en "Check Now"

# O via API:
curl -X POST "http://<CDIO_URL>/api/v1/watch/<UUID>/recheck" \
  -H "x-api-key: convoca-spotter-api-key-2025"

# Verifica que el webhook se dispare:
kubectl -n convoca-ollama logs -f deploy/ollama-webhook-processor | grep "Webhook recibido"
```

---

## Troubleshooting

### Problema: Pods de changedetection no inician

```bash
# Ver eventos
kubectl -n changedetection describe pod <POD_NAME>

# Causas comunes:
# 1. PVC no se puede crear (storageClassName incorrecto)
kubectl -n changedetection get pvc

# 2. Pull de imagen falla
kubectl -n changedetection describe pod <POD_NAME> | grep -A5 "Events:"
```

**Solución:**
```bash
# Cambiar storageClassName en changedetection.yaml
# Línea 113: storageClassName: <tu-storage-class>
kubectl apply -f k8s/changedetection.yaml
```

### Problema: Browserless no escala

```bash
# Verificar HPA
kubectl -n changedetection get hpa hpa-browserless

# Ver métricas
kubectl -n changedetection top pods

# Si muestra <unknown> en métricas:
# Instalar metrics-server
kubectl apply -f https://github.com/kubernetes-sigs/metrics-server/releases/latest/download/components.yaml
```

### Problema: Webhooks no llegan al processor

```bash
# Verificar service discovery
kubectl -n convoca-ollama get svc

# Probar conectividad interna
kubectl -n changedetection run test --rm -it --image=curlimages/curl -- \
  curl -v http://ollama-webhook-processor.convoca-ollama.svc.cluster.local/health

# Verificar NetworkPolicy no esté bloqueando
kubectl -n changedetection get networkpolicy
```

**Solución:**
```bash
# Añadir egress rule en NetworkPolicy (changedetection.yaml línea 450+)
# Permitir tráfico al namespace convoca-ollama
```

### Problema: Ollama no responde o devuelve "Not Found"

```bash
# Verificar conectividad desde el cluster
kubectl -n convoca-ollama run test --rm -it --image=curlimages/curl -- \
  curl -v http://192.168.255.121:11434/api/tags

# Verificar modelo correcto
curl -s http://192.168.255.121:11434/api/tags | jq '.models[].name'
```

**Solución:**
```bash
# Cambiar modelo en ConfigMap
kubectl -n convoca-ollama edit configmap ollama-config

# Cambiar OLLAMA_MODEL a un modelo que SÍ exista
# Reiniciar pods para aplicar cambio
kubectl -n convoca-ollama rollout restart deployment/ollama-webhook-processor
```

### Problema: Ingress devuelve 502/503

```bash
# Verificar backend service
kubectl -n changedetection get svc changedetection
kubectl -n changedetection get endpoints changedetection

# Verificar pods ready
kubectl -n changedetection get pods -l app=changedetection

# Ver logs del Ingress Controller
kubectl -n ingress-nginx logs -f deploy/ingress-nginx-controller
```

### Problema: Certificate no se emite (cert-manager)

```bash
# Verificar cert-manager
kubectl -n cert-manager get pods

# Ver estado del certificado
kubectl -n changedetection describe certificate cdio-tls

# Ver challenge
kubectl -n changedetection get challenges
```

**Solución:**
```bash
# Verificar que el dominio apunte a la IP del Ingress
dig convoca.TUDOMINIO.com

# Eliminar certificado y recrear
kubectl -n changedetection delete certificate cdio-tls
kubectl apply -f k8s/changedetection.yaml
```

---

## Comandos Útiles

### Escalado Manual

```bash
# Escalar browserless pool
kubectl -n changedetection scale deployment/browserless-playwright --replicas=10

# Escalar webhook processor
kubectl -n convoca-ollama scale deployment/ollama-webhook-processor --replicas=5
```

### Backups

```bash
# Backup manual del datastore
kubectl -n changedetection exec deploy/changedetection -- tar czf /tmp/backup.tar.gz /datastore

kubectl -n changedetection cp changedetection-<POD_ID>:/tmp/backup.tar.gz ./backup-$(date +%Y%m%d).tar.gz
```

### Actualizaciones

```bash
# Actualizar changedetection.io a nueva versión
kubectl -n changedetection set image deployment/changedetection \
  changedetection=dgtlmoon/changedetection.io:0.46.0

# Ver progreso
kubectl -n changedetection rollout status deployment/changedetection
```

### Limpieza Completa

```bash
# CUIDADO: Esto elimina TODO
kubectl delete namespace changedetection
kubectl delete namespace convoca-ollama

# Para empezar de cero
kubectl apply -f k8s/changedetection.yaml
kubectl apply -f k8s/ollama-webhook-processor.yaml
```

---

## Próximos Pasos

1. **Monitoreo avanzado:**
   - Instalar Prometheus + Grafana
   - Crear dashboards para métricas de changedetection y browserless

2. **Almacenamiento de análisis:**
   - Añadir PostgreSQL para guardar resultados de Ollama
   - Crear API para consultar histórico

3. **Notificaciones:**
   - Configurar Slack/Discord/Email en changedetection.io
   - Crear filtros por relevancia (solo ALTA)

4. **Optimizaciones:**
   - Tunear HPA según carga real
   - Configurar PodDisruptionBudget para changedetection
   - Añadir Affinity rules para mejor distribución

5. **Seguridad:**
   - Implementar RBAC en K8s
   - Añadir OAuth2 Proxy en Ingress
   - Rotar secrets periódicamente

---

## Soporte

Para problemas o dudas:

1. Revisa logs: `kubectl -n <namespace> logs -f deploy/<deployment>`
2. Verifica eventos: `kubectl -n <namespace> get events --sort-by='.lastTimestamp'`
3. Revisa documentación oficial:
   - [changedetection.io docs](https://github.com/dgtlmoon/changedetection.io/wiki)
   - [Browserless docs](https://docs.browserless.io/)
   - [Kubernetes docs](https://kubernetes.io/docs/)

---

**¡Buena suerte con la migración! 🚀**
